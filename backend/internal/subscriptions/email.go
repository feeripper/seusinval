package subscriptions

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// Sender é a interface desacoplada para provedores de e-mail (AWS SES, Resend, SendGrid, SMTP etc).
type Sender interface {
	Send(ctx context.Context, to, subject, htmlBody string) error
}

// MockSender simula envio e registra as chamadas em memória.
type MockSender struct {
	Sent []SentRecord
}

type SentRecord struct {
	To      string
	Subject string
	Body    string
	At      time.Time
}

func (m *MockSender) Send(ctx context.Context, to, subject, htmlBody string) error {
	if m.Sent == nil {
		m.Sent = make([]SentRecord, 0)
	}
	m.Sent = append(m.Sent, SentRecord{To: to, Subject: subject, Body: htmlBody, At: time.Now().UTC()})
	return nil
}

// RenderBody gera um template responsivo e corporativo com resumo de mudança e link para o indicador.
func RenderBody(indicatorID, indicatorName, domain, oldValue, newValue, criticality, reason, portalURL, unsubscribeURL string) string {
	if oldValue == "" {
		oldValue = "—"
	}
	if newValue == "" {
		newValue = "—"
	}
	if portalURL == "" {
		portalURL = "https://seu-sinval.app"
	}
	if unsubscribeURL == "" {
		unsubscribeURL = portalURL + "/unsubscribe"
	}

	var critColor string
	switch strings.ToLower(criticality) {
	case "crítico", "critico":
		critColor = "#b3261e"
	case "atenção", "atencao":
		critColor = "#8a5b00"
	default:
		critColor = "#1b7a4f"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Atualização de indicador - Seu Sinval</title>
<style>
body{margin:0;padding:0;font-family:Inter,Segoe UI,system-ui,Arial,sans-serif;background:#f7f8fa;color:#141b26;}
.container{max-width:600px;margin:24px auto;background:#ffffff;border:1px solid #e3e6eb;border-radius:16px;overflow:hidden;}
.header{background:#08244a;padding:32px 24px;color:#ffffff;text-align:left;}
.header h1{margin:0;font-size:20px;font-weight:600;}
.header p{margin:8px 0 0;color:#c5d5ee;font-size:14px;}
.body{padding:28px 24px;}
.row{display:flex;gap:16px;margin:16px 0;}
.box{flex:1;background:#f7f8fa;border-radius:12px;padding:16px;}
.box-label{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#737d8b;margin-bottom:6px;}
.box-value{font-size:18px;font-weight:700;}
.criticality{display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;color:#ffffff;background:%s;}
.cta{display:inline-block;margin-top:24px;padding:12px 24px;background:#08244a;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;}
.footer{padding:20px 24px;background:#f7f8fa;font-size:12px;color:#737d8b;line-height:1.6;}
.footer a{color:#1754a1;}
@media (prefers-color-scheme: dark){body{background:#0b1118;color:#f7f8fa;}.container{background:#121a26;border-color:#273344;}.box{background:#1a2433;}.footer{background:#0e1520;color:#a3abb7;}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Seu Sinval</h1>
    <p>Governança de dados e IA</p>
  </div>
  <div class="body">
    <h2 style="margin-top:0;font-size:18px;">Atualização do indicador: %s</h2>
    <p style="color:#525d6c;font-size:14px;">%s</p>
    <div class="row">
      <div class="box">
        <div class="box-label">Valor anterior</div>
        <div class="box-value">%s</div>
      </div>
      <div class="box">
        <div class="box-label">Valor atual</div>
        <div class="box-value">%s</div>
      </div>
    </div>
    <div class="row">
      <div class="box" style="flex:0.4;">
        <div class="box-label">Criticidade</div>
        <span class="criticality">%s</span>
      </div>
      <div class="box" style="flex:0.6;">
        <div class="box-label">Domínio</div>
        <div class="box-value" style="font-size:16px;">%s</div>
      </div>
    </div>
    <a class="cta" href="%s/indicador/%s">Abrir no portal</a>
  </div>
  <div class="footer">
    Você está recebendo esta notificação porque assinou atualizações deste indicador.<br>
    <a href="%s">Descadastrar com um clique</a> · Seu Sinval · Governança de dados e IA
  </div>
</div>
</body>
</html>`,
		critColor,
		htmlEscape(indicatorName),
		htmlEscape(reason),
		htmlEscape(oldValue),
		htmlEscape(newValue),
		htmlEscape(criticality),
		htmlEscape(domain),
		htmlEscape(portalURL),
		htmlEscape(indicatorID),
		htmlEscape(unsubscribeURL),
	)
}

func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	return s
}
