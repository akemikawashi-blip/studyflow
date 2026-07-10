---
name: Life Manager
colors:
  surface: '#fdf8fd'
  surface-dim: '#ddd9de'
  surface-bright: '#fdf8fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f2f8'
  surface-container: '#f1ecf2'
  surface-container-high: '#ebe7ec'
  surface-container-highest: '#e5e1e7'
  on-surface: '#1c1b1f'
  on-surface-variant: '#454652'
  inverse-surface: '#313034'
  inverse-on-surface: '#f4eff5'
  outline: '#757684'
  outline-variant: '#c5c5d4'
  surface-tint: '#4355b9'
  primary: '#24389c'
  on-primary: '#ffffff'
  primary-container: '#3f51b5'
  on-primary-container: '#cacfff'
  inverse-primary: '#bac3ff'
  secondary: '#006a60'
  on-secondary: '#ffffff'
  secondary-container: '#85f6e5'
  on-secondary-container: '#007166'
  tertiary: '#574000'
  on-tertiary: '#ffffff'
  tertiary-container: '#745600'
  on-tertiary-container: '#ffcc55'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00105c'
  on-primary-fixed-variant: '#293ca0'
  secondary-fixed: '#85f6e5'
  secondary-fixed-dim: '#67d9c9'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdf9e'
  tertiary-fixed-dim: '#fabd00'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5b4300'
  background: '#fdf8fd'
  on-background: '#1c1b1f'
  surface-variant: '#e5e1e7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.15px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
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
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
---

## Brand & Style
The design system for this productivity suite is built on the principles of **Modern Corporate** efficiency blended with **Minimalist** clarity. The UI is designed to reduce cognitive load, transforming complex scheduling and task management into a calm, organized experience. It prioritizes functional modularity, ensuring that every element feels like a purposeful part of a larger "Life Architecture." 

The emotional response should be one of "quiet control"—users should feel empowered and focused, never overwhelmed. High-density information is balanced with generous whitespace and a strict adherence to Material 3’s containment and elevation logic.

## Colors
The palette is rooted in trust and clarity. **Deep Indigo** serves as the primary anchor for structural elements and key actions, while **Soft Teal** provides a calming secondary accent for progress indicators and success states. **Warm Amber** is reserved exclusively for high-priority alerts and critical deadlines, ensuring immediate visual salience without inducing anxiety.

For Dark Mode, the system utilizes a tonal palette where surfaces are rendered in deep charcoal (#1C1B1F) with Indigo-tinted overlays to maintain depth. All colors must meet WCAG AA contrast ratios to ensure accessibility across various lighting conditions.

## Typography
This design system utilizes **Inter** across all levels to leverage its exceptional legibility in data-heavy environments. The hierarchy is strictly enforced to guide the user's eye from broad category titles to granular task details. 

- **Headlines:** Use semi-bold weights to anchor page sections.
- **Body Text:** Optimized for long-form notes and task descriptions with generous line heights.
- **Labels:** Used for metadata, tags, and button text, prioritizing uppercase or medium weights for distinctiveness at small sizes.

## Layout & Spacing
The layout follows a **Fluid Grid** system based on an 8px square rhythm. 

- **Mobile:** 4-column grid with 16px margins and 16px gutters.
- **Tablet:** 8-column grid with 24px margins.
- **Desktop:** 12-column grid with a max-width container of 1440px.

Consistency in spacing is critical for the "organized" feel; use `16px` (md) for internal card padding and `24px` (lg) for vertical separation between distinct logical modules.

## Elevation & Depth
Elevation is expressed through **Tonal Layers** rather than heavy shadows. In light mode, surfaces use subtle Indigo-tinted greys to indicate hierarchy. 

- **Level 0 (Surface):** The base background.
- **Level 1 (Cards/Lists):** A +1dp elevation using a very soft, diffused shadow (10% opacity) or a slight color shift.
- **Level 2 (Navigation/FAB):** Higher contrast with a 15% opacity shadow to indicate interactability.
- **Level 3 (Modals/Overlays):** Significant backdrop blur (12px) to keep the user focused on the immediate task while maintaining context of the background.

## Shapes
The shape language is a defining characteristic of this design system, utilizing **Large-Radius Curves** to soften the professional aesthetic. 

- **Primary Containers/Cards:** Use a `24px` (rounded-xl) corner radius.
- **Buttons & Chips:** Use a full pill-shape (circular ends) to contrast against the rectangular grid.
- **Input Fields:** Use a `12px` (rounded-lg) radius to sit comfortably within the large-radius cards.

## Components

### Buttons & Action
- **Floating Action Button (FAB):** The primary driver for "New Task" or "Create." Large, `24px` rounded container with the Primary Indigo color. 
- **Primary Button:** Pill-shaped, Indigo background, White text.
- **Secondary Button:** Outlined pill-shape with Indigo stroke.

### Cards & Lists
- **Task Cards:** Use the `24px` radius. Elements inside are padded by `16px`. Use a Soft Teal left-border accent for "In Progress" tasks and Warm Amber for "Overdue."
- **Interactive Lists:** Clean dividers (1px, 8% opacity neutral) between items, using high-contrast typography for task titles.

### Navigation
- **Bottom Navigation (Mobile):** 4-5 icons with active states indicated by an Indigo pill-shaped background behind the icon.
- **Navigation Rail (Desktop):** A slim vertical bar on the left to maximize horizontal space for data views.

### Inputs & Selection
- **Form Fields:** Outlined style with a `12px` radius. The label should float to the top-left on focus.
- **Checkboxes:** Rounded squares (4px radius) that fill with Soft Teal when completed, triggering a strikethrough on the associated text.
- **Chips:** Small, pill-shaped tags used for categories (e.g., "Work," "Personal").