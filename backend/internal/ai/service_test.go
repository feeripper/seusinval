package ai

import (
	"context"
	"strings"
	"testing"
)

type fakeCompleter struct {
	last CompletionRequest
	out  string
}

func (f *fakeCompleter) Complete(_ context.Context, req CompletionRequest) (string, error) {
	f.last = req
	return f.out, nil
}

func (f *fakeCompleter) CompleteStream(_ context.Context, req CompletionRequest, emit func(string) error) error {
	f.last = req
	return emit(f.out)
}

func TestAskUsesRoutedPromptAndEvidence(t *testing.T) {
	fake := &fakeCompleter{out: "Análise demonstrativa da Aurora."}
	svc := NewService(fake, []IndicatorEvidence{
		{ID: "IA-001", Name: "Modelos de IA avaliados", Domain: "Riscos de IA", Status: "Crítico"},
		{ID: "PRV-001", Name: "Solicitações atendidas no prazo", Domain: "Privacidade de dados", Status: "Atenção"},
	})
	res, err := svc.Ask(context.Background(), ChatRequest{
		Message: "Quais são os riscos de usar IA generativa no atendimento?",
		Agent:   "sinval",
		Context: Context{CurrentPage: "Visão geral"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Agent.ID != AgentAurora {
		t.Fatalf("agent=%s", res.Agent.ID)
	}
	if res.Disclaimer != Disclaimer {
		t.Fatal("disclaimer")
	}
	if !strings.Contains(fake.last.Instructions, "Aurora") {
		t.Fatalf("expected aurora prompt, got %s", fake.last.Instructions[:80])
	}
	if !strings.Contains(fake.last.Instructions, "IA-001") {
		t.Fatal("evidence missing")
	}
	if !strings.Contains(fake.last.Instructions, "Painel de evidência") {
		t.Fatal("formatted evidence missing")
	}
	if res.ConversationID == "" {
		t.Fatal("conversation id")
	}
}

func TestAskKeepsHistory(t *testing.T) {
	fake := &fakeCompleter{out: "ok"}
	svc := NewService(fake, nil)
	first, err := svc.Ask(context.Background(), ChatRequest{Message: "Resumo executivo"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.Ask(context.Background(), ChatRequest{Message: "Detalhe o primeiro ponto", ConversationID: first.ConversationID})
	if err != nil {
		t.Fatal(err)
	}
	if len(fake.last.Input) < 3 {
		t.Fatalf("history not reused: %+v", fake.last.Input)
	}
}

func TestAskRejectsEmpty(t *testing.T) {
	svc := NewService(&fakeCompleter{out: "x"}, nil)
	if _, err := svc.Ask(context.Background(), ChatRequest{Message: "  "}); err != ErrInvalidMessage {
		t.Fatalf("got %v", err)
	}
}
