package ai

import "testing"

func TestStreamDeltasOutputText(t *testing.T) {
	got := streamDeltas(`{"type":"response.output_text.delta","delta":"Olá"}`)
	if len(got) != 1 || got[0] != "Olá" {
		t.Fatalf("got %#v", got)
	}
}

func TestStreamDeltasNestedDelta(t *testing.T) {
	got := streamDeltas(`{"type":"response.output_text.delta","delta":{"text":"Risco"}}`)
	if len(got) != 1 || got[0] != "Risco" {
		t.Fatalf("got %#v", got)
	}
}

func TestStreamDeltasIgnoresNoise(t *testing.T) {
	if got := streamDeltas(`{"type":"response.created"}`); len(got) != 0 {
		t.Fatalf("got %#v", got)
	}
}
