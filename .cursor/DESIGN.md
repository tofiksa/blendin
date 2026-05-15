# Blend-In — design principles

**Product:** Blend-In (working title *Kaffekopp-indikatoren*) — a cozy, non-competitive onboarding quiz so a team sees how well they’ve synced with a new colleague in week one.

This document guides UX, UI copy, and motion. Implementation lives in Tailwind + `app/globals.css`; **per-tenant branding** (logo, palette) overrides defaults where configured.

---

## 1. Atmosphere & tone

- **Feel:** Warm, minimalist **office-cozy** — daylight paper, soft browns, calm typography; nothing flashy or “game show”.
- **Intent:** **Team harmony**, not competition. Avoid scores that shame individuals; **no leaderboards** for “lowest” guessers.
- **Copy (nb):** Playful, welcoming, short sentences. Facilitator prompts should sound like an invitation to chat, not a correction.
- **Facilitation:** Same device runs **admin + presenter**; team may follow on **phones** during/after reveal — mobile layouts must stay readable.

---

## 2. Visual hierarchy

1. **Hero metaphor:** A **digital coffee cup** on the big-screen reveal — central, legible at a distance; fills on “matches”, creeps on “near misses”.
2. **Question clarity:** Question stem → team majority → reveal truth → optional **meta band** (“how many did you think would guess right?”).
3. **Tie transparency:** When the team tie-break is random, **show which options tied** — never imply false consensus.

---

## 3. Color & theme system

### Default palette (warm neutral)

| Role        | Purpose                          | Notes                                      |
|------------|-----------------------------------|--------------------------------------------|
| Background | Page / presenter canvas         | Cream / warm gray (`globals.css` tokens)   |
| Foreground | Primary text                      | Deep brown, not pure black                 |
| Muted      | Secondary labels, hints         | Lower contrast but WCAG-aware later       |
| Accent     | Primary actions, highlights     | Coffee / amber tone                       |
| Accent-soft| Chips, wells, subtle panels    | Low saturation companion to accent        |

### Tenant overrides

- Tenants supply **logo**, **primary**, **accent**, **surface** (and optional font).
- Apply via **CSS variables** at layout boundary — avoid rebuilding Tailwind per tenant.

### Dark mode

- Respect `prefers-color-scheme: dark` with **warm dark** neutrals (not cold gray `#111`).

---

## 4. Typography

- **Default:** Geist (already wired in `layout.tsx`) or tenant font fallback to system UI.
- **Headings:** Semibold, calm tracking; avoid shouting caps except small labels.
- **Body:** Comfortable line length (~65–75 characters); adequate spacing for Norwegian paragraphs.

---

## 5. Components & interaction

- **Buttons:** Rounded, clear focus ring (keyboard); primary = accent-filled; secondary = outline or soft fill.
- **Quiz choices:** Large tap targets on mobile; selected state obvious but not aggressive.
- **Presenter controls:** Big touch/click zones; optional keyboard (←/→ or space) for advancing slides.
- **Feedback:** Match → **pour animation + cozy sound** (presenter-first); mismatch → **tiny cup increment** + prompt for the new hire to tell the story behind their answer.

---

## 6. Motion & sound

- **Motion:** Short, easing-based fills; respect **`prefers-reduced-motion`** — swap animations for instant state changes when requested.
- **Sound:** Single pour clip; volume control or mute on presenter; **no autoplay audio on phones** without gesture.

---

## 7. Content model (UX-facing)

- Placeholders like **`[Navn]`** / `{name}` in stems resolve per session from the new hire’s display name.
- **Harmony tiers** at end screen use configurable thresholds + copy (“perfectly roasted blend” vs “more milk and small talk”).
- **Modes:**
  - *Asynkron trakter* — submit anytime; reveal when admin opens presenter.
  - *Live Espresso* — stepped reveal with synced follower views.

---

## 8. Accessibility & i18n

- **v1:** Accessibility explicitly **not** in scope for presenter polish — still avoid trapping focus or unreadable contrast on flows users rely on (NH + team forms).
- **i18n:** Norwegian-first UI strings; structure copy so keys can swap language later.

---

## 9. Anti-patterns

- Competitive framing (“winner/loser”, ranking teammates).
- Tiny tap targets or low-contrast gray-on-gray on mobile follower UI.
- Blocking team phones from seeing **aggregate/harmony** results after submit (they should follow along).
- Running DB migrations only from this repo in production **without** aligning Flyway history — migrations stay in `migrations/` and run via Flyway.

---

## References

- Engineering checklist: [`TASKS.md`](TASKS.md).
- Agent workflow: [`AGENTS.md`](../AGENTS.md).
