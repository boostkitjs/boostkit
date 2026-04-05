import type { AccentColor, PresetDefinition } from './types.js'

/**
 * Accent color overrides — each defines primary, primary-foreground, ring,
 * and sidebar-primary variables for light and dark modes.
 */

function accent(lightPrimary: string, lightFg: string, darkPrimary: string, darkFg: string): PresetDefinition {
  return {
    light: {
      '--primary':                      lightPrimary,
      '--primary-foreground':           lightFg,
      '--ring':                         lightPrimary,
      '--sidebar-primary':              lightPrimary,
      '--sidebar-primary-foreground':   lightFg,
      '--sidebar-ring':                 lightPrimary,
    },
    dark: {
      '--primary':                      darkPrimary,
      '--primary-foreground':           darkFg,
      '--ring':                         darkPrimary,
      '--sidebar-primary':              darkPrimary,
      '--sidebar-primary-foreground':   darkFg,
      '--sidebar-ring':                 darkPrimary,
    },
  }
}

export const accentColors: Record<AccentColor, PresetDefinition> = {
  blue:    accent('oklch(0.488 0.243 264)',  'oklch(0.985 0 0)', 'oklch(0.707 0.165 254)',  'oklch(0.145 0 0)'),
  red:     accent('oklch(0.505 0.213 27)',   'oklch(0.985 0 0)', 'oklch(0.704 0.191 22)',   'oklch(0.145 0 0)'),
  green:   accent('oklch(0.517 0.174 149)',  'oklch(0.985 0 0)', 'oklch(0.696 0.17 150)',   'oklch(0.145 0 0)'),
  amber:   accent('oklch(0.666 0.179 58)',   'oklch(0.145 0 0)', 'oklch(0.82 0.16 84)',     'oklch(0.145 0 0)'),
  orange:  accent('oklch(0.601 0.206 50)',   'oklch(0.985 0 0)', 'oklch(0.76 0.17 55)',     'oklch(0.145 0 0)'),
  cyan:    accent('oklch(0.55 0.135 200)',   'oklch(0.985 0 0)', 'oklch(0.75 0.12 200)',    'oklch(0.145 0 0)'),
  violet:  accent('oklch(0.488 0.205 277)',  'oklch(0.985 0 0)', 'oklch(0.72 0.15 280)',    'oklch(0.145 0 0)'),
  purple:  accent('oklch(0.496 0.22 292)',   'oklch(0.985 0 0)', 'oklch(0.71 0.17 295)',    'oklch(0.145 0 0)'),
  pink:    accent('oklch(0.564 0.2 350)',    'oklch(0.985 0 0)', 'oklch(0.74 0.16 350)',    'oklch(0.145 0 0)'),
  rose:    accent('oklch(0.514 0.222 16)',   'oklch(0.985 0 0)', 'oklch(0.72 0.19 15)',     'oklch(0.145 0 0)'),
  emerald: accent('oklch(0.532 0.157 163)',  'oklch(0.985 0 0)', 'oklch(0.71 0.154 163)',   'oklch(0.145 0 0)'),
  teal:    accent('oklch(0.528 0.121 186)',  'oklch(0.985 0 0)', 'oklch(0.72 0.11 186)',    'oklch(0.145 0 0)'),
  indigo:  accent('oklch(0.457 0.24 277)',   'oklch(0.985 0 0)', 'oklch(0.685 0.17 277)',   'oklch(0.145 0 0)'),
  fuchsia: accent('oklch(0.542 0.238 322)',  'oklch(0.985 0 0)', 'oklch(0.73 0.18 322)',    'oklch(0.145 0 0)'),
  lime:    accent('oklch(0.58 0.2 130)',     'oklch(0.145 0 0)', 'oklch(0.8 0.2 130)',      'oklch(0.145 0 0)'),
  sky:     accent('oklch(0.539 0.158 222)',  'oklch(0.985 0 0)', 'oklch(0.73 0.13 222)',    'oklch(0.145 0 0)'),
}
