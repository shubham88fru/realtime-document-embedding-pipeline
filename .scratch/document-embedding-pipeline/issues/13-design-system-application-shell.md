# 13 — Design system and application shell

**What to build:** An original, app-specific visual system and responsive application shell inspired by Airtop's calm editorial qualities, plus a redesign of the existing sign-in and authenticated foundation screens. This ticket defines presentation primitives only; upload, WebSocket, retry, and pipeline behavior remain in their owning tickets.

**Blocked by:** 01 — Project setup and infrastructure foundation, 03 — Google authentication

**Status:** done

- [x] Semantic color tokens for canvas, surfaces, text, borders, actions, focus, and the four persisted document statuses
- [x] Typography roles configured with an open-source display face, Geist for UI/body copy, and Geist Mono for numeric progress
- [x] Responsive application shell with product identity, authenticated user controls, and slots for connection/status feedback
- [x] Existing Google sign-in page redesigned without changing authentication behavior
- [x] Shared surface, capsule button, status pill, progress, notice, empty-state, and loading-state variants
- [x] Original atmospheric background treatment using CSS or project-owned assets
- [x] Responsive layouts validated at mobile, tablet, and desktop widths
- [x] WCAG 2.2 AA contrast, visible focus, keyboard navigation, 44px touch targets, and reduced-motion behavior
- [x] Component tests cover semantic states and existing authentication behavior remains green
- [x] Browser-based visual QA completed for sign-in and authenticated shell

## Comments

### Direction: Cloudline Hybrid

The direction borrows visual principles from Airtop's lead-generation page —
airy spacing, cloud-blue and blush atmosphere, slate-blue ink, rounded display
type, capsule actions, high-radius surfaces, and restrained shadows — but not
its assets, logo, copy, proprietary fonts, or page composition.

This is a product workspace, not a marketing-page clone. The sign-in and empty
states can be editorial and spacious; active document work must remain compact
and scannable.

Proposed starting tokens:

- canvas `#F7FAFC`
- cloud mist `#EAF3F8`
- blush wash `#F7ECEE`
- slate ink `#425568`
- deep ink `#293A49`
- action blue `#5F819C`
- success sage `#4F806B`
- error rose `#B85D67`

Use Manrope Variable 300–500 for display copy, Geist for UI/body copy, and
Geist Mono for percentages and timestamps. Major surfaces use 32–40px radii;
cards 20–24px; controls 12–16px; primary actions are capsules.

The application name remains **Document Embedding Pipeline** as a typographic
wordmark unless a separate naming decision is made.

### Truthful state contract

The design system must not invent pipeline stages or progress:

- `uploading` is a temporary client state only while bytes are being sent
- persisted document states are exactly `uploaded`, `processing`, `complete`,
  and `error`
- determinate progress is shown only from a real transfer percentage or the
  persisted `progress_percentage`
- unknown work uses an indeterminate treatment, not a fabricated percentage
- labels such as “extracting,” “embedding,” or “storing” are not rendered unless
  a later backend contract explicitly emits and persists that phase

Status is never communicated by color alone.

### Implementation

- `src/app/globals.css` contains the semantic light/dark tokens, atmospheric
  canvas, shadows, indeterminate motion, and reduced-motion behavior.
- Manrope is the display face; Geist remains the body/UI face and Geist Mono is
  used for numeric progress.
- `AppShell` provides the sticky responsive banner, full product wordmark,
  authenticated controls, and a status slot that remains visible on mobile.
- The sign-in page and authenticated empty workspace were rebuilt with original
  CSS atmosphere and app-specific copy.
- Shared primitives now include `DocumentStatusPill`, `PipelineProgress`,
  `Notice`, `EmptyState`, and `LoadingState`; existing button, badge, card, and
  progress primitives carry the Cloudline geometry and depth.

No upload, WebSocket, retry, quota, extraction, embedding, or storage behavior
was added. The authenticated workspace shows only configured limits, the four
persisted statuses, and a real empty collection.

### Accessibility and visual QA

- Browser QA completed at 390px, 768px, and 1440px for sign-in and the
  authenticated shell with no horizontal overflow or console errors.
- Keyboard focus was visibly present; interactive header and sign-in targets are
  at least 44px.
- Reduced-motion emulation reduces transitions to effectively zero and removes
  indeterminate travel.
- Light-theme contrast ratios: primary button 7.53:1, body text 11.16:1,
  muted text 4.63:1, action text at least 4.54:1 across Cloudline surfaces, and
  every status pair at least 4.90:1.
- 36 unit/component tests and 21 database integration tests pass; typecheck,
  lint, and the production build pass.

### Review findings, all addressed

1. The compact wordmark shortened the application name; the full name now
   remains visible at every breakpoint.
2. The status slot disappeared on mobile; it now reflows to its own header row.
3. Workspace copy implied unlimited batches; it now states only the configured
   per-upload selection limit.
4. Shared cards used 28px radii instead of the specified 20–24px; they now use
   24px.
5. Compact button variants fell below 44px; all interactive variants now keep
   the minimum target.
6. Determinate progress lacked semantic test coverage; the real percentage path
   now verifies `aria-valuenow` and visible value.
7. Action and notice descriptions missed AA contrast; tokens and description
   opacity were corrected and measured.
8. Root overflow prevented the sticky header from sticking; horizontal clipping
   no longer creates a scroll container.
9. Dark chart/sidebar token overrides were lost during retheming; they are
   restored.
10. Repeated backdrop and byte-formatting logic were extracted into shared
    interfaces.
11. Muted text over the blush wash and the wordmark focus ring missed their AA
    contrast thresholds; muted text was darkened and the ring is now opaque.
