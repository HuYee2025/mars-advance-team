export const QUALITY_PROFILES = {
  high: {
    pixelRatioLimit: 1.25,
    shadowMapSize: 2048,
    shadowDistance: 150,
    interfaceIntervalMs: 100,
    particleScale: 1,
    lodBias: 1,
    dynamicLightLimit: 8,
    visibleDistance: 430,
    shadowsEnabled: true,
  },
  balanced: {
    pixelRatioLimit: 1.1,
    shadowMapSize: 1536,
    shadowDistance: 116,
    interfaceIntervalMs: 133,
    particleScale: 0.72,
    lodBias: 0.78,
    dynamicLightLimit: 5,
    visibleDistance: 76,
    shadowsEnabled: false,
  },
  low: {
    pixelRatioLimit: 1,
    shadowMapSize: 1024,
    shadowDistance: 84,
    interfaceIntervalMs: 166,
    particleScale: 0.48,
    lodBias: 0.58,
    dynamicLightLimit: 3,
    visibleDistance: 56,
    shadowsEnabled: false,
  },
} as const;

export type QualityTier = keyof typeof QUALITY_PROFILES;
export type QualityProfile = (typeof QUALITY_PROFILES)[QualityTier];
export const QUALITY_TIER_ORDER: QualityTier[] = ["high", "balanced", "low"];
