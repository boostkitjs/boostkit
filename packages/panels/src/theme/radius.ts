import type { RadiusPreset } from './types.js'

/** Maps radius preset names to CSS values. */
export const radiusMap: Record<RadiusPreset, string> = {
  none:    '0px',
  small:   '0.25rem',
  default: '0.5rem',
  medium:  '0.625rem',
  large:   '0.75rem',
}
