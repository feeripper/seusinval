package forecast

import (
	"math"
	"strings"
)

const (
	Alpha = 0.45
	Beta  = 0.25
	Z80   = 1.2815515655446004
	MethodHolt = "holt-linear"
)

var HistoryMonths = []string{
	"Mar/25", "Abr/25", "Mai/25", "Jun/25", "Jul/25", "Ago/25",
	"Set/25", "Out/25", "Nov/25", "Dez/25", "Jan/26", "Fev/26",
	"Mar/26", "Abr/26", "Mai/26", "Jun/26", "Jul/26", "Ago/26",
}

var HorizonMonths = []string{"Set/26", "Out/26", "Nov/26"}

type Point struct {
	Month string  `json:"month"`
	Value float64 `json:"value"`
	Low   float64 `json:"low"`
	High  float64 `json:"high"`
}

type Result struct {
	Method       string   `json:"method"`
	MethodLabel  string   `json:"methodLabel"`
	Points       []Point  `json:"points"`
	Trend        string   `json:"trend"`
	Slope        float64  `json:"slope"`
	RMSE         float64  `json:"rmse"`
	Confidence   string   `json:"confidence"`
	RecordsUsed  int      `json:"recordsUsed"`
	Variables    []string `json:"variables"`
	Limitations  []string `json:"limitations"`
	Explanation  string   `json:"explanation"`
}

func Holt(history []float64) (level, trend float64, fitted []float64) {
	n := len(history)
	if n == 0 {
		return 0, 0, nil
	}
	if n == 1 {
		return history[0], 0, []float64{history[0]}
	}
	level = history[0]
	trend = history[1] - history[0]
	fitted = append(fitted, level)
	for t := 1; t < n; t++ {
		prev := level
		level = Alpha*history[t] + (1-Alpha)*(level+trend)
		trend = Beta*(level-prev) + (1-Beta)*trend
		fitted = append(fitted, level)
	}
	return level, trend, fitted
}

func Clamp(value float64, unit, direction string) float64 {
	if unit == "%" {
		return math.Max(0, math.Min(100, value))
	}
	return math.Max(0, value)
}

func Series(history []float64, unit, direction string) Result {
	series := make([]float64, 0, len(history))
	for _, v := range history {
		if !math.IsNaN(v) && !math.IsInf(v, 0) {
			series = append(series, v)
		}
	}
	level, trend, fitted := Holt(series)
	start := 0
	if len(series) > 1 {
		start = 1
	}
	var sse float64
	for i := start; i < len(series); i++ {
		d := series[i] - fitted[i]
		sse += d * d
	}
	denom := float64(len(series) - start)
	if denom < 1 {
		denom = 1
	}
	rmse := math.Sqrt(sse / denom)
	points := make([]Point, 0, len(HorizonMonths))
	minBand := 0.1
	if unit == "%" {
		minBand = 0.4
	}
	for h, month := range HorizonMonths {
		raw := level + float64(h+1)*trend
		value := round1(Clamp(raw, unit, direction))
		band := round1(math.Max(minBand, rmse*Z80))
		points = append(points, Point{
			Month: month,
			Value: value,
			Low:   round1(Clamp(value-band, unit, direction)),
			High:  round1(Clamp(value+band, unit, direction)),
		})
	}
	trendLabel := "estável"
	if math.Abs(trend) >= 0.15 {
		if trend > 0 {
			trendLabel = "alta"
		} else {
			trendLabel = "queda"
		}
	}
	span := 1.0
	if len(series) > 0 {
		lo, hi := series[0], series[0]
		for _, v := range series {
			if v < lo {
				lo = v
			}
			if v > hi {
				hi = v
			}
		}
		if hi-lo > span {
			span = hi - lo
		}
	}
	rel := rmse / span
	conf := "baixa"
	if rel < 0.08 {
		conf = "alta"
	} else if rel < 0.18 {
		conf = "média"
	}
	next := 0.0
	if len(points) > 0 {
		next = points[0].Value
	}
	label := "Suavização exponencial de Holt (tendência linear)"
	var b strings.Builder
	b.WriteString("Método: ")
	b.WriteString(label)
	b.WriteString(", com α=0.45 (nível) e β=0.25 (tendência). Usa os ")
	b.WriteString(itoa(len(series)))
	b.WriteString(" pontos mensais mais recentes. Não há aleatoriedade: o mesmo histórico produz o mesmo resultado. Tendência ")
	b.WriteString(trendLabel)
	b.WriteString(" de ")
	b.WriteString(ftoa(round1(trend)))
	b.WriteString(" por mês. Próximo ponto: ")
	b.WriteString(ftoa(next))
	b.WriteString(". Faixa de 80% aproximada por ±1,28 × RMSE in-sample (")
	b.WriteString(ftoa(round1(rmse)))
	b.WriteString("). Confiança ")
	b.WriteString(conf)
	b.WriteString(".")
	return Result{
		Method:      MethodHolt,
		MethodLabel: label,
		Points:      points,
		Trend:       trendLabel,
		Slope:       round1(trend),
		RMSE:        round1(rmse),
		Confidence:  conf,
		RecordsUsed: len(series),
		Variables:   []string{"histórico mensal do próprio indicador", "nível suavizado", "tendência linear"},
		Limitations: []string{
			"Série demonstrativa, sem sazonalidade explícita nem variáveis exógenas.",
			"A faixa de confiança é in-sample e subestima quebras de regime.",
			"Não é parecer de conformidade nem modelo preditivo validado.",
		},
		Explanation: b.String(),
	}
}

func round1(n float64) float64 { return math.Round(n*10) / 10 }

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [16]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

func ftoa(n float64) string {
	neg := n < 0
	if neg {
		n = -n
	}
	v := int(math.Round(n * 10))
	ip, fp := v/10, v%10
	s := itoa(ip) + "." + string(rune('0'+fp))
	if neg {
		return "-" + s
	}
	return s
}
