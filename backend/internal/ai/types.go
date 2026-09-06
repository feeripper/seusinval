package ai

import (
	"context"
	"time"
)

const (
	PromptVersion   = "2026-09"
	Disclaimer      = "As respostas são orientativas e devem ser validadas pelas áreas de Privacidade, Segurança, Risco e Jurídico."
	MaxMessageRunes = 2000
	MaxHistory      = 12
)

type AgentID string

const (
	AgentSinval   AgentID = "sinval"
	AgentAurora   AgentID = "aurora"
	AgentOctave   AgentID = "octave"
	AgentSherlock AgentID = "sherlock"
)

type Agent struct {
	ID   AgentID `json:"id"`
	Name string  `json:"name"`
	Role string  `json:"role"`
}

var Agents = []Agent{
	{ID: AgentSinval, Name: "Seu Sinval", Role: "Coordenador geral"},
	{ID: AgentAurora, Name: "Aurora", Role: "Especialista em Risco de IA"},
	{ID: AgentOctave, Name: "Octave", Role: "Especialista em Proteção de Dados"},
	{ID: AgentSherlock, Name: "Sherlock", Role: "Especialista em Privacidade de Dados"},
}

func LookupAgent(id AgentID) (Agent, bool) {
	for _, a := range Agents {
		if a.ID == id {
			return a, true
		}
	}
	return Agent{}, false
}

func ParseAgent(raw string) AgentID {
	switch AgentID(raw) {
	case AgentAurora, AgentOctave, AgentSherlock, AgentSinval:
		return AgentID(raw)
	default:
		return AgentSinval
	}
}

type Context struct {
	SelectedIndicator string `json:"selectedIndicator"`
	CurrentPage       string `json:"currentPage"`
}

type ChatRequest struct {
	Message        string  `json:"message"`
	Question       string  `json:"question"`
	Agent          string  `json:"agent"`
	ConversationID string  `json:"conversationId"`
	Domain         string  `json:"domain"`
	Context        Context `json:"context"`
	Stream         bool    `json:"stream"`
}

func (r ChatRequest) Text() string {
	if r.Message != "" {
		return r.Message
	}
	return r.Question
}

type ChatResponse struct {
	ConversationID   string   `json:"conversationId"`
	Agent            Agent    `json:"agent"`
	Message          string   `json:"message"`
	SuggestedActions []string `json:"suggestedActions"`
	Disclaimer       string   `json:"disclaimer"`
}

type CompletionRequest struct {
	Instructions string
	Input        []Turn
}

type Turn struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Conversation struct {
	ID        string
	Turns     []Turn
	UpdatedAt time.Time
}

type Completer interface {
	Complete(ctx context.Context, req CompletionRequest) (string, error)
	CompleteStream(ctx context.Context, req CompletionRequest, emit func(delta string) error) error
}
