# Player Display Design QA

## Evidence

- Source visual truth: the seven approved ImageGen concepts:
  - `C:\Users\Locardo\.codex\generated_images\01a11303-3b3e-7123-970c-abab6efc3132\exec-b53f6ea8-b0d3-4c9d-aea4-7da518047579.png`
  - `C:\Users\Locardo\.codex\generated_images\01a11303-3b3e-7123-970c-abab6efc3132\exec-fea82985-4b14-4674-877b-e985afc0614b.png`
  - `C:\Users\Locardo\.codex\generated_images\01a11303-3b3e-7123-970c-abab6efc3132\exec-906d6922-7833-409d-8e6c-0c415ae646ea.png`
  - `C:\Users\Locardo\.codex\generated_images\01a11303-3b3e-7123-970c-abab6efc3132\exec-142889a4-0f03-49c2-b6a7-b18eb3b80ff1.png`
  - `C:\Users\Locardo\.codex\generated_images\01a11303-3b3e-7123-970c-abab6efc3132\exec-a757e760-db55-4716-a246-444c8adca176.png`
  - `C:\Users\Locardo\.codex\generated_images\01a11303-3b3e-7123-970c-abab6efc3132\exec-c30db85e-47b0-4642-a322-3dade85f37ed.png`
  - `C:\Users\Locardo\.codex\generated_images\01a11303-3b3e-7123-970c-abab6efc3132\exec-c70b628f-72a5-426f-b05f-ab9904612204.png`
- Browser-rendered implementation screenshots: `output/player-display-{rail,satellite,split,tokens,stems,baseline,stack}.png`.
- Full-view paired comparison: `output/player-display-design-qa.jpg`.
- Focused table-region comparison: `output/player-display-design-qa-tables.jpg`.
- Viewport and state: Chrome, 390 × 844 CSS px, deviceScaleFactor 1, dark theme, Obsidian cards, four-player solo game during the call phase.
- Source dimensions: 853 × 1844 px. Each source was normalized to 390 × 844 px for comparison. Implementation captures are native 390 × 844 px.
- Primary interactions tested: opening Settings, changing appearance, changing player display, persistence after reload, starting a solo game, and rendering all seven display styles.
- Console errors checked: none in the final capture.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: Manrope/DM Sans preserve the narrow utilitarian hierarchy of the concepts. Player names, call counts, HP, and active-turn labels remain legible at phone size.
- Spacing and layout rhythm: all seven markers follow the circular table edge without document overflow. The implementation uses slightly smaller markers than the exploratory images to preserve the existing hand and gameplay controls in the 390 px app viewport; this is an intentional product constraint.
- Colors and visual tokens: the black surfaces, low-contrast gray rules, white information, and restrained orange active state match the selected direction in both dark and light design tokens.
- Image quality and asset fidelity: the app uses its existing vector avatar system and user photos. AI players show real app avatar data instead of the illustrative portrait photography used in one concept; this is intentional and avoids introducing fake profile content.
- Copy and content: player name, call/wins, HP, and turn/lead state remain present. Existing game terminology is preserved.
- Accessibility and responsiveness: controls retain accessible names and pressed states; the document width equals the 390 px viewport; the selection persists in local storage.

## Comparison History

- Initial comparison found that Dual tokens constrained names beside the score token and that Score stems/Baseline hid HP.
- Fixes: moved Dual token names below the paired circles, restored compact HP indicators to Score stems and Baseline, and recaptured every style.
- Post-fix evidence: `output/player-display-design-qa-tables.jpg` shows full names where space permits, distinct avatar/score geometry, visible HP, and no marker collisions that block gameplay information.

## Follow-up Polish

- P3: user-supplied photo avatars will make the Satellite style feel closer to its concept than preset line icons; no code change is required.

## Implementation Checklist

- [x] Seven approved player displays implemented.
- [x] Persistent Settings selector implemented.
- [x] IVI wordmark spacing widened at mobile and desktop widths.
- [x] Mobile overflow, persistence, production build, and browser rendering verified.

final result: passed
