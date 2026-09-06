package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const defaultEndpoint = "https://api.openai.com/v1/chat/completions"
const defaultModel = "gpt-4o-mini"

type Client struct {
	APIKey   string
	Model    string
	Endpoint string
	HTTP     *http.Client
}

func NewClient(apiKey, model string) *Client {
	apiKey = sanitizeSecret(apiKey)
	model = sanitizeSecret(model)
	if model == "" {
		model = defaultModel
	}
	return &Client{
		APIKey:   apiKey,
		Model:    model,
		Endpoint: defaultEndpoint,
		HTTP:     &http.Client{Timeout: 40 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
	}
}

func (c *Client) Ready() bool {
	return c != nil && c.APIKey != "" && c.Model != ""
}

type chatPayload struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
	Stream      bool          `json:"stream,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatBody struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *Client) Complete(ctx context.Context, req CompletionRequest) (string, error) {
	body, err := c.do(ctx, req, false)
	if err != nil {
		return "", err
	}
	defer body.Close()
	raw, err := io.ReadAll(io.LimitReader(body, 1<<20))
	if err != nil {
		return "", ErrUnavailable
	}
	var parsed chatBody
	if json.Unmarshal(raw, &parsed) != nil {
		return "", ErrUnavailable
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		return "", mapOpenAIError(0, []byte(parsed.Error.Message))
	}
	text := extractChatText(parsed)
	if text == "" {
		return "", ErrUnavailable
	}
	return text, nil
}

func (c *Client) CompleteStream(ctx context.Context, req CompletionRequest, emit func(delta string) error) error {
	body, err := c.do(ctx, req, true)
	if err != nil {
		return err
	}
	defer body.Close()
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 512*1024)
	var emitted bool
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}
		for _, delta := range streamDeltas(data) {
			emitted = true
			if err := emit(delta); err != nil {
				return err
			}
		}
	}
	if err := scanner.Err(); err != nil {
		if emitted {
			return nil
		}
		return ErrUnavailable
	}
	if !emitted {
		return ErrUnavailable
	}
	return nil
}

func streamDeltas(data string) []string {
	var ev chatBody
	if json.Unmarshal([]byte(data), &ev) != nil || len(ev.Choices) == 0 {
		return nil
	}
	if text := ev.Choices[0].Delta.Content; text != "" {
		return []string{text}
	}
	if text := ev.Choices[0].Message.Content; text != "" {
		return []string{text}
	}
	return nil
}

func (c *Client) do(ctx context.Context, req CompletionRequest, stream bool) (io.ReadCloser, error) {
	if !c.Ready() {
		return nil, ErrNotConfigured
	}
	payload := chatPayload{
		Model:       c.Model,
		Messages:    toMessages(req),
		Temperature: 0.4,
		MaxTokens:   2200,
		Stream:      stream,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, ErrUnavailable
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.Endpoint, bytes.NewReader(raw))
	if err != nil {
		return nil, ErrUnavailable
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.APIKey)
	if stream {
		httpReq.Header.Set("Accept", "text/event-stream")
	}
	res, err := c.HTTP.Do(httpReq)
	if err != nil {
		return nil, ErrUnavailable
	}
	if res.StatusCode != http.StatusOK {
		limited, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		res.Body.Close()
		log.Printf("openai status=%d model=%s", res.StatusCode, c.Model)
		return nil, mapOpenAIError(res.StatusCode, limited)
	}
	return res.Body, nil
}

func toMessages(req CompletionRequest) []chatMessage {
	msgs := make([]chatMessage, 0, len(req.Input)+1)
	if strings.TrimSpace(req.Instructions) != "" {
		msgs = append(msgs, chatMessage{Role: "system", Content: req.Instructions})
	}
	for _, t := range req.Input {
		role := t.Role
		if role != "user" && role != "assistant" && role != "system" {
			role = "user"
		}
		msgs = append(msgs, chatMessage{Role: role, Content: t.Content})
	}
	return msgs
}

func extractChatText(parsed chatBody) string {
	var b strings.Builder
	for _, choice := range parsed.Choices {
		if choice.Message.Content != "" {
			b.WriteString(choice.Message.Content)
			continue
		}
		b.WriteString(choice.Delta.Content)
	}
	return strings.TrimSpace(b.String())
}

func mapOpenAIError(status int, body []byte) error {
	msg := strings.ToLower(string(body))
	switch status {
	case http.StatusUnauthorized, http.StatusForbidden:
		return ErrAuth
	case http.StatusTooManyRequests:
		return ErrQuota
	case http.StatusNotFound:
		return ErrModel
	case http.StatusBadRequest:
		if strings.Contains(msg, "model") {
			return ErrModel
		}
		return ErrUnavailable
	}
	if strings.Contains(msg, "incorrect api key") || strings.Contains(msg, "invalid_api_key") || strings.Contains(msg, "unauthorized") {
		return ErrAuth
	}
	if strings.Contains(msg, "insufficient_quota") || strings.Contains(msg, "rate limit") {
		return ErrQuota
	}
	if strings.Contains(msg, "model") && (strings.Contains(msg, "does not exist") || strings.Contains(msg, "not found")) {
		return ErrModel
	}
	return ErrUnavailable
}

func sanitizeSecret(s string) string {
	s = strings.TrimSpace(s)
	s = strings.Trim(s, "\"'")
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", "")
	return strings.TrimSpace(s)
}
