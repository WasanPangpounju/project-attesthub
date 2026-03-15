# Landing Page Redesign Brief — Attesthub

## Design Direction
- Fonts: DM Serif Display (headings) + DM Sans (body) via `next/font/google`
- Colors (add to `globals.css`):
  ```
  --color-navy: #1a2744
  --color-teal: #0f7c6e
  --color-teal-light: #13a08e
  --color-teal-bg: #e8f5f3
  --color-muted: #5a6478
  ```
- Style: white cards, `0.5px` borders, `border-radius: 14px`, no shadows

---

## Sections

### 1. Navbar (sticky, white, 0.5px bottom border)
- Logo: `ShieldCheck` icon + "Attesthub"
- Links: ฟีเจอร์ | เกี่ยวกับเรา | ราคา
- Right: Language toggle (existing i18n) · Sign in (Clerk) · **Get Started** (teal button)

### 2. Hero (centered, max-width 760px)
- Chip badge: `"WCAG 2.2 · Human + AI Hybrid Testing"`
- H1 (DM Serif, 54px): existing headline — wrap last line in `<em>` teal italic
- Subtext: existing translated subheadline
- CTA primary: "เริ่มตรวจสอบ / Start Your Audit" → Clerk sign-up
- CTA outline: "เรียนรู้เพิ่มเติม / Learn More" → `#services`

### 3. Our Services `id="services"` (3-column card grid)
- Icon + title + body per card (keep existing i18n strings)
- Icons: `Monitor` · `Smartphone` · `Home`

### 4. How We Work (4-step row, teal circle icons)
- Icons: `Search` · `Brain` · `Users` · `FileText`
- Keep existing i18n strings

### 5. Why Choose Us (3-column cards, serif number 01/02/03 in teal)
- Keep existing i18n strings

### 6. Testimonials `id="testimonials"` (3-column cards)
- Stars `★★★★★` in `#c9932a` · italic quote · avatar initials · name · role
- Keep existing i18n strings

### 7. CTA Banner (navy `#1a2744` bg, radius 18px, centered)
- H2 white · subtext muted white · existing translated copy
- CTA 1 white filled → `mailto:contact@attesthub.com`
- CTA 2 ghost border → `tel:+1234567890`

### 8. Footer (4-column: Brand · Quick Links · Legal · Connect)
- Social buttons: Facebook · Twitter/X · LinkedIn · Email
- Bottom bar: `© 2026 Attesthub. All rights reserved.`

---

## Implementation Rules
- All text via existing `t()` / `useTranslations()` — add missing keys to `en.json` + `th.json` under `"landing"` namespace
- Icons: Lucide React (already installed)
- Tailwind v4 — use `style=""` for one-off hex values, no arbitrary config changes
- Server Components only — no `"use client"` unless interactive
- Do **not** modify `components/ui/` (shadcn)
- Keep all existing hrefs: Clerk URLs, mailto, tel, anchor links
