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
  assert.ok(parsed.items.length >= 6);
  assert.equal(parsed.items[0].status, "Crítico");
  assert.ok(parsed.items.some((item) => item.id === "IA-004"));
  assert.ok(parsed.items.some((item) => item.id === "PRO-002"));
  assert.match(parsed.items.find((item) => item.id === "IA-004")?.projection ?? "", /%/);
  assert.match(parsed.method ?? "", /Holt/);
  assert.match(parsed.disclaimer ?? "", /^Resposta demonstrativa/);
});

test("falls back to plain text for unstructured answers", async () => {
  const { analyze } = await vite.ssrLoadModule("/lib/indicators.ts");
  const { parseAnswer } = await vite.ssrLoadModule("/lib/presentation.ts");

  assert.equal(parseAnswer(analyze("ola")), null);
  assert.equal(parseAnswer("Servico indisponivel."), null);
});

test("presentation helpers do not change the business rules", async () => {
  const { indicators, status } = await vite.ssrLoadModule("/lib/indicators.ts");
  const { statusOf, openItems, whyText, trendSeries } = await vite.ssrLoadModule("/lib/presentation.ts");

  for (const i of indicators) assert.equal(statusOf(i), status(i));
  const open = openItems(indicators).map((i) => i.id);
  assert.ok(open.includes("IA-004"));
  assert.ok(open.includes("PRO-002"));
  assert.ok(!open.includes("PRV-003"));
  assert.match(whyText(indicators.find((i) => i.id === "PRO-002")), /13 p\.p\. abaixo da meta de 95%/);

  const series = trendSeries(indicators);
  assert.equal(series.length, 15);
  assert.equal(series[11].projected, false);
  assert.equal(series[12].projected, true);
  assert.equal(series[12].privacy, null);
  assert.equal(typeof series[12].privacy_p, "number");
  assert.equal(typeof series[12].gov_p, "number");
});
