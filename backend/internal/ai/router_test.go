package ai

import "testing"

func TestParseAgent(t *testing.T) {
	cases := map[string]AgentID{
		"": "sinval", "sinval": AgentSinval, "aurora": AgentAurora,
		"octave": AgentOctave, "sherlock": AgentSherlock, "unknown": AgentSinval,
	}
	for in, want := range cases {
		if got := ParseAgent(in); got != want {
			t.Fatalf("ParseAgent(%q)=%q want %q", in, got, want)
		}
	}
}

func TestRouteRespectsSpecialistSelection(t *testing.T) {
	got := Route(AgentAurora, "Quais direitos dos titulares estão atrasados?", "Privacidade de dados", "Privacidade de dados", "PRV-001")
	if got != AgentAurora {
		t.Fatalf("expected aurora, got %s", got)
	}
}

func TestRouteFromQuestion(t *testing.T) {
	cases := []struct {
		q    string
		want AgentID
	}{
		{"Quais são os riscos de usar IA generativa no atendimento?", AgentAurora},
		{"Como reduzir vieses e alucinações nos modelos?", AgentAurora},
		{"Quais ativos estão sem criptografia?", AgentOctave},
		{"Como tratar o incidente de exposição de dados?", AgentOctave},
		{"Quais bases legais se aplicam ao consentimento?", AgentSherlock},
		{"Resuma as prioridades de privacidade e RIPD", AgentSherlock},
		{"Quais indicadores precisam de atenção?", AgentSinval},
		{"Compare privacidade, proteção e risco de IA neste mês", AgentSinval},
	}
	for _, c := range cases {
		if got := Route(AgentSinval, c.q, "Visão geral", "Todos", ""); got != c.want {
			t.Fatalf("Route(%q)=%s want %s", c.q, got, c.want)
		}
	}
}

func TestSystemPromptVersioned(t *testing.T) {
	for _, id := range []AgentID{AgentSinval, AgentAurora, AgentOctave, AgentSherlock} {
		p := SystemPrompt(id)
		if p == "" {
			t.Fatalf("empty prompt for %s", id)
		}
		if !contains(p, "EXCLUSIVAMENTE") {
			t.Fatalf("prompt %s missing guardrails", id)
		}
	}
	if SystemPrompt(AgentAurora) == SystemPrompt(AgentSherlock) {
		t.Fatal("specialist prompts must differ")
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || (len(s) > 0 && (func() bool {
		for i := 0; i+len(sub) <= len(s); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
		return false
	})()))
}

func TestValidateMessage(t *testing.T) {
	if err := ValidateMessage(""); err != ErrInvalidMessage {
		t.Fatalf("empty: %v", err)
	}
	long := make([]rune, MaxMessageRunes+1)
	for i := range long {
		long[i] = 'a'
	}
	if err := ValidateMessage(string(long)); err != ErrInvalidMessage {
		t.Fatalf("too long: %v", err)
	}
	if err := ValidateMessage("Quais indicadores precisam de atenção?"); err != nil {
		t.Fatalf("valid: %v", err)
	}
}

func TestSuggestedActions(t *testing.T) {
	if len(SuggestedActions(AgentAurora)) == 0 {
		t.Fatal("aurora actions")
	}
}
