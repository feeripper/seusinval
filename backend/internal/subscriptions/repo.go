package subscriptions

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// Repository desacopla o armazenamento. Esta implementação é em memória para
// demonstração, mas expõe a interface necessária para migrar para um banco real.
type Repository interface {
	ListSubscriptions(userID string) []Subscription
	GetSubscription(id, userID string) (*Subscription, bool)
	CreateSubscription(sub *Subscription)
	UpdateSubscription(sub *Subscription) bool
	DeleteSubscription(id, userID string) bool
	ListAllSubscriptions() []Subscription

	CreateUser(email string) *User
	GetUser(userID string) (*User, bool)

	LogNotification(log *NotificationLog)
	ListNotifications(userID string, limit int) []NotificationLog

	FindByIndicator(indicatorID string) []Subscription
}

// InMemoryRepo é uma implementação thread-safe em memória.
type InMemoryRepo struct {
	mu            sync.RWMutex
	users         map[string]*User
	subs          map[string]*Subscription
	notifications []*NotificationLog
}

func NewInMemoryRepo() *InMemoryRepo {
	return &InMemoryRepo{
		users: make(map[string]*User),
		subs:  make(map[string]*Subscription),
	}
}

func (r *InMemoryRepo) CreateUser(email string) *User {
	r.mu.Lock()
	defer r.mu.Unlock()
	u := &User{
		ID:        generateID(),
		Email:     email,
		Verified:  false,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	r.users[u.ID] = u
	return u
}

func (r *InMemoryRepo) GetUser(userID string) (*User, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[userID]
	return u, ok
}

func (r *InMemoryRepo) ListSubscriptions(userID string) []Subscription {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var out []Subscription
	for _, s := range r.subs {
		if s.UserID == userID {
			out = append(out, *s)
		}
	}
	return out
}

func (r *InMemoryRepo) GetSubscription(id, userID string) (*Subscription, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	s, ok := r.subs[id]
	if !ok || s.UserID != userID {
		return nil, false
	}
	return s, true
}

func (r *InMemoryRepo) FindByIndicator(indicatorID string) []Subscription {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var out []Subscription
	for _, s := range r.subs {
		if s.IndicatorID == indicatorID {
			out = append(out, *s)
		}
	}
	return out
}

func (r *InMemoryRepo) CreateSubscription(sub *Subscription) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.subs[sub.ID] = sub
}

func (r *InMemoryRepo) UpdateSubscription(sub *Subscription) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.subs[sub.ID]; !ok {
		return false
	}
	r.subs[sub.ID] = sub
	return true
}

func (r *InMemoryRepo) DeleteSubscription(id, userID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	s, ok := r.subs[id]
	if !ok || s.UserID != userID {
		return false
	}
	delete(r.subs, id)
	return true
}

func (r *InMemoryRepo) ListAllSubscriptions() []Subscription {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var out []Subscription
	for _, s := range r.subs {
		out = append(out, *s)
	}
	return out
}

func (r *InMemoryRepo) LogNotification(log *NotificationLog) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.notifications = append([]*NotificationLog{log}, r.notifications...)
}

func (r *InMemoryRepo) ListNotifications(userID string, limit int) []NotificationLog {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var out []NotificationLog
	for _, n := range r.notifications {
		if n.UserID == userID {
			out = append(out, *n)
			if limit > 0 && len(out) >= limit {
				break
			}
		}
	}
	return out
}

func generateID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func generateToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
