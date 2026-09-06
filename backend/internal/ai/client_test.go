package ai

import "testing"

func TestStreamDeltasChatCompletions(t *testing.T) {
	got := streamDeltas(`{"choices":[{"delta":{"content":"Olá"}}]}`)
	if len(got) != 1 || got[0] != "Olá" {
		t.Fatalf("got %#v", got)
	}
}

func TestStreamDeltasIgnoresNoise(t *testing.T) {
	if got := streamDeltas(`{"id":"chatcmpl"}`); len(got) != 0 {
		t.Fatalf("got %#v", got)
	}
}

func TestMapOpenAIError(t *testing.T) {
	if mapOpenAIError(401, []byte(`{"error":{"message":"Incorrect API key"}}`)) != ErrAuth {
		t.Fatal("401")
	}
	if mapOpenAIError(429, []byte(`{"error":{"code":"insufficient_quota"}}`)) != ErrQuota {
		t.Fatal("429")
	}
	if mapOpenAIError(404, []byte(`{"error":{"message":"model not found"}}`)) != ErrModel {
		t.Fatal("404")
	}
}

func TestSanitizeSecret(t *testing.T) {
	if got := sanitizeSecret(" \"sk-test\" \n"); got != "sk-test" {
		t.Fatalf("got %q", got)
	}
}
