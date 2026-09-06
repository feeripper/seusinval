package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const defaultEndpoint = "https://api.openai.com/v1/responses"

type Client struct {
	APIKey   string
	Model    string
	Endpoint string
	HTTP     *http.Client
}

func NewClient(apiKey, model string) *Client {
	if model == "" {
		model = "gpt-4.1-mini"
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

type responsesPayload struct {
	Model        string  `json:"model"`
	Instructions string  `json:"instructions,omitempty"`
	Input        []Turn  `json:"input"`
	Temperature  float64 `json:"temperature"`
	MaxOutput    int     `json:"max_output_tokens"`
	Stream       bool    `json:"stream,omitempty"`
}

type responsesBody struct {
	Output []struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"output"`
	OutputText string `json:"output_text"`
}

func (c *Client) Complete(ctx context.Context, req CompletionRequest) (string, error) {
	body, err := c.do(ctx, req, false)
	if err != nil {
		return "", err
	}
	defer body.Close()
	limited := io.LimitReader(body, 1<<20)
	var parsed responsesBody
	if err := json.NewDecoder(limited).Decode(&parsed); err != nil {
		return "", errors.New("resposta inválida do modelo")
	}
	text := extractText(parsed)
	if text == "" {
		return "", errors.New("resposta vazia do modelo")
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
		return err
	}
	if !emitted {
		return errors.New("resposta vazia do modelo")
	}
	return nil
}

func streamDeltas(data string) []string {
	var ev map[string]json.RawMessage
	if json.Unmarshal([]byte(data), &ev) != nil {
		return nil
	}
	typ := jsonString(ev["type"])
	switch typ {
	case "response.output_text.delta", "response.content_part.delta", "response.function_call_arguments.delta":
		if text := jsonStringValue(ev["delta"]); text != "" {
			return []string{text}
		}
		if text := jsonStringValue(ev["text"]); text != "" {
			return []string{text}
		}
	case "response.completed":
		if text := completedText(ev["response"]); text != "" {
			return []string{text}
		}
	}
	return nil
}

func jsonString(raw json.RawMessage) string {
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return s
	}
	return ""
}

func jsonStringValue(raw json.RawMessage) string {
	if text := jsonString(raw); text != "" {
		return text
	}
	var obj struct {
		Text  string `json:"text"`
		Delta string `json:"delta"`
	}
	if json.Unmarshal(raw, &obj) == nil {
		if obj.Text != "" {
			return obj.Text
		}
		return obj.Delta
	}
	return ""
}

func completedText(raw json.RawMessage) string {
	var parsed responsesBody
	if json.Unmarshal(raw, &parsed) != nil {
		return ""
	}
	return extractText(parsed)
}

func (c *Client) do(ctx context.Context, req CompletionRequest, stream bool) (io.ReadCloser, error) {
	if !c.Ready() {
		return nil, errors.New("modelo de IA não configurado")
	}
	payload := responsesPayload{
		Model:        c.Model,
		Instructions: req.Instructions,
		Input:        req.Input,
		Temperature:  0.4,
		MaxOutput:    2200,
		Stream:       stream,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, errors.New("falha ao preparar a solicitação")
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.Endpoint, bytes.NewReader(raw))
	if err != nil {
		return nil, errors.New("configuração inválida")
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.APIKey)
	if stream {
		httpReq.Header.Set("Accept", "text/event-stream")
	}
	res, err := c.HTTP.Do(httpReq)
	if err != nil {
		return nil, errors.New("modelo de IA indisponível")
	}
	if res.StatusCode != http.StatusOK {
		io.Copy(io.Discard, io.LimitReader(res.Body, 4096))
		res.Body.Close()
		return nil, fmt.Errorf("falha ao consultar modelo de IA")
	}
	return res.Body, nil
}

func extractText(parsed responsesBody) string {
	if parsed.OutputText != "" {
		return strings.TrimSpace(parsed.OutputText)
	}
	var b strings.Builder
	for _, item := range parsed.Output {
		for _, c := range item.Content {
			if c.Type == "output_text" || c.Type == "text" {
				b.WriteString(c.Text)
			}
		}
	}
	return strings.TrimSpace(b.String())
}
