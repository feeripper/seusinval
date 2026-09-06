package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"sinval/backend/internal/ai"
)

type stubCompleter struct{ out string }

func (s stubCompleter) Complete(_ context.Context, _ ai.CompletionRequest) (string, error) {
	return s.out, nil
}
func (s stubCompleter) CompleteStream(_ context.Context, _ ai.CompletionRequest, emit func(string) error) error {
	return emit(s.out)
}

func testApp() *App {
	rows := []Indicator{{ID: "IA-001", Name: "Modelos de IA avaliados", Domain: "Riscos de IA", Value: 76, Target: 95, Unit: "%", Direction: "up", Owner: "Governança de IA", Source: "Inventário", Action: "Avaliar pendências", History: []float64{70, 71, 72, 72, 74, 76}}}
	svc := ai.NewService(stubCompleter{out: "Risco identificado na evidência fictícia."}, evidenceFrom(rows))
	return &App{Rows: rows, Token: "abcdefghijklmnopqrstuvwx", AI: svc, Limit: ai.NewLimiter(20, time.Minute)}
}

func TestChatRejectsInvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader("{"))
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec := httptest.NewRecorder()
	testApp().handler().ServeHTTP(rec, req)
	if rec.Code != 400 {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestChatRejectsEmptyMessage(t *testing.T) {
	body, _ := json.Marshal(map[string]string{"message": " "})
	req := httptest.NewRequest(http.MethodPost, "/api/chat", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec := httptest.NewRecorder()
	testApp().handler().ServeHTTP(rec, req)
	if rec.Code != 400 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestChatUnauthorized(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(`{"message":"oi"}`))
	rec := httptest.NewRecorder()
	testApp().handler().ServeHTTP(rec, req)
	if rec.Code != 401 {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestChatRoutesToAurora(t *testing.T) {
	body, _ := json.Marshal(map[string]any{"message": "Quais são os riscos de usar IA generativa no atendimento?", "agent": "sinval"})
	req := httptest.NewRequest(http.MethodPost, "/api/chat", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec := httptest.NewRecorder()
	testApp().handler().ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	var res ai.ChatResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatal(err)
	}
	if res.Agent.ID != ai.AgentAurora {
		t.Fatalf("agent=%s", res.Agent.ID)
	}
	if res.Message == "" || res.Disclaimer == "" {
		t.Fatal("missing message or disclaimer")
	}
}

func TestAgentsEndpoint(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/agents", nil)
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec := httptest.NewRecorder()
	testApp().handler().ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("code=%d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"id":"sinval"`) {
		t.Fatalf("body=%s", rec.Body.String())
	}
}
