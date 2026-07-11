export const SPIDER_MAX_HEALTH = 100;
export const SPIDER_BLADE_DAMAGE = 25;
export const SPIDER_BLADE_RANGE = 8.6;
export const SPIDER_BLADE_FORWARD_DOT = 0.18;
export const SPIDER_BLADE_COOLDOWN_SECONDS = 0.28;

export function applySpiderBladeDamage(currentHealth: number, damage = SPIDER_BLADE_DAMAGE) {
  const health = Math.max(0, Math.min(SPIDER_MAX_HEALTH, currentHealth) - Math.max(0, damage));
  return { health, defeated: health <= 0 };
}
