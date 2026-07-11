import "./style.css";

const LANG_STORAGE_KEY = "mars.language";
const ARES_CALENDAR_EPOCH_UTC = Date.UTC(2026, 5, 26, 16, 0, 0);
const MARS_SOL_MILLISECONDS = 88775.244 * 1000;
const ARES_CALENDAR_BASE_YEAR = 2050;
const ARES_CALENDAR_BASE_SOL = 30;
const ARES_SOLS_PER_YEAR = 669;

const enterButton = document.querySelector<HTMLButtonElement>("#enter-base");
const storyButton = document.querySelector<HTMLButtonElement>("#story-summary");
const languageButton = document.querySelector<HTMLButtonElement>("#language-toggle");
const visitorCounter = document.querySelector<HTMLElement>("#visitor-counter");
const visitorCount = document.querySelector<HTMLElement>("#visitor-count");
let runtimeLoaded = false;
let runtimeLoading: Promise<typeof import("./main")> | null = null;

applyBootstrapLanguage(readLanguage());
updateTitleDate();
void reportVisitorStats();

enterButton?.addEventListener("click", handleEnter);
storyButton?.addEventListener("click", handleStory);
languageButton?.addEventListener("click", handleLanguage);
window.addEventListener("keydown", handleTitleKey);

// Keep the first paint lightweight, then restore the original animated Mars
// title scene as soon as the browser is idle. The game remains lazy from the
// network's point of view, while the landing page regains its moving planet,
// orbiting objects, and spatial depth instead of staying a flat poster.
const scheduleTitleScene = () => {
  const idle = (window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (idle) {
    idle(() => { void loadRuntime(false); }, { timeout: 900 });
  } else {
    window.setTimeout(() => { void loadRuntime(false); }, 320);
  }
};
scheduleTitleScene();

async function handleEnter(event: Event) {
  if (runtimeLoaded) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const module = await loadRuntime();
  module.startGame();
}

function handleStory(event: Event) {
  if (runtimeLoaded) return;
  event.preventDefault();
  window.location.href = `/story-overview.html?lang=${encodeURIComponent(readLanguage())}`;
}

function handleLanguage(event: Event) {
  if (runtimeLoaded) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const next = readLanguage() === "zh-CN" ? "en-US" : "zh-CN";
  localStorage.setItem(LANG_STORAGE_KEY, next);
  applyBootstrapLanguage(next);
  updateTitleDate();
}

function handleTitleKey(event: KeyboardEvent) {
  if (runtimeLoaded || document.body.classList.contains("is-playing")) return;
  if (event.code === "KeyE" || event.code === "Enter" || event.code === "NumpadEnter") {
    event.preventDefault();
    void handleEnter(event);
  } else if (event.code === "KeyQ") {
    event.preventDefault();
    handleStory(event);
  }
}

async function loadRuntime(showLoading = true) {
  if (runtimeLoading) return runtimeLoading;
  if (showLoading) {
    document.body.classList.add("runtime-loading");
    enterButton?.setAttribute("aria-busy", "true");
  }
  runtimeLoading = import("./main").then((module) => {
    runtimeLoaded = true;
    document.body.classList.remove("runtime-loading");
    document.body.classList.add("runtime-ready");
    enterButton?.removeAttribute("aria-busy");
    return module;
  });
  return runtimeLoading;
}

function readLanguage() {
  return localStorage.getItem(LANG_STORAGE_KEY) === "en-US" ? "en-US" : "zh-CN";
}

function applyBootstrapLanguage(language: "zh-CN" | "en-US") {
  document.documentElement.lang = language;
  const text: Record<string, [string, string]> = {
    "title.name": ["火星先遣队", "Mars Advance Team"],
    "title.subtitle": ["第一位人类", "The First Human"],
    "title.text": ["终于，火星基地迎来了第一位人类居民。", "At last, the Mars base welcomes its first human resident."],
    "title.updateHeading": ["7-11 更新内容", "7-11 UPDATE"],
    "title.update.flight": ["穿越虫洞可以获得 X 飞行战机进行空战，守卫火星基地。", "Cross the wormhole to unlock an X-wing fighter and defend the Mars base in aerial combat."],
    "title.update.mech": ["体验驾驶超大四足机甲步行战车行走在火星上。", "Take the controls of a colossal four-legged mech walker and cross the surface of Mars."],
    "title.enter": ["进入基地", "Enter Base"],
    "title.story": ["故事概要", "Story Brief"],
  };
  for (const [key, values] of Object.entries(text)) {
    const node = document.querySelector<HTMLElement>(`[data-i18n="${key}"]`);
    if (node) node.textContent = values[language === "zh-CN" ? 0 : 1];
  }
  if (languageButton) {
    languageButton.dataset.flag = language === "zh-CN" ? "us" : "cn";
    languageButton.setAttribute("aria-label", language === "zh-CN" ? "Switch to English" : "切换到中文");
  }
}

function updateTitleDate() {
  const absoluteSol = ARES_CALENDAR_BASE_SOL + Math.floor((Date.now() - ARES_CALENDAR_EPOCH_UTC) / MARS_SOL_MILLISECONDS);
  const zeroBasedSol = Math.max(0, absoluteSol - 1);
  const year = ARES_CALENDAR_BASE_YEAR + Math.floor(zeroBasedSol / ARES_SOLS_PER_YEAR);
  const sol = (zeroBasedSol % ARES_SOLS_PER_YEAR) + 1;
  const node = document.querySelector<HTMLElement>("[data-i18n='title.eyebrow']");
  if (node) node.textContent = readLanguage() === "zh-CN" ? `${year} 年 / 第 ${sol} 火星日` : `Year ${year} / Sol ${sol}`;
}

async function reportVisitorStats() {
  try {
    const response = await fetch("/api/visitors", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", keepalive: true });
    if (!response.ok) return setVisitorCount(0, "unavailable");
    const payload = (await response.json()) as { total?: unknown };
    setVisitorCount(typeof payload.total === "number" ? payload.total : 0, "ready");
  } catch {
    setVisitorCount(0, "unavailable");
  }
}

function setVisitorCount(total: number, status: string) {
  if (visitorCounter) visitorCounter.dataset.status = status;
  if (!visitorCount) return;
  const value = String(Math.min(9999, Math.max(0, Math.floor(total)))).padStart(4, "0");
  visitorCount.replaceChildren(...value.split("").map((digit) => {
    const span = document.createElement("span");
    span.className = "visitor-digit";
    span.textContent = digit;
    return span;
  }));
}
