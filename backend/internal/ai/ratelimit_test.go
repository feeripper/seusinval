package ai

import (
	"testing"
	"time"
)

func TestLimiterAllowsThenBlocks(t *testing.T) {
	l := NewLimiter(2, time.Minute)
	if !l.Allow("a") || !l.Allow("a") {
		t.Fatal("first two hits must pass")
	}
	if l.Allow("a") {
		t.Fatal("third hit must be limited")
	}
	if !l.Allow("b") {
		t.Fatal("other key must pass")
	}
}

func TestLimiterNilAllows(t *testing.T) {
	var l *Limiter
	if !l.Allow("x") {
		t.Fatal("nil limiter must allow")
	}
}
