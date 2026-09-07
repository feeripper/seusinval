package subscriptions

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"slices"
	"strings"
	"sync"
	"time"
)

// Service encapsula regras de negócio de assinaturas, deduplicação e auditoria.
type Service struct {
	repo   Repository
	sender Sender
	portal string
	mu     sync.Mutex
}

func NewService(repo Repository, sender Sender, portal string) *Service {
	if portal == "" {
		portal = "https://seu-sinval.app"
	}
	return &Service{repo: repo, sender: sender, portal: portal}
}

func (s *Service) ResolveUser(userID, email string) *User {
	if userID == "" {
		userID = "demo"
	}
	u, ok := s.repo.GetUser(userID)
	if ok {
		return u
	}
	if email == "" {
		email = "usuario@seusinval.local"
	}
	return s.repo.CreateUser(email)
}

func (s *Service) ListSubscriptions(userID string) []Subscription {
	if userID == "" {
		userID = "demo"
	}
	return s.repo.ListSubscriptions(userID)
}

func (s *Service) CreateSubscription(userID, indicatorID, indicatorName, email string, events []string, frequency string) (*Subscription, error) {
	if userID == "" {
		userID = "demo"
	}
	if strings.TrimSpace(indicatorID) == "" {
		return nil, errors.New("indicatorId é obrigatório")
	}
	if email == "" {
		return nil, errors.New("e-mail é obrigatório")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, errors.New("e-mail inválido")
	}
	ev := validateEvents(events)
	freq := validateFrequency(frequency)

	sub := &Subscription{
		ID:               generateID(),
		UserID:           userID,
		IndicatorID:      indicatorID,
		IndicatorName:    indicatorName,
		Email:            strings.ToLower(strings.TrimSpace(email)),
		Events:           ev,
		Frequency:        freq,
		Active:           true,
		Paused:           false,
		UnsubscribeToken: generateToken(),
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}
	s.repo.CreateSubscription(sub)
	return sub, nil
}

func (s *Service) UpdateSubscription(userID, subID string, events []string, frequency string, active, paused *bool) (*Subscription, error) {
	sub, ok := s.repo.GetSubscription(subID, userID)
	if !ok {
		return nil, errors.New("assinatura não encontrada")
	}
	if len(events) > 0 {
		sub.Events = validateEvents(events)
	}
	if frequency != "" {
		sub.Frequency = validateFrequency(frequency)
	}
	if active != nil {
		sub.Active = *active
	}
	if paused != nil {
		sub.Paused = *paused
	}
	sub.UpdatedAt = time.Now().UTC()
	s.repo.UpdateSubscription(sub)
	return sub, nil
}

func (s *Service) DeleteSubscription(userID, subID string) error {
	if !s.repo.DeleteSubscription(subID, userID) {
		return errors.New("assinatura não encontrada")
	}
	return nil
}

func (s *Service) PauseResume(userID, subID string, paused bool) (*Subscription, error) {
	return s.UpdateSubscription(userID, subID, nil, "", nil, &paused)
}

func (s *Service) UnsubscribeByToken(token string) (bool, error) {
	for _, sub := range s.repo.ListAllSubscriptions() {
		if sub.UnsubscribeToken == token {
			active := false
			_, err := s.UpdateSubscription(sub.UserID, sub.ID, nil, "", &active, nil)
			return true, err
		}
	}
	return false, errors.New("token inválido")
}

func (s *Service) ListNotifications(userID string, limit int) []NotificationLog {
	if userID == "" {
		userID = "demo"
	}
	if limit <= 0 {
		limit = 50
	}
	return s.repo.ListNotifications(userID, limit)
}

// NotifyEvent processa um evento individual, respeitando filtros de evento e frequência imediata.
func (s *Service) NotifyEvent(ctx context.Context, userID string, ev NotificationEvent) (*NotificationLog, error) {
	if userID == "" {
		userID = "demo"
	}
	subs := s.repo.ListSubscriptions(userID)
	for i := range subs {
		sub := &subs[i]
		if !sub.IsActive() || sub.IndicatorID != ev.IndicatorID {
			continue
		}
		if !slices.Contains(sub.Events, ev.EventType) {
			continue
		}
		if sub.Frequency != FrequencyImmediate {
			continue
		}
		log, err := s.send(ctx, sub, ev)
		if err != nil {
			return log, err
		}
		now := time.Now().UTC()
		sub.LastNotifiedAt = &now
		_ = s.repo.UpdateSubscription(sub)
		return log, nil
	}
	return nil, nil
}

// SendDigest gera notificações agrupadas para assinaturas diárias/semanais.
func (s *Service) SendDigest(ctx context.Context, userID, kind string, events []NotificationEvent) ([]NotificationLog, error) {
	if userID == "" {
		userID = "demo"
	}
	subs := s.repo.ListSubscriptions(userID)
	if len(subs) == 0 || len(events) == 0 {
		return nil, nil
	}
	var logs []NotificationLog
	now := time.Now().UTC()
	for i := range subs {
		sub := &subs[i]
		if !sub.IsActive() || sub.Frequency != kind {
			continue
		}
		var matched []NotificationEvent
		for _, ev := range events {
			if ev.IndicatorID == sub.IndicatorID && slices.Contains(sub.Events, ev.EventType) {
				matched = append(matched, ev)
			}
		}
		if len(matched) == 0 {
			continue
		}
		body := s.renderDigest(sub, matched)
		log := s.enqueueLog(sub, NotificationEvent{IndicatorID: sub.IndicatorID, IndicatorName: sub.IndicatorName, EventType: kind}, kind)
		log.Subject = fmt.Sprintf("Resumo %s — %d atualizações no Seu Sinval", kindLabel(kind), len(matched))
		if err := s.sender.Send(ctx, sub.Email, log.Subject, body); err != nil {
			log.Status = "erro"
			log.Error = err.Error()
		} else {
			log.Status = "enviado"
			sub.LastNotifiedAt = &now
			_ = s.repo.UpdateSubscription(sub)
		}
		s.repo.LogNotification(log)
		logs = append(logs, *log)
	}
	return logs, nil
}

func (s *Service) send(ctx context.Context, sub *Subscription, ev NotificationEvent) (*NotificationLog, error) {
	log := s.enqueueLog(sub, ev, FrequencyImmediate)
	log.Subject = fmt.Sprintf("Atualização em %s — Seu Sinval", ev.IndicatorName)
	body := RenderBody(
		ev.IndicatorID,
		ev.IndicatorName,
		"", // domain não mantido na assinatura simplificada
		ev.OldValue,
		ev.NewValue,
		ev.Criticality,
		ev.Reason,
		s.portal,
		fmt.Sprintf("%s/api/subscriptions/unsubscribe?token=%s", s.portal, sub.UnsubscribeToken),
	)
	if err := s.sender.Send(ctx, sub.Email, log.Subject, body); err != nil {
		log.Status = "erro"
		log.Error = err.Error()
	} else {
		log.Status = "enviado"
	}
	s.repo.LogNotification(log)
	return log, nil
}

func (s *Service) enqueueLog(sub *Subscription, ev NotificationEvent, freq string) *NotificationLog {
	return &NotificationLog{
		ID:             generateID(),
		SubscriptionID: sub.ID,
		UserID:         sub.UserID,
		IndicatorID:    ev.IndicatorID,
		IndicatorName:  ev.IndicatorName,
		EventType:      ev.EventType,
		Frequency:      freq,
		Subject:        fmt.Sprintf("Atualização em %s", ev.IndicatorName),
		Status:         "simulado",
		Simulated:      true,
		SentAt:         time.Now().UTC(),
	}
}

func (s *Service) renderDigest(sub *Subscription, events []NotificationEvent) string {
	var b strings.Builder
	b.WriteString(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Resumo Seu Sinval</title>`)
	b.WriteString(`<style>body{margin:0;font-family:Inter,Segoe UI,system-ui,Arial,sans-serif;background:#f7f8fa;color:#141b26;}.container{max-width:600px;margin:24px auto;background:#fff;border:1px solid #e3e6eb;border-radius:16px;overflow:hidden;}.header{background:#08244a;padding:32px 24px;color:#fff;}.body{padding:28px 24px;}h2{margin-top:0;}.item{padding:16px;border-bottom:1px solid #e3e6eb;}.item:last-child{border:0;}.footer{padding:20px 24px;background:#f7f8fa;font-size:12px;color:#737d8b;}</style></head><body>`)
	b.WriteString(`<div class="container"><div class="header"><h1>Seu Sinval</h1><p>Resumo de atualizações</p></div><div class="body"><h2>`)
	b.WriteString(htmlEscape(sub.IndicatorName))
	b.WriteString(`</h2>`)
	for _, ev := range events {
		b.WriteString(`<div class="item"><strong>`)
		b.WriteString(htmlEscape(ev.EventType))
		b.WriteString(`</strong><br>De: `)
		b.WriteString(htmlEscape(ev.OldValue))
		b.WriteString(` &rarr; `)
		b.WriteString(htmlEscape(ev.NewValue))
		b.WriteString(`<br><span style="color:#737d8b;">`)
		b.WriteString(htmlEscape(ev.Reason))
		b.WriteString(`</span></div>`)
	}
	b.WriteString(`</div><div class="footer">Você recebeu este e-mail porque assinou notificações. <a href="`)
	b.WriteString(fmt.Sprintf("%s/api/subscriptions/unsubscribe?token=%s", s.portal, sub.UnsubscribeToken))
	b.WriteString(`">Descadastrar</a></div></div></body></html>`)
	return b.String()
}

func validateEvents(ev []string) []string {
	allowed := []string{EventDataUpdate, EventCriticality, EventCritical, EventTrendDecline, EventForecast}
	var out []string
	for _, e := range ev {
		e = strings.ToLower(strings.TrimSpace(e))
		if slices.Contains(allowed, e) {
			out = append(out, e)
		}
	}
	if len(out) == 0 {
		return []string{EventDataUpdate}
	}
	return out
}

func validateFrequency(f string) string {
	switch strings.ToLower(strings.TrimSpace(f)) {
	case FrequencyImmediate:
		return FrequencyImmediate
	case FrequencyDaily:
		return FrequencyDaily
	case FrequencyWeekly:
		return FrequencyWeekly
	default:
		return FrequencyImmediate
	}
}

func kindLabel(k string) string {
	switch k {
	case FrequencyDaily:
		return "diário"
	case FrequencyWeekly:
		return "semanal"
	default:
		return k
	}
}
