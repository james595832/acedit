/**
 * ACED-IT editorial theme — extends Neutral with clean white surfaces,
 * charcoal primary actions, and restrained terracotta accent.
 *
 * Brand tokens from skills/design.MD (via defineTheme — not :root overrides).
 */
import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from './neutralTheme';

export const acedItTheme = defineTheme({
  name: 'aced-it',
  extends: neutralTheme,

  // Soft product geometry (Deel/Stripe-style rounding) — inherits the
  // neutral radius tokens: 10px elements, 12px containers.

  motion: {fast: 150, medium: 280, ratio: 0.75},

  typography: {
    scale: {base: 16, ratio: 1.25},
    body: {
      family: 'var(--font-aced-body), Public Sans',
      fallbacks:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    heading: {
      family: 'var(--font-aced-heading), Raleway',
      fallbacks: 'ui-sans-serif, system-ui, sans-serif',
      weights: {1: '600', 2: '600', 3: '600', 4: '600'},
    },
  },

  tokens: {
    // Warm paper canvas so white cards read as lifted surfaces
    '--color-background-body': ['#F6F4F0', '#1C1B18'],
    '--color-background-surface': ['#FFFFFF', '#2A2824'],
    '--color-background-card': ['#FFFFFF', '#2A2824'],
    '--color-background-popover': ['#FFFFFF', '#2A2824'],
    '--color-background-muted': ['#F7F7F5', '#1C1B18'],

    // Charcoal primary; terracotta used for accent text/markers
    '--color-accent': ['#1C1B18', '#EFECE6'],
    '--color-accent-muted': ['#F7F7F5', '#3A3732'],
    '--color-on-accent': ['#FFFFFF', '#1C1B18'],
    '--color-text-accent': ['#D96B43', '#E6A135'],
    '--color-icon-accent': ['#D96B43', '#E6A135'],

    '--color-text-primary': ['#1C1B18', '#F5F4F0'],
    '--color-text-secondary': ['#6B675E', '#A8A398'],
    '--color-text-disabled': ['#9C978C', '#6B675E'],

    '--color-icon-primary': ['#1C1B18', '#F5F4F0'],
    '--color-icon-secondary': ['#6B675E', '#A8A398'],

    '--color-border': ['#E8E6E1', '#3A3732'],

    // Status aligned to editorial accents
    '--color-error': ['#C83E3D', '#E88A88'],
    '--color-warning': ['#E6A135', '#F0C46A'],
    '--color-success': ['#2A6F97', '#6BA3C4'],
  },

  components: {
    button: {
      base: {
        borderRadius: 'var(--radius-element)',
        transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
      },
    },
  },
});
