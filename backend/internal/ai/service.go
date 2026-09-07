package ai

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

var (
	ErrInvalidMessage = errors.New("pergunta inválida; limite de 2000 caracteres")
	ErrUnavailable    = errors.New("modelo de IA indisponível")
	ErrNotConfigured  = errors.New("modelo de IA não configurado")
	ErrRateLimited    = errors.New("limite de requisições atingido; tente novamente em instantes")
	ErrAuth           = errors.New("chave da OpenAI inválida ou sem permissão")
	ErrQuota          = errors.New("cota ou limite da OpenAI esgotado")
	ErrModel          = errors.New("modelo da OpenAI indisponível nesta conta")
)

type IndicatorEvidence struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Domain      string    `json:"domain"`
	UnitArea    string    `json:"unitArea,omitempty"`
	Value       float64   `json:"value"`
	Previous    float64   `json:"previous"`
	Target      float64   `json:"target"`
	Unit        string    `json:"unit"`
	Direction   string    `json:"direction"`
	Owner       string    `json:"owner"`
	Source      string    `json:"source"`
	Action      string    `json:"action"`
	History     []float64 `json:"history"`
	Status      string    `json:"status"`
	UpdatedAt   string    `json:"updatedAt,omitempty"`
	Criticality string    `json:"criticality,omitempty"`
}

type Service struct {
	Completer Completer
	Evidence  []IndicatorEvidence
	mu        sync.Mutex
	sessions  map[string]*Conversation
}

func NewService(c Completer, evidence []IndicatorEvidence) *Service {
	return &Service{Completer: c, Evidence: evidence, sessions: map[string]*Conversation{}}
}

func (s *Service) Ready() bool {
	if s == nil || s.Completer == nil {
		return false
	}
	if c, ok := s.Completer.(*Client); ok {
		return c.Ready()
	}
	return true
}

func ValidateMessage(text string) error {
	text = strings.TrimSpace(text)
	if text == "" || utf8.RuneCountInString(text) > MaxMessageRunes {
		return ErrInvalidMessage
	}
	return nil
}

func (s *Service) Ask(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	text, agent, convID, err := s.prepare(req)
	if err != nil {
		return ChatResponse{}, err
	}
	if !s.Ready() {
		return ChatResponse{}, ErrNotConfigured
	}
	completion, err := s.Completer.Complete(ctx, s.completion(req, text, agent, convID))
	if err != nil {
		return ChatResponse{}, classify(err)
	}
	s.append(convID, text, completion)
	return s.response(convID, agent, completion), nil
}

func (s *Service) AskStream(ctx context.Context, req ChatRequest, emit func(delta string) error) (ChatResponse, error) {
	text, agent, convID, err := s.prepare(req)
	if err != nil {
		return ChatResponse{}, err
	}
	if !s.Ready() {
		return ChatResponse{}, ErrNotConfigured
	}
	comp := s.completion(req, text, agent, convID)
	var b strings.Builder
	err = s.Completer.CompleteStream(ctx, comp, func(delta string) error {
		b.WriteString(delta)
		return emit(delta)
	})
	completion := strings.TrimSpace(b.String())
	if completion == "" {
		if fatalOpenAI(err) {
			return ChatResponse{}, classify(err)
		}
		completion, err = s.Completer.Complete(ctx, comp)
		if err != nil {
			return ChatResponse{}, classify(err)
		}
		completion = strings.TrimSpace(completion)
		if completion == "" {
			return ChatResponse{}, ErrUnavailable
		}
		_ = emit(completion)
	}
	s.append(convID, text, completion)
	return s.response(convID, agent, completion), nil
}

func (s *Service) prepare(req ChatRequest) (string, Agent, string, error) {
	text := strings.TrimSpace(req.Text())
	if err := ValidateMessage(text); err != nil {
		return "", Agent{}, "", err
	}
	selected := ParseAgent(req.Agent)
	routed := Route(selected, text, req.Context.CurrentPage, req.Domain, req.Context.SelectedIndicator)
	agent, ok := LookupAgent(routed)
	if !ok {
		agent, _ = LookupAgent(AgentSinval)
	}
	convID := strings.TrimSpace(req.ConversationID)
	if convID == "" {
		convID = newID()
	}
	return text, agent, convID, nil
}

func (s *Service) completion(req ChatRequest, text string, agent Agent, convID string) CompletionRequest {
	evidence := filterEvidence(s.Evidence, req.Domain, req.Context.SelectedIndicator)
	instructions := SystemPrompt(agent.ID) + "\nPrompt version: " + PromptVersion + "\n" + screenContext(req) + "\n\nPainel de evidência (agosto de 2026, base demonstrativa):\n" + formatEvidence(evidence)
	input := append([]Turn{}, s.history(convID)...)
	input = append(input, Turn{Role: "user", Content: text})
	return CompletionRequest{Instructions: instructions, Input: input}
}

func screenContext(req ChatRequest) string {
	return "Contexto da tela: página=" + empty(req.Context.CurrentPage) + "; domínio=" + empty(req.Domain) + "; indicador selecionado=" + empty(req.Context.SelectedIndicator) + "."
}

func formatEvidence(rows []IndicatorEvidence) string {
	if len(rows) == 0 {
		return "(nenhum indicador neste recorte)"
	}
	var b strings.Builder
	for _, r := range rows {
		unit := r.Unit
		b.WriteString("- ")
		b.WriteString(r.ID)
		b.WriteString(" | ")
		b.WriteString(r.Name)
		b.WriteString(" | ")
		b.WriteString(r.Domain)
		b.WriteString(" | situação=")
		b.WriteString(r.Status)
		b.WriteString(" | atual=")
		b.WriteString(fmtNum(r.Value, unit))
		b.WriteString(" | anterior=")
		b.WriteString(fmtNum(r.Previous, unit))
		b.WriteString(" | meta=")
		b.WriteString(fmtNum(r.Target, unit))
		b.WriteString(" | dono=")
		b.WriteString(r.Owner)
		b.WriteString(" | fonte=")
		b.WriteString(r.Source)
		b.WriteString(" | ação=")
		b.WriteString(r.Action)
		if len(r.History) > 0 {
			raw, _ := json.Marshal(r.History)
			b.WriteString(" | histórico=")
			b.Write(raw)
		}
		b.WriteByte('\n')
	}
	return b.String()
}

func fmtNum(v float64, unit string) string {
	s := strconv.FormatFloat(v, 'f', -1, 64)
	if unit != "" {
		return s + unit
	}
	return s
}

func (s *Service) response(convID string, agent Agent, message string) ChatResponse {
	return ChatResponse{
		ConversationID:   convID,
		Agent:            agent,
		Message:          message,
		SuggestedActions: SuggestedActions(agent.ID),
		Disclaimer:       Disclaimer,
	}
}

func (s *Service) history(id string) []Turn {
	s.mu.Lock()
	defer s.mu.Unlock()
	conv := s.sessions[id]
	if conv == nil {
		return nil
	}
	out := make([]Turn, len(conv.Turns))
	copy(out, conv.Turns)
	return out
}

func (s *Service) append(id, user, assistant string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	conv := s.sessions[id]
	if conv == nil {
		conv = &Conversation{ID: id}
		s.sessions[id] = conv
	}
	conv.Turns = append(conv.Turns, Turn{Role: "user", Content: user}, Turn{Role: "assistant", Content: assistant})
	if len(conv.Turns) > MaxHistory {
		conv.Turns = conv.Turns[len(conv.Turns)-MaxHistory:]
	}
	conv.UpdatedAt = time.Now()
}

func filterEvidence(rows []IndicatorEvidence, domain, indicatorID string) []IndicatorEvidence {
	out := make([]IndicatorEvidence, 0, len(rows))
	for _, r := range rows {
		if indicatorID != "" && strings.EqualFold(r.ID, indicatorID) {
			return []IndicatorEvidence{r}
		}
		if domain == "" || domain == "Todos" || domain == r.Domain {
			out = append(out, r)
		}
	}
	if len(out) == 0 {
		return rows
	}
	return out
}

func classify(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrAuth) || errors.Is(err, ErrQuota) || errors.Is(err, ErrModel) || errors.Is(err, ErrNotConfigured) || errors.Is(err, ErrInvalidMessage) || errors.Is(err, ErrRateLimited) || errors.Is(err, ErrUnavailable) {
		return err
	}
	return ErrUnavailable
}

func fatalOpenAI(err error) bool {
	return errors.Is(err, ErrAuth) || errors.Is(err, ErrQuota) || errors.Is(err, ErrModel) || errors.Is(err, ErrNotConfigured)
}

func empty(s string) string {
	if strings.TrimSpace(s) == "" {
		return "(não informado)"
	}
	return s
}

func newID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return hex.EncodeToString([]byte(time.Now().Format("20060102150405.000000000")))
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return hex.EncodeToString(b[:])
}
