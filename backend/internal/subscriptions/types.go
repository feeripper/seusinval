package subscriptions

import (
	"time"
)

// User representa uma conta mínima para notificações.
// Em produção, a autenticação real viria de um IdP separado.
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name,omitempty"`
	Verified  bool      `json:"verified"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Subscription define o acompanhamento de um indicador.
type Subscription struct {
	ID               string     `json:"id"`
	UserID           string     `json:"userId"`
	IndicatorID      string     `json:"indicatorId"`
	IndicatorName    string     `json:"indicatorName,omitempty"`
	Email            string     `json:"email"`
	Events           []string   `json:"events"`
	Frequency        string     `json:"frequency"`
	Active           bool       `json:"active"`
	Paused           bool       `json:"paused"`
	UnsubscribeToken string     `json:"-"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	LastNotifiedAt   *time.Time `json:"lastNotifiedAt,omitempty"`
}

// IsActive considera active=true e paused=false.
func (s *Subscription) IsActive() bool {
	return s != nil && s.Active && !s.Paused
}

// Allowed event types.
const (
	EventDataUpdate      = "data_update"
	EventCriticality     = "criticality_change"
	EventCritical        = "became_critical"
	EventTrendDecline    = "trend_decline"
	EventForecast        = "forecast_available"
)

// Frequencies.
const (
	FrequencyImmediate = "immediate"
	FrequencyDaily     = "daily"
	FrequencyWeekly    = "weekly"
)

// NotificationLog registra auditoria de envios.
type NotificationLog struct {
	ID             string    `json:"id"`
	SubscriptionID string    `json:"subscriptionId"`
	UserID         string    `json:"userId"`
	IndicatorID    string    `json:"indicatorId"`
	IndicatorName  string    `json:"indicatorName,omitempty"`
	EventType      string    `json:"eventType"`
	Frequency      string    `json:"frequency,omitempty"`
	Subject        string    `json:"subject"`
	Status         string    `json:"status"`
	Error          string    `json:"error,omitempty"`
	Simulated      bool      `json:"simulated"`
	SentAt         time.Time `json:"sentAt"`
}

// NotificationEvent descreve uma mudança em um indicador.
type NotificationEvent struct {
	ID            string    `json:"id"`
	IndicatorID   string    `json:"indicatorId"`
	IndicatorName string    `json:"indicatorName"`
	EventType     string    `json:"eventType"`
	OldValue      string    `json:"oldValue,omitempty"`
	NewValue      string    `json:"newValue,omitempty"`
	Criticality   string    `json:"criticality,omitempty"`
	Reason        string    `json:"reason,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}
