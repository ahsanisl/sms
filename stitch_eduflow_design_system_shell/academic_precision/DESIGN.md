---
name: Academic Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#111516'
  on-tertiary: '#ffffff'
  tertiary-container: '#26292b'
  on-tertiary-container: '#8d9092'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin: 40px
  max-width: 1440px
---

## Brand & Style
The design system is engineered for the high-stakes environment of private school administration. It prioritizes a **Corporate Modern** aesthetic with a lean toward **Minimalism**, focusing on information density without visual clutter. The emotional goal is to evoke a sense of calm authority and institutional reliability.

The visual direction avoids the "playful" tropes of EdTech in favor of a sophisticated B2B SaaS feel. It utilizes a structured hierarchy, ample whitespace (macro-gestalt), and subtle depth to organize complex data sets. Every element is intentional, removing decorative flourishes to ensure the administrator’s focus remains on student success and operational efficiency.

## Colors
The palette is rooted in a **Deep Navy (Slate 900)** primary to establish trust and institutional permanence. A **Sophisticated Indigo** is used sparingly as an action color to draw attention to primary interactive elements.

The background uses a specific **cool-tinted grey (#F8FAFC)** to reduce eye strain during long administrative sessions, while surfaces remain pure white to create a clear "layered" distinction. System colors follow standard SaaS conventions but are slightly desaturated to maintain the professional tone of the design system.

## Typography
This design system utilizes **Inter** exclusively to leverage its exceptional legibility in data-dense environments. The scale is built on a tight ratio to ensure that even at high densities, the hierarchy remains obvious.

- **Headlines:** Use Semi-Bold (600) for a commanding but not aggressive presence.
- **Body:** Standardized at 14px for most administrative tasks to maximize content visibility on desktop screens.
- **Labels:** Use Medium (500) or Bold (600) with slight letter spacing and uppercase transforms for secondary metadata or table headers.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The main content area is capped at 1440px to prevent excessive line lengths on ultra-wide monitors, while the side navigation remains fixed.

A **4px baseline grid** governs all spacing. For data-heavy views (like Gradebooks or Student Rosters), use "Compact" spacing (8px/12px). For dashboard overviews and marketing-internal pages, use "Default" spacing (16px/24px) to create the "premium" feel requested. All cards and containers should utilize a 24px internal padding for a clean, breathable appearance.

## Elevation & Depth
Elevation is communicated through **Tonal Layers** supplemented by **Ambient Shadows**. This design system avoids heavy drop shadows, opting instead for ultra-soft, multi-layered shadows that simulate a shallow physical depth.

- **Level 0 (Base):** The #F8FAFC background.
- **Level 1 (Card):** White surface with a 1px border (#E2E8F0) and a subtle shadow (0 1px 3px rgba(0,0,0,0.05)).
- **Level 2 (Hover/Active):** Slightly more pronounced shadow (0 10px 15px -3px rgba(0,0,0,0.08)) to indicate interactivity.
- **Level 3 (Modals/Overlays):** Distinct depth (0 20px 25px -5px rgba(0,0,0,0.1)) to focus user attention.

Borders are preferred over shadows for defining structural zones (like sidebars and headers) to maintain a crisp, professional look.

## Shapes
The shape language is **Rounded (8px)**. This radius is applied to cards, input fields, and buttons to soften the "institutional" feel without appearing juvenile. 

- **Small elements (Checkboxes/Badges):** Use 4px (Soft) to maintain precision at small scales.
- **Large elements (Modals/Main Containers):** Use 12px-16px for a more modern, premium container feel.
- **Avatars:** Use full circles (Pill-shaped) to distinguish human elements from functional UI components.

## Components
- **Buttons:** Primary buttons use the Indigo hex with white text. Secondary buttons use a white fill with a Slate 200 border. Ghost buttons are reserved for secondary actions in headers. Avoid gradients; use solid fills only.
- **Inputs:** Utilize "Floating Labels" or clear top-aligned labels. Use a 1px border (#CBD5E1) that transitions to Indigo on focus. Multi-select inputs should use clear "Removable Chips" within the field.
- **Data Tables:** These are the heart of the system. Use alternating row zebra-striping (very subtle) or simple bottom-borders. Headers should be sticky, using the `label-sm` typography style.
- **Tabs:** Use the "Underline" style for main navigation tabs and "Pill" styles for sub-filtering within a page.
- **Badges/Status:** Use soft background tints of the system colors (e.g., Success is a light green background with dark green text) for high readability.
- **Modals:** Center-aligned with a dark semi-transparent overlay (Slate 900 at 40% opacity). Modals must have a clear "Title" and "Close" icon.