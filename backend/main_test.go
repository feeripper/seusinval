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
	"sinval/backend/internal/subscriptions"
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
	repo := subscriptions.NewInMemoryRepo()
	subSvc := subscriptions.NewService(repo, &subscriptions.MockSender{}, "")
	subSvc.ResolveUser("demo", "usuario@seusinval.local")
	return &App{Rows: rows, Token: "abcdefghijklmnopqrstuvwx", AI: svc, Limit: ai.NewLimiter(20, time.Minute), Subscriptions: subSvc}
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

func TestSubscriptionsCRUD(t *testing.T) {
	app := testApp()

	body, _ := json.Marshal(map[string]any{"indicatorId": "IA-001", "indicatorName": "Modelos de IA avaliados", "email": "teste@example.com", "events": []string{"data_update"}, "frequency": "immediate"})
	req := httptest.NewRequest(http.MethodPost, "/api/subscriptions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec := httptest.NewRecorder()
	app.handler().ServeHTTP(rec, req)
	if rec.Code != 201 {
		t.Fatalf("create code=%d body=%s", rec.Code, rec.Body.String())
	}

	var sub struct{ ID string }
	if err := json.Unmarshal(rec.Body.Bytes(), &sub); err != nil {
		t.Fatal(err)
	}
	if sub.ID == "" {
		t.Fatal("missing subscription id")
	}

	req = httptest.NewRequest(http.MethodGet, "/api/subscriptions", nil)
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec = httptest.NewRecorder()
	app.handler().ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("list code=%d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/notifications/simulate", bytes.NewReader([]byte(`{"indicatorId":"IA-001","indicatorName":"Modelos de IA avaliados","eventType":"data_update","newValue":"78%"}`)))
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec = httptest.NewRecorder()
	app.handler().ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("simulate code=%d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"notified":true`) {
		t.Fatalf("simulation did not notify: %s", rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/subscriptions/"+sub.ID+"/pause", nil)
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec = httptest.NewRecorder()
	app.handler().ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("pause code=%d", rec.Code)
	}
}

func TestIndicatorsIncludesForecast(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/indicators", nil)
	req.Header.Set("Authorization", "Bearer abcdefghijklmnopqrstuvwx")
	rec := httptest.NewRecorder()
	testApp().handler().ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("code=%d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Indicators []struct {
			ID       string `json:"id"`
			Forecast struct {
				Method      string `json:"method"`
				Points      []any  `json:"points"`
				Explanation string `json:"explanation"`
			} `json:"forecast"`
		} `json:"indicators"`
		Forecast struct {
			Method string `json:"method"`
		} `json:"forecast"`
		DataNature string `json:"dataNature"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.DataNature != "demonstrativo" {
		t.Fatalf("dataNature=%s", payload.DataNature)
	}
	if payload.Forecast.Method != "holt-linear" {
		t.Fatalf("method=%s", payload.Forecast.Method)
	}
	if len(payload.Indicators) != 1 || payload.Indicators[0].ID != "IA-001" {
		t.Fatalf("indicators=%+v", payload.Indicators)
	}
	if payload.Indicators[0].Forecast.Method != "holt-linear" || len(payload.Indicators[0].Forecast.Points) != 3 {
		t.Fatalf("forecast=%+v", payload.Indicators[0].Forecast)
	}
	if payload.Indicators[0].Forecast.Explanation == "" {
		t.Fatal("missing explanation")
	}
}
