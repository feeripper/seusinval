import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const data = JSON.parse(await readFile(path.join(root, "backend/indicators.json"), "utf8"));

function status(i) {
  const gap = i.direction === "up" ? i.target - i.value : i.value - i.target;
  return gap <= 0 ? "Na meta" : gap > 10 || i.unit === "" ? "Crítico" : "Atenção";
}

function gapOf(i) {
  return i.direction === "up" ? i.target - i.value : i.value - i.target;
}

test("indicator catalog keeps 22 items with 18-month history", () => {
  assert.equal(data.length, 22);
  assert.equal(data[0].history.length, 18);
  const domains = [...new Set(data.map((i) => i.domain))].sort();
  assert.deepEqual(domains, ["Governança de dados", "Privacidade de dados", "Proteção de dados", "Riscos de IA"]);
});

test("status rules match the documented thresholds", () => {
  const pro002 = data.find((i) => i.id === "PRO-002");
  const prv003 = data.find((i) => i.id === "PRV-003");
  const ia004 = data.find((i) => i.id === "IA-004");
  assert.equal(status(pro002), "Crítico");
  assert.equal(status(ia004), "Crítico");
  assert.equal(status(prv003), "Na meta");
  assert.ok(gapOf(pro002) > 10);
});

test("open items exclude in-target indicators and keep known alerts", () => {
  const open = data.filter((i) => status(i) !== "Na meta").map((i) => i.id);
  assert.ok(open.includes("IA-004"));
  assert.ok(open.includes("PRO-002"));
  assert.ok(!open.includes("PRV-003"));
});

test("presentation source still documents Holt and parseAnswer", async () => {
  const source = await readFile(path.join(root, "lib/presentation.ts"), "utf8");
  assert.match(source, /export function parseAnswer/);
  assert.match(source, /export function trendSeries/);
  assert.match(source, /export function whyText/);
  const forecast = await readFile(path.join(root, "lib/forecast.ts"), "utf8");
  assert.match(forecast, /const ALPHA = 0.45/);
  assert.match(forecast, /const BETA = 0.25/);
  const analyze = await readFile(path.join(root, "lib/indicators.ts"), "utf8");
  assert.match(analyze, /export function analyze/);
  assert.match(analyze, /Projeção Holt para setembro/);
});
