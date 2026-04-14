```markdown
# Design System Document

## 1. Overview & Creative North Star: "The Ethereal Scribe"

This design system is a departure from the sterile, utilitarian "Old AI" aesthetic. It moves toward an editorial, high-end experience that treats Sinhala voice transcription as an art form rather than a technical chore. 

The **Creative North Star** is **"The Ethereal Scribe."** This concept combines the precision of high-tech machine learning with the fluidity of human speech. The UI is not a collection of static boxes; it is a series of layered, translucent surfaces that breathe. We use intentional asymmetry—such as varied card heights and overlapping glass headers—to create a rhythmic flow that mirrors the cadence of conversation. By prioritizing "negative space" and soft, light-refracting elements, we create a premium environment where content (the transcript) is the hero.

---

## 2. Colors: Tonal Depth & Soul

We move beyond flat hex codes to create a color ecosystem that feels alive. Our palette utilizes the deep purples of authority and the soft pinks/blues of modern tech.

### The "No-Line" Rule
**Strict Mandate:** 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background color shifts. 
- A `surface-container-low` section should sit directly on a `background` or `surface` to create a natural break. 
- Use the **Spacing Scale** (specifically `8` or `10`) to provide enough breathing room that the eye perceives a boundary without a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of frosted glass.
- **Base Layer:** `surface` (#f9f9ff)
- **Primary Content Areas:** `surface-container-lowest` (#ffffff) for maximum "pop."
- **Recessed Areas:** `surface-container-low` (#f0f3ff) for search bars or secondary backgrounds.
- **Active Floating Elements:** `surface-container-highest` (#d8e3fb) to signal importance.

### The "Glass & Gradient" Rule
To achieve a signature look, floating navigations and key action panels must use **Glassmorphism**. 
- **Recipe:** Semi-transparent `surface` + 20px Backdrop Blur + 10% opacity `outline-variant` "Ghost Border."
- **Signature Textures:** Use a linear gradient from `primary` (#340075) to `primary-container` (#4c1d95) for primary CTAs and hero section highlights to give the brand "visual soul."

---

## 3. Typography: Editorial Authority

The typography system is designed for high-contrast readability, pairing **Plus Jakarta Sans** for a high-tech edge with **Inter** for clean, functional legibility.

- **Display (Plus Jakarta Sans):** Used for "Hello" messages and hero headings. The large scale (`display-lg` at 3.5rem) creates an editorial feel.
- **Headlines & Titles:** Set with tighter tracking to feel like a premium publication. `headline-lg` (2rem) should be used for section headers.
- **Body (Inter):** Chosen specifically for its high x-height, making it the perfect companion for **Noto Sans Sinhala**. When displaying Sinhala text, ensure line-height is increased by 1.2x to accommodate the script's unique ascenders and descenders.
- **Labels:** Small, all-caps or high-weight labels (`label-md`) provide a "pro-tool" aesthetic without cluttering the screen.

---

## 4. Elevation & Depth: Tonal Layering

Shadows are a tool of last resort. We define hierarchy through "Tonal Layering."

- **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` card on top of a `surface-container-low` background. The subtle shift in hex value creates a soft, natural lift.
- **Ambient Shadows:** For elements that *must* float (like FABs or floating navs), use a diffused shadow: `y-10, blur-30, color: on-surface @ 6%`. Never use pure black shadows; always tint them with a hint of our `primary` hue.
- **The "Ghost Border":** If a boundary is needed for accessibility, use the `outline-variant` token at 15% opacity. It should be felt, not seen.
- **Glassmorphism:** Use `surface-variant` with a backdrop blur of 16px for overlays. This allows the vibrant gradients of the background to bleed through, keeping the UI integrated.

---

## 5. Components: The Premium Kit

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`) with `xl` (3rem) roundedness. No shadow; use a 2px inner glow for a "glass-pressed" effect.
- **Secondary:** `surface-container-highest` background with `on-surface` text.
- **Tertiary:** Ghost style; text only with a subtle background shift on hover.

### Input Fields
- **Search & Text Inputs:** Use `surface-container-low` backgrounds. Forbid borders. On focus, transition to `surface-container-highest` with a soft `secondary` glow. 
- **Roundedness:** Always use `md` (1.5rem) for inputs to maintain the friendly, high-tech personality.

### Cards & Lists
- **The Anti-Divider Rule:** Never use a horizontal line to separate list items. Use vertical spacing (`spacing-4`) or alternating tonal shifts (e.g., one item on `surface`, the next on `surface-container-low`).
- **Cards:** Use `lg` (2rem) corner radius. Content should be padded with `spacing-6` to ensure a premium, airy feel.

### Transcription-Specific Components
- **Voice Waveform:** Use a gradient stroke (from `secondary` to `tertiary-container`). Avoid thin lines; the waveform should feel "thick" and fluid.
- **Sinhala-English Toggle:** A pill-shaped toggle using `primary-fixed` for the active state, ensuring high contrast for bilingual users.

---

## 6. Do's and Don'ts

### Do
- **Do** use generous white space. If you think there's enough room, add 20% more.
- **Do** use the `full` roundedness for small tags and chips to create a "bubble" feel.
- **Do** align Sinhala and English text to a common baseline, even if it requires custom CSS offsets.
- **Do** use soft gradients in the background to break the monotony of white screens.

### Don't
- **Don't** use 1px solid black or grey borders. This instantly kills the "premium" feel.
- **Don't** use "standard" drop shadows (0, 2, 4, 0). They look like 2014-era templates.
- **Don't** cram icons and text together. Use the Spacing Scale to let elements breathe.
- **Don't** use high-saturation reds for errors. Use the `error` (#ba1a1a) and `error-container` (#ffdad6) tokens to keep the palette sophisticated even in failure states.

---
*End of Document*```