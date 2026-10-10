---
name: Lumina Enterprise
colors:
  surface: '#121315'
  surface-dim: '#121315'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1d'
  surface-container: '#1f2021'
  surface-container-high: '#292a2b'
  surface-container-highest: '#343536'
  on-surface: '#e3e2e3'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e3e2e3'
  inverse-on-surface: '#303032'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#89ceff'
  on-secondary: '#00344d'
  secondary-container: '#00a2e6'
  on-secondary-container: '#00344e'
  tertiary: '#ffb869'
  on-tertiary: '#482900'
  tertiary-container: '#ca801e'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#121315'
  on-background: '#e3e2e3'
  surface-variant: '#343536'
  meetops-purple: '#8B5CF6'
  surface-dark: '#0B0C0E'
  border-subtle: rgba(255, 255, 255, 0.08)
  glass-bg: rgba(11, 12, 14, 0.7)
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 16px
  container-max: 1280px
---

## Brand & Style

The design system is engineered for the high-performance demands of enterprise meeting operations. It draws inspiration from **Minimalism** and **Corporate Modern** aesthetics, emphasizing clarity, speed, and precision. The visual language is designed to feel "investor-ready"—polished, stable, and highly functional. 

Key attributes include:
- **Professional Intelligence:** A focus on data density without clutter.
- **Modern Efficiency:** Subtle motion and refined transitions that mirror the speed of a high-growth startup.
- **Deep Precision:** Using dark mode as the "power user" default while maintaining a clinical, high-contrast light mode for administrative tasks.

## Colors

The palette is anchored by "MeetOps Purple," a vibrant, high-energy violet that serves as the primary action color. 

- **Dark Mode Strategy:** Uses a deep obsidian (`#08090A`) for the base layer, with slightly elevated surfaces using `#0B0C0E`. Grays are sampled from a cold, blue-tinted scale to maintain a "tech" feel.
- **Light Mode Strategy:** Switches to a pure white background with an ultra-light gray (`#FAFAFA`) for secondary containers.
- **Functional Grays:** A sophisticated 10-step gray scale is utilized for text hierarchy, ranging from high-contrast titles to muted metadata and inactive UI states.

## Typography

This design system uses a multi-font approach to balance personality with utility.

- **Headlines:** Hanken Grotesk provides a sharp, contemporary geometric feel. Large display type uses tight letter spacing to create a compact, "impactful" look.
- **Body:** Inter is used for all functional text to ensure maximum legibility across all screen densities. Line heights are kept generous (1.5x–1.6x) to reduce cognitive load in data-heavy views.
- **Technical/Labels:** JetBrains Mono is used sparingly for metadata, IDs, and small labels to provide a technical, "operational" undertone.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for dashboard views to maintain a predictable environment for professional tools.

- **Grid System:** A 12-column grid is used for desktop layouts. In dashboard views, the sidebar is fixed at 240px, while the main content area utilizes the remaining space within a 1280px max-width container.
- **Rhythm:** An 8px linear scale is used for all component-level spacing (padding, margins), ensuring a consistent visual beat.
- **Responsive Behavior:** On tablet, the sidebar collapses into a drawer. On mobile, the layout reflows into a single-column stack with margins reduced to 16px to maximize content area.

## Elevation & Depth

Hierarchy is established through a combination of **Tonal Layering** and **Glassmorphism**.

- **Layers:** Background surfaces are the lowest tier (`#08090A`). Primary cards and containers use a slightly lighter gray (`#0B0C0E`).
- **Depth Indicators:** Subtle, low-opacity borders (1px, 8-10% white in dark mode) replace heavy shadows for a cleaner look. 
- **Active States:** Overlays and modals utilize a Backdrop Blur (20px) with a semi-transparent fill to maintain context of the underlying data while bringing the focus forward.
- **Shadows:** When used, shadows are "Ambient"—diffused, large radii, and very low opacity (e.g., `0 20px 40px rgba(0,0,0,0.4)`).

## Shapes

The shape language is "Rounded" to soften the professional edges of the software, making it feel more approachable and modern.

- **Standard Radius:** 8px (`0.5rem`) for standard components like buttons and input fields.
- **Large Radius:** 16px (`1rem`) for primary dashboard cards and modals.
- **Interactive Elements:** Checkboxes and small toggles maintain a 4px radius to ensure they feel precise even at small scales.

## Components

- **Buttons:** Primary buttons use a solid "MeetOps Purple" background with white text. Secondary buttons use a subtle border and no fill. All buttons feature a 8px radius and a subtle hover lift effect.
- **Inputs:** Input fields are dark-themed with 1px subtle borders. Upon focus, the border transitions to the primary purple with a soft outer glow (2px).
- **Cards:** Dashboard cards have a 16px radius and a 1px border. They should avoid heavy shadows unless they are "floating" (like a dropdown or modal).
- **Chips/Badges:** Used for status indicators (e.g., "Available", "Booked"). These use low-saturation background tints of the status color with high-contrast text for accessibility.
- **Lists:** Table rows and list items use a "ghost" hover state where the background changes to a slightly lighter gray to indicate interactivity without using a border.
- **Custom Components:** This system includes "Time-Blocker" components for the calendar view—semi-transparent blocks with a left-accent border in the primary brand color.