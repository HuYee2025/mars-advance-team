import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const strict = process.argv.includes("--strict");
const updateBaseline = process.argv.includes("--update-baseline");
const baselinePath = join(root, "scripts/i18n-audit-baseline.json");
const sourceFiles = collectFiles(["src", "index.html"], [".ts", ".html"]);
const main = readFileSync(join(root, "src/main.ts"), "utf8");
const html = readFileSync(join(root, "index.html"), "utf8");

const zhI18n = extractRecord(main, '"zh-CN": {', '\n  "en-US": {');
const enI18n = extractRecord(main, '"en-US": {', '\n};\n\nconst exactEnglishTexts');
const exactEnglishTexts = extractRecord(main, "const exactEnglishTexts: Record<string, string> = {", "\n};\n\nconst englishPhrasePairs");
const phraseSources = extractPhraseSources(main);
const i18nKeys = extractHtmlI18nKeys(html);

const errors = [];
const warnings = [];

for (const key of i18nKeys) {
  if (!zhI18n.has(key)) errors.push(`index.html 使用了 data-i18n key "${key}"，但 zh-CN 表缺失。`);
  if (!enI18n.has(key)) errors.push(`index.html 使用了 data-i18n key "${key}"，但 en-US 表缺失。`);
}

for (const key of zhI18n.keys()) {
  if (!enI18n.has(key)) errors.push(`i18n key "${key}" 只有 zh-CN，没有 en-US。`);
}
for (const key of enI18n.keys()) {
  if (!zhI18n.has(key)) errors.push(`i18n key "${key}" 只有 en-US，没有 zh-CN。`);
}

const knownChinese = new Set([...zhI18n.values(), ...exactEnglishTexts.keys(), ...phraseSources]);
const baseline = readBaseline();
const suspectedAll = collectChineseStrings(sourceFiles)
  .filter((item) => !knownChinese.has(item.text))
  .filter((item) => !isIgnoredChineseString(item.text));
const suspected = suspectedAll.filter((item) => !baseline.has(item.text));

if (updateBaseline) {
  writeBaseline(suspectedAll);
  console.log(`i18n audit baseline updated: ${baselinePath}`);
  process.exit(0);
}

for (const item of suspected.slice(0, 80)) {
  warnings.push(`${item.file}:${item.line} 可能需要英文翻译或词表覆盖：${item.text}`);
}
if (suspected.length > 80) warnings.push(`还有 ${suspected.length - 80} 条中文字符串未显示，请先处理前 80 条。`);

if (errors.length === 0 && warnings.length === 0) {
  console.log("i18n audit passed: 没有发现翻译缺口。");
  process.exit(0);
}

if (errors.length) {
  console.error("i18n audit errors:");
  for (const error of errors) console.error(`- ${error}`);
}

if (warnings.length) {
  console.warn(errors.length ? "\ni18n audit warnings:" : "i18n audit warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length || (strict && warnings.length)) process.exit(1);
console.log("\n提示：当前为非 strict 模式，warnings 只提醒不阻断构建。需要阻断时运行 pnpm i18n:audit:strict。");

function collectFiles(entries, extensions) {
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files, extensions);
    else if (extensions.includes(extname(path))) files.push(path);
  }
  return files;
}

function walk(dir, files, extensions) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files, extensions);
    else if (extensions.includes(extname(path))) files.push(path);
  }
}

function extractRecord(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  const record = new Map();
  if (start < 0 || end < 0) return record;
  const block = source.slice(start + startMarker.length, end);
  const entryPattern = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let match;
  while ((match = entryPattern.exec(block))) {
    record.set(unescapeString(match[1]), unescapeString(match[2]));
  }
  return record;
}

function extractPhraseSources(source) {
  const start = source.indexOf("const englishPhrasePairs");
  const end = source.indexOf("];", start);
  if (start < 0 || end < 0) return [];
  const block = source.slice(start, end);
  const sources = [];
  const pattern = /\[\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*\]/g;
  let match;
  while ((match = pattern.exec(block))) sources.push(unescapeString(match[1]));
  return sources;
}

function extractHtmlI18nKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/data-i18n="([^"]+)"/g)) keys.add(match[1]);
  for (const match of source.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of match[1].split(",")) {
      const [, key] = pair.split(":");
      if (key) keys.add(key);
    }
  }
  return keys;
}

function collectChineseStrings(files) {
  const items = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const relativeFile = relative(root, file);
    const pattern = /(["'`])((?:\\.|(?!\1)[\s\S])*[\u3400-\u9fff][\s\S]*?)\1/g;
    let match;
    while ((match = pattern.exec(source))) {
      const text = unescapeString(match[2]).trim();
      if (!text || text.length > 180 || text.includes("\n")) continue;
      items.push({ file: relativeFile, line: lineNumberAt(source, match.index), text });
    }
  }
  return items;
}

function isIgnoredChineseString(text) {
  return (
    text.startsWith("#") ||
    text.startsWith(".") ||
    text.startsWith("http") ||
    text.includes("data-i18n") ||
    text.includes("zh-CN") ||
    /^[\u3400-\u9fff]$/.test(text)
  );
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function unescapeString(value) {
  return value.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, "\n").replace(/\\`/g, "`");
}

function readBaseline() {
  if (!existsSync(baselinePath)) return new Set();
  const data = JSON.parse(readFileSync(baselinePath, "utf8"));
  if (!Array.isArray(data.knownChineseStrings)) return new Set();
  return new Set(data.knownChineseStrings);
}

function writeBaseline(items) {
  const knownChineseStrings = [...new Set(items.map((item) => item.text))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const payload = {
    note: "当前已知的中文源文本基线。新增内容若未进入 i18n、exactEnglishTexts 或 englishPhrasePairs，会在 pnpm i18n:audit 中显示。",
    knownChineseStrings,
  };
  writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`);
}
