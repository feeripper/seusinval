package main

import (
	"context"
	"crypto/subtle"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"sinval/backend/internal/ai"
)

//go:embed indicators.json
var seed []byte

type Indicator struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Domain      string    `json:"domain"`
	Value       float64   `json:"value"`
	Previous    float64   `json:"previous"`
	Target      float64   `json:"target"`
	Unit        string    `json:"unit"`
	Direction   string    `json:"direction"`
	Owner       string    `json:"owner"`
	Source      string    `json:"source"`
	Numerator   float64   `json:"numerator"`
	Denominator float64   `json:"denominator"`
	Action      string    `json:"action"`
	History     []float64 `json:"history"`
}
type App struct {
	Rows  []Indicator
	Token string
	AI    *ai.Service
	Limit *ai.Limiter
}

func reply(w http.ResponseWriter, code int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}

func state(i Indicator) string {
	gap := i.Target - i.Value
	if i.Direction == "down" {
		gap = i.Value - i.Target
	}
	if gap <= 0 {
		return "Na meta"
	}
	if gap > 10 || i.Unit == "" {
		return "Crítico"
	}
	return "Atenção"
}

func (a *App) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		mode := "demo"
		if a.AI != nil && a.AI.Ready() {
			mode = "llm"
		}
		reply(w, 200, map[string]any{"status": "ok", "mode": mode})
	})
	mux.HandleFunc("GET /api/indicators", func(w http.ResponseWriter, r *http.Request) {
		mode := "demo"
		if a.AI != nil && a.AI.Ready() {
			mode = "llm"
		}
		reply(w, 200, map[string]any{"indicators": a.Rows, "mode": mode})
	})
	mux.HandleFunc("GET /api/agents", func(w http.ResponseWriter, r *http.Request) {
		status := "indisponível"
		if a.AI != nil && a.AI.Ready() {
			status = "disponível"
		}
		type item struct {
			ai.Agent
			Status string `json:"status"`
		}
		out := make([]item, 0, len(ai.Agents))
		for _, ag := range ai.Agents {
			out = append(out, item{Agent: ag, Status: status})
		}
		reply(w, 200, map[string]any{"agents": out, "disclaimer": ai.Disclaimer})
	})
	mux.HandleFunc("POST /api/chat", a.chat)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.URL.Path != "/healthz" && subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+a.Token)) != 1 {
			reply(w, 401, map[string]string{"error": "Não autorizado"})
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func (a *App) chat(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 16384)
	var req ai.ChatRequest
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&req); err != nil {
		reply(w, 400, map[string]string{"error": "JSON inválido"})
		return
	}
	var trailing any
	if dec.Decode(&trailing) != io.EOF {
		reply(w, 400, map[string]string{"error": "JSON inválido"})
		return
	}
	if err := ai.ValidateMessage(strings.TrimSpace(req.Text())); err != nil {
		reply(w, 400, map[string]string{"error": err.Error()})
		return
	}
	if a.Limit != nil && !a.Limit.Allow(clientKey(r)) {
		reply(w, 429, map[string]string{"error": ai.ErrRateLimited.Error()})
		return
	}
	if a.AI == nil || !a.AI.Ready() {
		reply(w, 503, map[string]string{"error": "Assistente indisponível. O motor de IA não está configurado no backend."})
		return
	}
	stream := req.Stream || strings.Contains(r.Header.Get("Accept"), "text/event-stream")
	if stream {
		a.streamChat(w, r, req)
		return
	}
	res, err := a.AI.Ask(r.Context(), req)
	if err != nil {
		writeAIError(w, err)
		return
	}
	reply(w, 200, res)
}

func (a *App) streamChat(w http.ResponseWriter, r *http.Request, req ai.ChatRequest) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		res, err := a.AI.Ask(r.Context(), req)
		if err != nil {
			writeAIError(w, err)
			return
		}
		reply(w, 200, res)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(200)
	writeSSE := func(event string, payload any) {
		raw, _ := json.Marshal(payload)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, raw)
		flusher.Flush()
	}
	selected := ai.ParseAgent(req.Agent)
	routed := ai.Route(selected, req.Text(), req.Context.CurrentPage, req.Domain, req.Context.SelectedIndicator)
	agent, _ := ai.LookupAgent(routed)
	writeSSE("meta", map[string]any{
		"agent":            agent,
		"disclaimer":       ai.Disclaimer,
		"suggestedActions": ai.SuggestedActions(agent.ID),
		"status":           statusLine(agent),
	})
	res, err := a.AI.AskStream(r.Context(), req, func(delta string) error {
		writeSSE("delta", map[string]string{"text": delta})
		return nil
	})
	if err != nil {
		writeSSE("error", map[string]string{"error": publicError(err)})
		return
	}
	writeSSE("done", res)
}

func writeAIError(w http.ResponseWriter, err error) {
	code := 502
	if err == ai.ErrInvalidMessage {
		code = 400
	} else if err == ai.ErrRateLimited {
		code = 429
	} else if err == ai.ErrNotConfigured {
		code = 503
	}
	reply(w, code, map[string]string{"error": publicError(err)})
}

func publicError(err error) string {
	switch err {
	case ai.ErrInvalidMessage:
		return err.Error()
	case ai.ErrRateLimited:
		return err.Error()
	case ai.ErrNotConfigured:
		return "Assistente indisponível. O motor de IA não está configurado no backend."
	default:
		return "Não foi possível consultar o assistente. Tente novamente."
	}
}

func statusLine(agent ai.Agent) string {
	switch agent.ID {
	case ai.AgentAurora:
		return "Aurora está analisando riscos de IA…"
	case ai.AgentOctave:
		return "Octave está revisando controles de proteção…"
	case ai.AgentSherlock:
		return "Sherlock está investigando a questão de privacidade…"
	default:
		return "Seu Sinval está analisando o contexto…"
	}
}

func clientKey(r *http.Request) string {
	if x := r.Header.Get("X-Forwarded-For"); x != "" {
		return strings.TrimSpace(strings.Split(x, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func evidenceFrom(rows []Indicator) []ai.IndicatorEvidence {
	out := make([]ai.IndicatorEvidence, 0, len(rows))
	for _, i := range rows {
		out = append(out, ai.IndicatorEvidence{
			ID: i.ID, Name: i.Name, Domain: i.Domain, Value: i.Value, Previous: i.Previous,
			Target: i.Target, Unit: i.Unit, Direction: i.Direction, Owner: i.Owner, Source: i.Source,
			Action: i.Action, History: i.History, Status: state(i),
		})
	}
	return out
}

func main() {
	token := os.Getenv("API_TOKEN")
	if len(token) < 24 {
		log.Fatal("API_TOKEN obrigatório, mínimo 24 caracteres")
	}
	var rows []Indicator
	if json.Unmarshal(seed, &rows) != nil {
		log.Fatal("Base inválida")
	}
	key := os.Getenv("OPENAI_API_KEY")
	model := os.Getenv("OPENAI_MODEL")
	var svc *ai.Service
	if key != "" {
		svc = ai.NewService(ai.NewClient(key, model), evidenceFrom(rows))
		log.Print("Motor de IA configurado")
	} else {
		log.Print("OPENAI_API_KEY ausente; chat permanecerá indisponível")
	}
	a := &App{Rows: rows, Token: token, AI: svc, Limit: ai.NewLimiter(20, time.Minute)}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           a.handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      50 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    16384,
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		srv.Shutdown(shutdown)
	}()
	log.Printf("Seu Sinval ouvindo na porta %s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
