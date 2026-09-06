package ai

import (
	"strings"
	"unicode"
)

func normalize(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range strings.ToLower(s) {
		switch r {
		case 'á', 'à', 'ã', 'â':
			b.WriteRune('a')
		case 'é', 'ê':
			b.WriteRune('e')
		case 'í':
			b.WriteRune('i')
		case 'ó', 'ô', 'õ':
			b.WriteRune('o')
		case 'ú', 'ü':
			b.WriteRune('u')
		case 'ç':
			b.WriteRune('c')
		default:
			if unicode.IsLetter(r) || unicode.IsSpace(r) || unicode.IsDigit(r) {
				b.WriteRune(r)
			}
		}
	}
	return b.String()
}

func hasAny(q string, terms ...string) bool {
	for _, t := range terms {
		if strings.Contains(q, t) {
			return true
		}
	}
	return false
}

// Route escolhe o agente. Se o usuário selecionou um especialista, a seleção é respeitada.
// Com Seu Sinval, identifica o assunto e encaminha apenas ao especialista necessário.
func Route(selected AgentID, question, page, domain, indicatorID string) AgentID {
	if selected == AgentAurora || selected == AgentOctave || selected == AgentSherlock {
		return selected
	}
	q := normalize(question + " " + page + " " + domain + " " + indicatorID)
	ai := hasAny(q, "risco de ia", "riscos de ia", "vies", "vieses", "alucin", "modelo", "prompt injection", "nist", "iso 42001", "iso/iec 42001", "explicabil", "ia generativa", "inteligencia artificial", "monitoramento de modelo")
	prot := hasAny(q, "protecao", "criptograf", "acesso privilegi", "incidente", "iam", "segregacao", "mascaramento", "classificacao de dados", "retencao", "backup", "fornecedor")
	priv := hasAny(q, "privacidade", "lgpd", "titular", "consentimento", "base legal", "ripd", "dpia", "compartilhamento", "privacy by design", "inventario")
	count := 0
	if ai {
		count++
	}
	if prot {
		count++
	}
	if priv {
		count++
	}
	if count > 1 {
		return AgentSinval
	}
	if ai {
		return AgentAurora
	}
	if prot {
		return AgentOctave
	}
	if priv {
		return AgentSherlock
	}
	switch {
	case strings.Contains(q, "riscos de ia"), strings.Contains(q, "risco de ia"):
		return AgentAurora
	case strings.Contains(q, "protecao de dados"):
		return AgentOctave
	case strings.Contains(q, "privacidade"):
		return AgentSherlock
	}
	return AgentSinval
}

func SuggestedActions(id AgentID) []string {
	switch id {
	case AgentAurora:
		return []string{"Ver riscos relacionados", "Criar plano de mitigação"}
	case AgentOctave:
		return []string{"Revisar controles técnicos", "Abrir acompanhamento de incidente"}
	case AgentSherlock:
		return []string{"Ver direitos dos titulares", "Avaliar necessidade de RIPD"}
	default:
		return []string{"Ver indicadores em atenção", "Perguntar a um especialista"}
	}
}
