## DESIGN SYSTEM & AESTHETIC DIRECTION: ANTI-SLOP RULEBOOK
1. Core Philosophy & Anti-AI-Slop Mandates
This application avoids generic, lifeless "AI SaaS slop" (predictable blue primary buttons, excessive soft drop shadows, generic rounded card grids, and cookie-cutter layouts).

Inspiration Base: Clean, editorial, Swiss-inspired minimalism grounded in physical poster art and structured layout proportions (informed by the structural layout language of contemporary editorial platforms like Astryx).

Surface Treatment: Favor sharp architectural geometry, solid border boundaries (border border-stone-300), flat matte cards, and controlled, asymmetrical layout grids over floating, heavily blurred shadow-xl containers.

Color Usage: Restrained, warm neutral backgrounds paired with deliberate, high-impact hits of primary or editorial accent colors (warm terracotta, rich charcoal, ochre, muted structural blue, and deep brick red).

## 2. Typography & Hierarchy System
Because your logo utilizes a chunky sans-serif font, the system pairs structural, heavy geometric headers with clean, highly legible grotesque or neo-grotesque sans-serif body text for maximum editorial contrast.

Primary Display / Headers: Geometric, structural, high-weight grotesque sans-serif (e.g., Cabinet Grotesk, Space Grotesk, or Inter Display with heavy tracking discipline).

Body / UI Text: Clean neo-grotesque sans-serif (e.g., Inter, Public Sans, or Neue Haas Grotesk) optimized for readability at small scales.

Type Rules:

Avoid generic lowercase-only UI headers unless explicitly styled for editorial callouts.

Maintain strict type-scale ratios. Avoid random inline font sizes; use defined scale tokens.

Implement intentional tracking (letter-spacing) on uppercase editorial tags and subtitles (tracking-wider or tracking-widest).

## 3. Color Palette Architecture
Defined to maintain warmth, structural clarity, and controlled, tactile hints of color:

CSS
/* Color Tokens */
--color-bg-base: #F5F4F0;        /* Warm bone / archival off-white background */
--color-surface: #EFECE6;        /* Slightly deeper structural surface */
--color-text-primary: #1C1B18;   /* Deep near-black / rich charcoal */
--color-text-muted: #6B675E;     /* Muted secondary body text */
--color-border: #D9D4C7;         /* Architectural structural border */

/* Editorial Accent Hints */
--color-accent-terracotta: #D96B43; /* Warm energetic pop */
--color-accent-ochre: #E6A135;       /* Structural warmth */
--color-accent-blue: #2A6F97;        /* Analytical / cool contrast */
--color-accent-red: #C83E3D;         /* High-impact highlight */
## 4. Accessibility (a11y) & UX Standards
Accessibility is a structural requirement, not an afterthought. All code generated for components must strictly follow these rules:

Semantic HTML: Use proper structural tags (<header>, <main>, <nav>, <section>, <article>, <footer>). Avoid non-semantic <div> soup.

Images: Every <img> tag must include a meaningful, non-empty alt attribute describing the visual content or marked explicitly as alt="" if purely decorative.

Forms & Inputs:

Every form field, input, select, and textarea must have an explicit, associated <label> (using htmlFor / id mapping).

Interactive inputs must include clear, descriptive aria-label or aria-labelledby attributes where visible text labels are omitted.

Inline error messages must be linked using aria-describedby.

Keyboard Navigation & Focus States:

Never use outline-none without providing a distinct, highly visible custom focus ring (e.g., focus:ring-2 focus:ring-stone-900 focus:ring-offset-2).

Ensure logical tab order (tabindex="0" only where necessary; rely on DOM order for natural tabbing).

Interactive elements must be fully operational via keyboard (Enter and Space triggers).

Color Contrast: Text and interactive elements must meet WCAG AA contrast ratios against their background states.

## 5. Component Construction Rules (Tailwind / CSS)
Bans:

❌ rounded-xl or rounded-2xl on structural data cards (keep shapes crisp or minimally rounded with rounded-sm or sharp edges).

❌ Generic glowing gradients or heavy multi-layered drop shadows (shadow-2xl). Use thin borders (border border-[var(--color-border)]) to define containers.

❌ Default blue framework buttons (bg-blue-600). Use charcoal buttons (bg-stone-900 text-stone-100 hover:bg-stone-800) or deliberate accent hits.

Interactive States:

Buttons and links must feature instantaneous, crisp state transitions (transition-colors duration-150).

Hover states should rely on subtle surface inversions or border color shifts rather than jarring scale/elevation changes.