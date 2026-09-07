import assert from "node:assert/strict";
import test, { after } from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

test("sidebar exposes a working Governança control", async () => {
  const source = await readFile(path.join(root, "components/governance/app-sidebar.tsx"), "utf8");
  assert.match(source, /go\('Governança'\)/);
  assert.match(source, /label="Visão geral"/);
  assert.match(source, /Ir para Governança de dados e IA/);
  assert.match(source, /Seu Sinval/);
});

test("page breadcrumb navigates to Governança", async () => {
  const source = await readFile(path.join(root, "app/page.tsx"), "utf8");
  assert.match(source, /navigate\('Governança'\)/);
  assert.match(source, /onAgentChange=\{setAgentId\}/);
  assert.match(source, /onClear=\{clearChat\}/);
  assert.match(source, /FloatingChat/);
  assert.match(source, /AgentsGallery/);
});

test("chat lists the four bots and can clear history", async () => {
  const { AGENTS, DISCLAIMER, agentById } = await vite.ssrLoadModule("/lib/agents.ts");
  assert.deepEqual(AGENTS.map(a => a.id), ["sinval", "aurora", "octave", "sherlock"]);
  assert.match(DISCLAIMER, /As respostas são orientativas/);
  assert.equal(AGENTS[0].avatar, "/images/agents/seu-sinval.png");
  assert.match(agentById("sinval").greeting, /Olá! Sou o Seu Sinval/);
  const source = await readFile(path.join(root, "components/governance/floating-chat.tsx"), "utf8");
  assert.match(source, /Escolher assistente/);
  assert.match(source, /Limpar conversa/);
  assert.match(source, /\{DISCLAIMER\}/);
  assert.match(source, /onAgentChange/);
  assert.match(source, /idx === messages.length - 1/);
  assert.match(source, /agent\.greeting/);
});

test("domain cards, KPIs and table rows are actionable", async () => {
  const cards = await readFile(path.join(root, "components/governance/domain-cards.tsx"), "utf8");
  assert.match(cards, /onClick=\{\(\) => onOpen\(domain\)\}/);
  assert.match(cards, /Explorar domínio/);
  const kpi = await readFile(path.join(root, "components/governance/kpi-card.tsx"), "utf8");
  assert.match(kpi, /cta && onCta && 'surface-hover'/);
  const page = await readFile(path.join(root, "app/page.tsx"), "utf8");
  assert.match(page, /onOpen=\{d => navigate\(d\)\}/);
  assert.match(page, /navigate\('Central de alertas', 'Crítico'\)/);
  const table = await readFile(path.join(root, "components/governance/indicator-table.tsx"), "utf8");
  assert.match(table, /onClick=\{\(\) => onSelect\(i\)\}/);
});

test("frontend never ships an OpenAI key", async () => {
  const files = [
    "app/api/chat/route.ts",
    "app/api/agents/route.ts",
    "lib/go-proxy.ts",
    "lib/agents.ts",
    "app/page.tsx",
  ];
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /sk-[A-Za-z0-9]/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_OPENAI/);
    assert.doesNotMatch(source, /VITE_OPENAI/);
  }
});

test("frontend chat route never embeds an OpenAI key", async () => {
  const source = await readFile(path.join(root, "app/api/chat/route.ts"), "utf8");
  assert.doesNotMatch(source, /OPENAI_API_KEY/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_/);
  assert.match(source, /goBase/);
  assert.match(source, /simulatedReply/);
});

test("specialist gallery and avatars exist", async () => {
  const gallery = await readFile(path.join(root, "components/governance/agents-gallery.tsx"), "utf8");
  assert.match(gallery, /Agentes especialistas/);
  assert.match(gallery, /Conversar com agente/);
  const files = ["seu-sinval.png", "aurora.png", "octave.png", "sherlock.png"];
  for (const file of files) {
    const buf = await readFile(path.join(root, "public/images/agents", file));
    assert.ok(buf.length > 1000, file);
  }
});

test("forecast explainer and theme toggle exist", async () => {
  const explainer = await readFile(path.join(root, "components/governance/forecast-explainer.tsx"), "utf8");
  assert.match(explainer, /Como esta previsão foi calculada/);
  assert.match(explainer, /methodLabel/);
  const toggle = await readFile(path.join(root, "components/theme-toggle.tsx"), "utf8");
  assert.match(toggle, /setTheme/);
  const page = await readFile(path.join(root, "app/page.tsx"), "utf8");
  assert.match(page, /ThemeToggle/);
  const data = JSON.parse(await readFile(path.join(root, "backend/indicators.json"), "utf8"));
  assert.equal(data.length, 22);
  assert.equal(data[0].history.length, 18);
});

test("status filter and clear-filter controls exist", async () => {
  const table = await readFile(path.join(root, "components/governance/indicator-table.tsx"), "utf8");
  assert.match(table, /Limpar filtro/);
  assert.match(table, /onFilter/);
  const alerts = await readFile(path.join(root, "components/governance/alert-list.tsx"), "utf8");
  assert.match(alerts, /Limpar filtro/);
});
