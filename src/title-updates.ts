export type TitleUpdate = {
  date: string;
  dateZh: string;
  dateEn: string;
  number: string;
  zh: string;
  en: string;
};

/**
 * 首页展示用的玩法更新清单。
 * 只需要在这里追加新条目，首页会自动按日期取最近三条并更新标题。
 */
export const TITLE_UPDATES: readonly TitleUpdate[] = [
  {
    date: "2026-07-11",
    dateZh: "7月11日",
    dateEn: "JUL 11",
    number: "01",
    zh: "穿越虫洞可以获得 X 飞行战机进行空战，守卫火星基地。",
    en: "Cross the wormhole to unlock an X-wing fighter and defend the Mars base in aerial combat.",
  },
  {
    date: "2026-07-11",
    dateZh: "7月11日",
    dateEn: "JUL 11",
    number: "02",
    zh: "体验驾驶超大四足机甲步行战车行走在火星上。",
    en: "Take the controls of a colossal four-legged mech walker and cross the surface of Mars.",
  },
  {
    date: "2026-07-20",
    dateZh: "7月20日",
    dateEn: "JUL 20",
    number: "03",
    zh: "驾驶 Cybertruck 在火星上奔驰。",
    en: "Drive a Cybertruck across the surface of Mars.",
  },
];

export function getRecentTitleUpdates(limit = 3) {
  return [...TITLE_UPDATES]
    .sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number))
    .slice(-Math.max(0, limit));
}

