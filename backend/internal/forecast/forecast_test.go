package forecast

import "testing"

func TestHoltIsDeterministic(t *testing.T) {
	h := []float64{70, 71, 72, 74, 76, 78, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91}
	a := Series(h, "%", "up")
	b := Series(h, "%", "up")
	if a.Points[0].Value != b.Points[0].Value || a.RMSE != b.RMSE {
		t.Fatal("forecast must be deterministic")
	}
	if a.Method != MethodHolt {
		t.Fatalf("method=%s", a.Method)
	}
	if a.RecordsUsed != 18 {
		t.Fatalf("records=%d", a.RecordsUsed)
	}
	if len(a.Points) != 3 {
		t.Fatalf("horizon=%d", len(a.Points))
	}
}

func TestHoltRespectsPercentBounds(t *testing.T) {
	h := []float64{96, 97, 98, 98.5, 99, 99.2, 99.4, 99.5, 99.6, 99.7, 99.8, 99.8, 99.9, 99.9, 100, 100, 100, 100}
	got := Series(h, "%", "up")
	for _, p := range got.Points {
		if p.Value < 0 || p.Value > 100 || p.High > 100 {
			t.Fatalf("out of bounds %+v", p)
		}
	}
}

func TestHoltDetectsDecline(t *testing.T) {
	h := []float64{95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78}
	got := Series(h, "%", "up")
	if got.Trend != "queda" {
		t.Fatalf("trend=%s", got.Trend)
	}
}
