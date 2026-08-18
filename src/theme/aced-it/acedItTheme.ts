/**
 * ACED-IT product theme — Stripe-leaning cool neutrals, navy ink,
 * sparse indigo accent. Extends Neutral; brand via defineTheme (not :root).
 */
import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from './neutralTheme';

export const acedItTheme = defineTheme({
  name: 'aced-it',
  extends: neutralTheme,

  // Product geometry: modest rounding (dashboard, not soft chat bubbles)
  motion: {fast: 150, medium: 240, ratio: 0.75},

  typography: {
    scale: {base: 15, ratio: 1.2},
    body: {
      family: 'var(--font-aced-body), "Plus Jakarta Sans"',
      fallbacks:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    heading: {
      family: 'var(--font-aced-heading), "Plus Jakarta Sans"',
      fallbacks: 'ui-sans-serif, system-ui, sans-serif',
      weights: {1: '600', 2: '600', 3: '600', 4: '600'},
    },
  },

  tokens: {
    // Cool Stripe-like canvas; white surfaces float on #F6F9FC
    '--color-background-body': ['#F6F9FC', '#0A2540'],
    '--color-background-surface': ['#FFFFFF', '#0F2E4D'],
    '--color-background-card': ['#FFFFFF', '#0F2E4D'],
    '--color-background-popover': ['#FFFFFF', '#0F2E4D'],
    '--color-background-muted': ['#F0F4F8', '#0A2540'],

    // Navy primary actions; indigo for accent text/markers (Stripe blurple)
    '--color-accent': ['#0A2540', '#F6F9FC'],
    '--color-accent-muted': ['#EEF2F7', '#143554'],
    '--color-on-accent': ['#FFFFFF', '#0A2540'],
    '--color-text-accent': ['#533AFD', '#A5A0FF'],
    '--color-icon-accent': ['#533AFD', '#A5A0FF'],

    '--color-text-primary': ['#0A2540', '#F6F9FC'],
    '--color-text-secondary': ['#697386', '#A3ACB9'],
    '--color-text-disabled': ['#A3ACB9', '#697386'],

    '--color-icon-primary': ['#0A2540', '#F6F9FC'],
    '--color-icon-secondary': ['#697386', '#A3ACB9'],

    '--color-border': ['#E3E8EE', '#1B3A5A'],

    '--color-error': ['#DF1B41', '#F8A5B5'],
    '--color-warning': ['#C44D00', '#F5B87A'],
    '--color-success': ['#0D9488', '#5EEAD4'],

    '--radius-element': '0.5rem',
    '--radius-container': '0.5rem',
  },

  components: {
    button: {
      base: {
        borderRadius: 'var(--radius-element)',
        transition:
          'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
      },
    },
  },
});
