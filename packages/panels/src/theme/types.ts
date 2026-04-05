// ─── Style Presets ─────────────────────────────────────────

/** Built-in style presets — each defines a complete set of OKLCH CSS variables. */
export type StylePreset = 'default' | 'nova' | 'maia' | 'lyra'

// ─── Base Colors (gray/neutral scales) ─────────────────────

/** Base color scale — controls the neutral/gray tones across the UI. */
export type BaseColor = 'neutral' | 'stone' | 'zinc' | 'slate' | 'olive' | 'taupe'

// ─── Accent Colors ─────────────────────────────────────────

/** Accent color — overrides the primary color (buttons, links, active states). */
export type AccentColor =
  | 'blue' | 'red' | 'green' | 'amber' | 'orange' | 'cyan'
  | 'violet' | 'purple' | 'pink' | 'rose' | 'emerald' | 'teal'
  | 'indigo' | 'fuchsia' | 'lime' | 'sky'

// ─── Radius ────────────────────────────────────────────────

/** Border radius preset. */
export type RadiusPreset = 'none' | 'small' | 'default' | 'medium' | 'large'

// ─── Chart Palette ─────────────────────────────────────────

/** Chart color palette — defines chart-1 through chart-5 colors. */
export type ChartPalette = 'default' | 'ocean' | 'sunset' | 'forest' | 'berry'

// ─── Icon Library (Phase 2) ────────────────────────────────

/** Icon library identifier — controls which icon set ResourceIcon resolves from. */
export type IconLibrary = 'lucide' | 'tabler' | 'remix' | 'phosphor'

// ─── Fonts ─────────────────────────────────────────────────

export interface ThemeFonts {
  /** Google Fonts family name for headings, e.g. 'Space Grotesk'. */
  heading?: string
  /** Google Fonts family name for body text, e.g. 'Inter'. */
  body?: string
}

// ─── Panel Theme Config (user-facing) ──────────────────────

/**
 * Theme configuration for a panel — passed to `Panel.theme()`.
 *
 * @example
 * ```ts
 * Panel.make('admin').theme({
 *   preset: 'nova',
 *   baseColor: 'zinc',
 *   accentColor: 'blue',
 *   radius: 'medium',
 *   fonts: { heading: 'Space Grotesk', body: 'Inter' },
 * })
 * ```
 */
export interface PanelThemeConfig {
  /** Style preset — sets all CSS variables at once. Defaults to 'default'. */
  preset?:       StylePreset
  /** Base color scale — overrides neutral/gray tones from the preset. */
  baseColor?:    BaseColor
  /** Accent color — overrides primary color from the preset. */
  accentColor?:  AccentColor
  /** Chart color palette. Defaults to 'default'. */
  chartPalette?: ChartPalette
  /** Border radius preset. Defaults to 'default'. */
  radius?:       RadiusPreset
  /** Font families (loaded from Google Fonts). */
  fonts?:        ThemeFonts
  /** Icon library (Phase 2 — stored but not yet wired to frontend). */
  iconLibrary?:  IconLibrary
  /** Escape hatch: raw CSS variable overrides in OKLCH. Applied last, highest priority. */
  cssVariables?: {
    light?: Record<string, string>
    dark?:  Record<string, string>
  }
}

// ─── Panel Theme Meta (serialized, server → client) ────────

/** Resolved theme data sent from server to client via PanelNavigationMeta. */
export interface PanelThemeMeta {
  /** CSS variable map for :root (light mode). Keys are CSS custom property names. */
  light: Record<string, string>
  /** CSS variable map for .dark (dark mode). */
  dark:  Record<string, string>
  /** Border radius value (e.g. '0.625rem'). */
  radius: string
  /** Google Fonts families to load via <link> tag. */
  fonts?: ThemeFonts
  /** Font family CSS values with fallbacks (e.g. "'Inter', sans-serif"). */
  fontFamily?: {
    heading?: string
    body?:    string
  }
  /** Icon library identifier for frontend icon resolution. */
  iconLibrary: IconLibrary
}

// ─── Preset Definition ─────────────────────────────────────

/** A complete set of CSS variable values for light and dark modes (OKLCH strings). */
export interface PresetDefinition {
  light: Record<string, string>
  dark:  Record<string, string>
}
