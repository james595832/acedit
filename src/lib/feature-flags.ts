/**
 * Soft-launch focus: interview practice is the paid loop.
 * Paused surfaces stay in the codebase but are hidden from nav / main path.
 */
export const FEATURES = {
  interview: true,
  results: true,
  whiteboard: false,
  portfolio: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}

/** JSON body for paused feature APIs. */
export function featurePausedPayload(feature: 'whiteboard' | 'portfolio') {
  const label = feature === 'whiteboard' ? 'Whiteboard' : 'Portfolio review';
  return {
    error: `${label} is paused while we focus on interview practice. See /roadmap#september-2026.`,
    code: 'FEATURE_PAUSED' as const,
    roadmap: '/roadmap#september-2026',
  };
}
