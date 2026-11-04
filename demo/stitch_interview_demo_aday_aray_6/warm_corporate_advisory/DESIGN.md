---
name: Warm Corporate Advisory
colors:
  surface: '#fcf9f5'
  surface-dim: '#dcdad6'
  surface-bright: '#fcf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ef'
  surface-container: '#f0edea'
  surface-container-high: '#ebe8e4'
  surface-container-highest: '#e5e2de'
  on-surface: '#1c1c1a'
  on-surface-variant: '#404848'
  inverse-surface: '#31302e'
  inverse-on-surface: '#f3f0ed'
  outline: '#717978'
  outline-variant: '#c0c8c7'
  surface-tint: '#3b6564'
  primary: '#013434'
  on-primary: '#ffffff'
  primary-container: '#1f4b4a'
  on-primary-container: '#8ebab8'
  inverse-primary: '#a2cfcd'
  secondary: '#924b1f'
  on-secondary: '#ffffff'
  secondary-container: '#fea26e'
  on-secondary-container: '#77370a'
  tertiary: '#0e3335'
  on-tertiary: '#ffffff'
  tertiary-container: '#274a4c'
  on-tertiary-container: '#95b9bb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#beebe9'
  primary-fixed-dim: '#a2cfcd'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#224d4c'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb68e'
  on-secondary-fixed: '#331200'
  on-secondary-fixed-variant: '#743408'
  tertiary-fixed: '#c4e9eb'
  tertiary-fixed-dim: '#a9cdcf'
  on-tertiary-fixed: '#002021'
  on-tertiary-fixed-variant: '#2a4c4e'
  background: '#fcf9f5'
  on-background: '#1c1c1a'
  surface-variant: '#e5e2de'
typography:
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md-secondary:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-step:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-badge:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses a refined, executive consulting ethos balanced with intellectual warmth, structured precision, and human-centric authority. Tailored for high-stakes interview demonstrations, candidate assessments, and strategic advisory portals, it eschews fleeting digital trends in favor of timeless editorial clarity.

The visual style unites structured Corporate Modernism with grounded warmth:
- Pure utilitarian structure paired with tactile, linen-tinted neutrals.
- Deep petroleum hues convey stability, analytical rigor, and composure.
- Warm copper highlights anchor visual hierarchy with deliberate prestige.
- Strict ban on superficial gimmicks: no gradients, no glassmorphism or backdrop blurs, no sparkles, no neon tones, no whimsical illustrations, and no AI/robot tropes. Every interface element must serve an informational or transactional purpose.

## Colors

The palette is engineered around deliberate chromatic roles that reinforce trust, executive calm, and clear visual hierarchy:

- **Canvas & Surface Architecture**:
  - Global Canvas / Background: `#F2F0EA` (warm, natural alabaster).
  - Cards & Content Surfaces: `#FFFFFF` (crisp white).
  - Muted Borders & Dividers: `#E3DFD6` (low-contrast, warm hairline).
- **Petroleum Hierarchy**:
  - Deep Petroleum (`#14383A`): Reserved for executive surfaces, primary headers, dark sidebar metadata blocks, and anchoring banner bars.
  - Primary Petroleum (`#1F4B4A`): Used for primary interactive actions, selected states, and progressive completion paths.
  - Soft Petroleum Tint (`#E4EEEC`): Utilized for active card fills, subtle chip backgrounds, and icon containers.
- **Accent & Signifiers**:
  - Warm Copper (`#B8693A`): High-intent secondary accent for status badges, active workflow step indicators, advisory callouts, and 3px structural accent lines.
- **Typography & Communication**:
  - Primary Text: `#1E1E1C` (deep soot, softer than pure black).
  - Secondary / Supporting Text: `#5E5A52` (warm neutral slate).
- **Functional Semantics**:
  - Alert / Warning: `#B7791F`
  - Critical / Error: `#A63D2F`
  - Affirmative / Success: `#2E7D5B`

Unapproved colors—specifically purple, lilac, magenta, and saturated primaries—are strictly excluded from all tokens and component states.

## Typography

The typography relies on **IBM Plex Sans** across all roles, leveraging its engineered technical rhythm and humanist legibility.

- **Display & Main Headlines (`headline-lg`)**: Set at 32px Semibold (26px on mobile) for major dashboard page titles and interview module overviews.
- **Section Headlines (`headline-md`)**: 20px Semibold for card containers, assessment groupings, and stage headers.
- **Body Text (`body-lg`)**: 16px Regular for readability in interview responses, evaluator comments, and long-form scenario prompts.
- **Supporting / Auxiliary (`body-md-secondary`)**: 14px Regular rendered in `#5E5A52` for metadata, timestamps, and input assistance text.
- **Step & Operational Labels (`label-step`)**: 12px Semibold uppercase with an expanded tracking of `0.08em` for multi-stage workflow milestones, category eyebrows, and technical status bars.

## Layout & Spacing

The layout is grounded in a disciplined 12-column grid system calibrated to support dual-pane advisory workflows, evaluation rubrics, and high-density interview panels.

- **Breakpoints & Grids**:
  - **Desktop (1200px+)**: 12 columns, max content container width of 1280px, `2rem` (32px) outer margin, `1.5rem` (24px) gutters. Asymmetric splits (e.g., 4-column reference sidebar / 8-column interaction stage) structure long sessions cleanly.
  - **Tablet (768px – 1199px)**: 8 columns, `1.5rem` margins, `1rem` gutters. Sidebars fold into collapsible top-level metadata accordions.
  - **Mobile (< 768px)**: 4 columns, `1rem` (16px) outer margin, `1rem` gutters. Elements stack vertically.
- **Density & Rhythm**:
  - Maintain a strict 4px/8px internal spatial rhythm.
  - Core card padding is anchored at `space-lg` (24px) on desktop and `space-md` (16px) on mobile viewports.
  - Gaps between logical form clusters and evaluation cards utilize `space-xl` (32px).

## Elevation & Depth

Depth is established through soft, structural atmospheric shading layered over warm neutrals rather than heavy artificial shadows:

- **Surface Layering**:
  - **Base Canvas**: Flat `#F2F0EA`.
  - **Resting Panels & Cards**: `#FFFFFF` with a 1px solid hairline border in `#E3DFD6` and dual-tier soft elevation:
    `box-shadow: 0 1px 2px rgba(20, 40, 40, 0.06), 0 8px 24px rgba(20, 40, 40, 0.07);`
  - **Interactive Focus / Lift**: On hover or active state, the border shifts to `#1F4B4A` while maintaining the dual-tier shadow with a refined elevation:
    `box-shadow: 0 2px 4px rgba(20, 40, 40, 0.08), 0 12px 32px rgba(20, 40, 40, 0.09);`
- **Tonal Contrast**:
  - The deep petroleum (`#14383A`) dark panel functions as a high-density, flat-anchor slab, carrying no dropped shadows; its presence creates visual grounding through tonal contrast alone.
- **Decorative Accent Lines**:
  - High-priority advisory cards employ a solid 3px structural border on the left edge (`#B8693A`), providing orientation without spatial blur.

## Shapes

The design uses an intentional, structured corner geometry:
- **Card Containers**: Fixed 10px corner radius (`border-radius: 10px`).
- **Interactive Controls, Form Fields, and Buttons**: Fixed 8px corner radius (`border-radius: 8px`).
- **Badges, Step Indicators, and Micro-pills**: 4px to 6px subtle softening to maintain architectural alignment with IBM Plex Sans.
- Fully rounded pills or stadium shapes are avoided to preserve the editorial, institutional character of the application.

## Components

### Buttons
- **Primary**: Solid `#1F4B4A` background, `#FFFFFF` text, 8px border radius, 12px 20px padding. Hover: `#14383A`. Active: transform scale `0.99`.
- **Secondary / Outlined**: `#FFFFFF` background, 1px border in `#1F4B4A`, `#1F4B4A` text. Hover: `#E4EEEC` fill.
- **Accent / Callout**: Solid `#B8693A` background with `#FFFFFF` text for decisive evaluation commits or critical progression milestones.

### Input Fields & Controls
- **Inputs & Selects**: `#FFFFFF` surface, 1px border in `#E3DFD6`, 8px border radius, 10px 14px padding. Text in `#1E1E1C`, placeholder in `#5E5A52`. Focus: 1px border in `#1F4B4A` with an offset outline of `rgba(31, 75, 74, 0.15)`.
- **Checkboxes & Radios**: Custom 18px boxes, 1px `#E3DFD6` border, checked state fills with `#1F4B4A` containing a crisp white tick or inner dot.

### Cards & Selected States
- **Standard Card**: White `#FFFFFF` surface, 10px radius, 1px `#E3DFD6` border, dual-tier shadow.
- **Active / Selected Card**: Surface shifts to `#E4EEEC`, border tint darkens to `#1F4B4A` (1.5px), with subtle interior contrast.
- **Advisory Highlight Card**: Standard card enhanced with a 3px solid `#B8693A` left edge indicator, used for benchmark notes and critical candidate observations.

### Chips & Step Indicators
- **Chips & Tags**: 6px radius, `#E4EEEC` background with `#14383A` text for petroleum variants; `#B8693A` tinted at 10% opacity with `#B8693A` text for copper variants.
- **Workflow Step Line**: 2px horizontal/vertical track in `#E3DFD6`, filled with `#1F4B4A` as progress completes. Active step uses a `#B8693A` circular node with `label-step` typography.
- **Icon Boxes**: 36px or 40px square containers, 8px radius, `#E4EEEC` background, housing `#1F4B4A` functional line icons.