import type { ChartPalette, PresetDefinition } from './types.js'

/**
 * Chart color palettes — each defines chart-1 through chart-5 for light and dark modes.
 */

export const chartPalettes: Record<ChartPalette, PresetDefinition> = {
  default: {
    light: {
      '--chart-1': 'oklch(0.809 0.105 251.813)',
      '--chart-2': 'oklch(0.623 0.214 259.815)',
      '--chart-3': 'oklch(0.546 0.245 262.881)',
      '--chart-4': 'oklch(0.488 0.243 264.376)',
      '--chart-5': 'oklch(0.424 0.199 265.638)',
    },
    dark: {
      '--chart-1': 'oklch(0.809 0.105 251.813)',
      '--chart-2': 'oklch(0.623 0.214 259.815)',
      '--chart-3': 'oklch(0.546 0.245 262.881)',
      '--chart-4': 'oklch(0.488 0.243 264.376)',
      '--chart-5': 'oklch(0.424 0.199 265.638)',
    },
  },

  ocean: {
    light: {
      '--chart-1': 'oklch(0.65 0.16 230)',
      '--chart-2': 'oklch(0.55 0.14 210)',
      '--chart-3': 'oklch(0.7 0.12 195)',
      '--chart-4': 'oklch(0.5 0.18 250)',
      '--chart-5': 'oklch(0.6 0.1 185)',
    },
    dark: {
      '--chart-1': 'oklch(0.72 0.14 230)',
      '--chart-2': 'oklch(0.62 0.13 210)',
      '--chart-3': 'oklch(0.75 0.11 195)',
      '--chart-4': 'oklch(0.58 0.16 250)',
      '--chart-5': 'oklch(0.67 0.09 185)',
    },
  },

  sunset: {
    light: {
      '--chart-1': 'oklch(0.65 0.22 25)',
      '--chart-2': 'oklch(0.7 0.18 55)',
      '--chart-3': 'oklch(0.6 0.2 10)',
      '--chart-4': 'oklch(0.75 0.15 75)',
      '--chart-5': 'oklch(0.55 0.18 340)',
    },
    dark: {
      '--chart-1': 'oklch(0.72 0.2 25)',
      '--chart-2': 'oklch(0.76 0.16 55)',
      '--chart-3': 'oklch(0.67 0.18 10)',
      '--chart-4': 'oklch(0.8 0.13 75)',
      '--chart-5': 'oklch(0.62 0.16 340)',
    },
  },

  forest: {
    light: {
      '--chart-1': 'oklch(0.55 0.15 155)',
      '--chart-2': 'oklch(0.65 0.12 130)',
      '--chart-3': 'oklch(0.5 0.13 175)',
      '--chart-4': 'oklch(0.7 0.1 100)',
      '--chart-5': 'oklch(0.45 0.12 145)',
    },
    dark: {
      '--chart-1': 'oklch(0.65 0.14 155)',
      '--chart-2': 'oklch(0.72 0.11 130)',
      '--chart-3': 'oklch(0.6 0.12 175)',
      '--chart-4': 'oklch(0.76 0.09 100)',
      '--chart-5': 'oklch(0.55 0.11 145)',
    },
  },

  berry: {
    light: {
      '--chart-1': 'oklch(0.55 0.22 320)',
      '--chart-2': 'oklch(0.5 0.2 290)',
      '--chart-3': 'oklch(0.6 0.18 350)',
      '--chart-4': 'oklch(0.45 0.22 270)',
      '--chart-5': 'oklch(0.65 0.15 10)',
    },
    dark: {
      '--chart-1': 'oklch(0.65 0.2 320)',
      '--chart-2': 'oklch(0.6 0.18 290)',
      '--chart-3': 'oklch(0.7 0.16 350)',
      '--chart-4': 'oklch(0.55 0.2 270)',
      '--chart-5': 'oklch(0.72 0.13 10)',
    },
  },
}
