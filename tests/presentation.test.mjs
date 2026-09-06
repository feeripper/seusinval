import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

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

test("structures the rule-based answer into summary, evidence and disclaimer", async () => {
  const { analyze } = await vite.ssrLoadModule("/lib/indicators.ts");
  const { parseAnswer } = await vite.ssrLoadModule("/lib/presentation.ts");

  const parsed = parseAnswer(analyze("Quais indicadores precisam de atenção e qual a tendência futura?"));

  assert.ok(parsed);
  assert.match(parsed.summary, /^Análise da base demonstrativa/);
  assert.equal(parsed.items.length, 6);
  assert.equal(parsed.items[0].id, "PRO-002");
  assert.equal(parsed.items[0].status, "Crítico");
  assert.equal(parsed.items[0].owner, "Gestão de acessos");
  assert.equal(parsed.items[0].source, "Campanha de recertificação");
  assert.match(parsed.items[0].projection ?? "", /%$/);
  assert.match(parsed.method ?? "", /extrapolação linear/);
  assert.match(parsed.disclaimer ?? "", /^Resposta demonstrativa/);
});

test("falls back to plain text for unstructured answers", async () => {
  const { analyze } = await vite.ssrLoadModule("/lib/indicators.ts");
  const { parseAnswer } = await vite.ssrLoadModule("/lib/presentation.ts");

  assert.equal(parseAnswer(analyze("olá")), null);
  assert.equal(parseAnswer("Serviço indisponível."), null);
});

test("presentation helpers do not change the business rules", async () => {
  const { indicators, status } = await vite.ssrLoadModule("/lib/indicators.ts");
  const { statusOf, openItems, whyText, trendSeries } = await vite.ssrLoadModule("/lib/presentation.ts");

  for (const i of indicators) assert.equal(statusOf(i), status(i));
  assert.deepEqual(openItems(indicators).map((i) => i.id), ["IA-001", "PRO-002", "PRO-003", "PRV-002", "IA-002", "PRV-001"]);
  assert.match(whyText(indicators.find((i) => i.id === "PRO-002")), /13 p\.p\. abaixo da meta de 95%/);

  const series = trendSeries(indicators);
  assert.equal(series.length, 7);
  assert.equal(series[6].projected, true);
  assert.equal(series[6].privacy, null);
  assert.equal(typeof series[6].privacy_p, "number");
});
