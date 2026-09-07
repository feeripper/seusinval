package subscriptions

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// HandlerFactory cria handlers HTTP puros para serem montados no roteador principal.
type HandlerFactory struct {
	Service *Service
}

func (h *HandlerFactory) Mount(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/subscriptions", h.list)
	mux.HandleFunc("POST /api/subscriptions", h.create)
	mux.HandleFunc("GET /api/subscriptions/{id}", h.get)
	mux.HandleFunc("PATCH /api/subscriptions/{id}", h.update)
	mux.HandleFunc("DELETE /api/subscriptions/{id}", h.delete)
	mux.HandleFunc("POST /api/subscriptions/{id}/pause", h.pause)
	mux.HandleFunc("POST /api/subscriptions/{id}/resume", h.resume)
	mux.HandleFunc("GET /api/subscriptions/history", h.history)
	mux.HandleFunc("POST /api/notifications/simulate", h.simulate)
	mux.HandleFunc("POST /api/subscriptions/unsubscribe", h.unsubscribe)
}

func (h *HandlerFactory) list(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{"subscriptions": h.Service.ListSubscriptions(userID(r))})
}

func (h *HandlerFactory) create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IndicatorID   string   `json:"indicatorId"`
		IndicatorName string   `json:"indicatorName,omitempty"`
		Email         string   `json:"email"`
		Events        []string `json:"events"`
		Frequency     string   `json:"frequency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "JSON inválido"})
		return
	}
	sub, err := h.Service.CreateSubscription(userID(r), body.IndicatorID, body.IndicatorName, body.Email, body.Events, body.Frequency)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, sub)
}

func (h *HandlerFactory) get(w http.ResponseWriter, r *http.Request) {
	sub, ok := h.Service.repo.GetSubscription(r.PathValue("id"), userID(r))
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "não encontrado"})
		return
	}
	writeJSON(w, 200, sub)
}

func (h *HandlerFactory) update(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Events    []string `json:"events,omitempty"`
		Frequency string   `json:"frequency,omitempty"`
		Active    *bool    `json:"active,omitempty"`
		Paused    *bool    `json:"paused,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "JSON inválido"})
		return
	}
	sub, err := h.Service.UpdateSubscription(userID(r), r.PathValue("id"), body.Events, body.Frequency, body.Active, body.Paused)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, sub)
}

func (h *HandlerFactory) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.Service.DeleteSubscription(userID(r), r.PathValue("id")); err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 204, map[string]any{})
}

func (h *HandlerFactory) pause(w http.ResponseWriter, r *http.Request) {
	sub, err := h.Service.PauseResume(userID(r), r.PathValue("id"), true)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, sub)
}

func (h *HandlerFactory) resume(w http.ResponseWriter, r *http.Request) {
	sub, err := h.Service.PauseResume(userID(r), r.PathValue("id"), false)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, sub)
}

func (h *HandlerFactory) history(w http.ResponseWriter, r *http.Request) {
	logs := h.Service.ListNotifications(userID(r), 50)
	writeJSON(w, 200, map[string]any{"notifications": logs})
}

func (h *HandlerFactory) simulate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IndicatorID   string `json:"indicatorId"`
		IndicatorName string `json:"indicatorName"`
		EventType     string `json:"eventType"`
		OldValue      string `json:"oldValue"`
		NewValue      string `json:"newValue"`
		Criticality   string `json:"criticality"`
		Reason        string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "JSON inválido"})
		return
	}
	if body.EventType == "" {
		body.EventType = EventDataUpdate
	}
	if body.Reason == "" {
		body.Reason = "Atualização simulada para teste de notificação."
	}
	log, err := h.Service.NotifyEvent(r.Context(), userID(r), NotificationEvent{
		ID:            generateID(),
		IndicatorID:   body.IndicatorID,
		IndicatorName: body.IndicatorName,
		EventType:     body.EventType,
		OldValue:      body.OldValue,
		NewValue:      body.NewValue,
		Criticality:   body.Criticality,
		Reason:        body.Reason,
		CreatedAt:     time.Now().UTC(),
	})
	if err != nil {
		writeJSON(w, 502, map[string]string{"error": err.Error()})
		return
	}
	if log == nil {
		writeJSON(w, 200, map[string]any{"simulated": true, "notified": false, "reason": "nenhuma assinatura ativa para este evento"})
		return
	}
	writeJSON(w, 200, map[string]any{"simulated": true, "notified": log.Status == "enviado", "log": log})
}

func (h *HandlerFactory) unsubscribe(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		writeJSON(w, 400, map[string]string{"error": "token ausente"})
		return
	}
	ok, err := h.Service.UnsubscribeByToken(token)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"unsubscribed": ok})
}

func userID(r *http.Request) string {
	if v := r.Header.Get("X-User-Id"); v != "" {
		return v
	}
	return "demo"
}

func writeJSON(w http.ResponseWriter, code int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(data)
}
