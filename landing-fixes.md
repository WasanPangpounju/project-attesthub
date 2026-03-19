# Landing Page — Fix Brief (from screenshot review)

## Issues to fix

### 1. Navbar — missing logo mark & layout
- Logo area shows only "N" placeholder — ShieldCheck icon is not rendering
- Verify `lucide-react` import and that the icon renders beside "Attesthub" text
- Ensure nav links and right-side buttons are on one row (not wrapping)

### 2. Hero — background not white / section blending into page
- Hero section should have a clean white background with clear visual separation from the next section
- Add a subtle bottom border `border-bottom: 0.5px solid #e2e8f0` to separate hero from services

### 3. Services grid — 3rd card wrapping to new row
- "Universal Design สำหรับพื้นที่ทางกายภาพ" card is breaking to a second row
- Fix: ensure `grid-template-columns: repeat(3, 1fr)` is applied correctly
- Check that card min-width is not preventing 3-column layout on desktop

### 4. How We Work — steps not in a single row
- Steps 3 and 4 are wrapping to a second row instead of staying in 4-column layout
- Fix: use `grid-template-columns: repeat(4, 1fr)` and reduce padding/font-size if needed on smaller viewports

### 5. Testimonials — 3rd card wrapping to new row
- Emily Rodriguez card is on its own row
- Same fix as services: enforce `lg:grid-cols-3` and check card min-width

### 6. Footer — missing brand column / layout broken
- Footer appears to be missing the Brand column with tagline
- Verify 4-column grid: `grid-template-columns: 2fr 1fr 1fr 1fr`
- "CONNECT" label and social icons should be in the 4th column
- Bottom copyright bar should span full width

### 7. Section spacing — too much vertical whitespace
- Reduce `py-20 md:py-28` to `py-14 md:py-20` for all sections except Hero
- This will tighten the page and reduce excessive scrolling

## Do not change
- All i18n strings and translation keys
- Clerk auth links
- Color tokens and font choices
- Component file structure
