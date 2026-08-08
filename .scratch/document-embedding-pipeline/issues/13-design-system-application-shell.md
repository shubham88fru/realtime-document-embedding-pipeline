# 13 — Design system and application shell

**What to build:** An original, app-specific visual system and responsive application shell inspired by Airtop's calm editorial qualities, plus a redesign of the existing sign-in and authenticated foundation screens. This ticket defines presentation primitives only; upload, WebSocket, retry, and pipeline behavior remain in their owning tickets.

**Blocked by:** 01 — Project setup and infrastructure foundation, 03 — Google authentication

**Status:** ready-for-agent

- [ ] Semantic color tokens for canvas, surfaces, text, borders, actions, focus, and the four persisted document statuses
- [ ] Typography roles configured with an open-source display face, Geist for UI/body copy, and Geist Mono for numeric progress
- [ ] Responsive application shell with product identity, authenticated user controls, and slots for connection/status feedback
- [ ] Existing Google sign-in page redesigned without changing authentication behavior
- [ ] Shared surface, capsule button, status pill, progress, notice, empty-state, and loading-state variants
- [ ] Original atmospheric background treatment using CSS or project-owned assets
- [ ] Responsive layouts validated at mobile, tablet, and desktop widths
- [ ] WCAG 2.2 AA contrast, visible focus, keyboard navigation, 44px touch targets, and reduced-motion behavior
- [ ] Component tests cover semantic states and existing authentication behavior remains green
- [ ] Browser-based visual QA completed for sign-in and authenticated shell

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
