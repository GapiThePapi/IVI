# Menu, Cards, Settings, and Prediction Design QA

## Evidence

- Source visual truth:
  - `.codex-remote-attachments/01a1176b-a59f-75a0-8904-9d5bb213e9f7/fadeb244-5b08-45aa-a9eb-c2df6e71642f/1-1000010787.jpg`
  - `.codex-remote-attachments/01a1176b-a59f-75a0-8904-9d5bb213e9f7/fadeb244-5b08-45aa-a9eb-c2df6e71642f/2-1000010794.jpg`
  - `.codex-remote-attachments/01a1176b-a59f-75a0-8904-9d5bb213e9f7/fadeb244-5b08-45aa-a9eb-c2df6e71642f/3-1000010793.jpg`
  - `.codex-remote-attachments/01a1176b-a59f-75a0-8904-9d5bb213e9f7/fadeb244-5b08-45aa-a9eb-c2df6e71642f/4-1000010792.jpg`
  - `.codex-remote-attachments/01a1176b-a59f-75a0-8904-9d5bb213e9f7/fadeb244-5b08-45aa-a9eb-c2df6e71642f/5-1000010791.jpg`
- Browser-rendered implementation screenshots:
  - `design/qa-home-mobile.png`
  - `design/qa-card-gallery-mobile.png`
  - `design/qa-settings-player-display-mobile.png`
  - `design/qa-table-mobile.png`
- Viewport and state:
  - Home, card gallery, and table: Chrome at 390 × 844 CSS px, deviceScaleFactor 1.
  - Settings focused capture: 296 × 544 px visible dialog region inside the 320 × 568 viewport.
  - Home: light theme with no saved profile name.
  - Gallery: light IVI Essential family, first of ten designs.
  - Table: dark theme, four-player five-card bidding phase before the current player commits.
- Source dimensions: 576 × 1280 px including Android device chrome. Implementation captures are app-content browser captures. Comparison used the app-owned content regions and ignored the source status/navigation bars rather than treating device chrome as a fidelity difference.
- Primary interactions tested: opening How to play from the fourth home action, changing light/dark appearance, changing and persisting the player display, opening and selecting card designs, starting solo play with no reconnect action, and completing a multiplayer bidding/round flow.
- Console errors checked in the Codex in-app browser: none.

## Full-View Comparison Evidence

- Home: the implementation removes the top-left logo/wordmark, retains Settings at top right, places the enlarged avatar above the name, and presents four equal-size text-only buttons. The light-mode buttons are white with no visible border; dark mode maps the same treatment to the raised neutral surface.
- Card gallery: the two-column phone composition, large Roman numerals, set colors, special card, and branded back preserve the supplied art direction. Cards are consistently rounded and borderless. The level-four sample retains `XIII` but no longer displays `L4` or `LEVEL 4`.
- Settings: player display choices use visual player-marker previews in selectable tiles, matching the browsing pattern used for card styles.
- Bidding: the prediction sum is visible in the empty table center as `Prediction total`, current total, and fight count without covering the hand or bid controls.

## Focused Region Comparison Evidence

- Home controls: compared avatar/name placement, top-corner controls, button height, label alignment, border treatment, and vertical rhythm at 390 × 844.
- Card samples: compared corner labels, central values, radii, border treatment, special-card composition, and back treatment at 390 × 844.
- Settings tiles: inspected selected state, check indicator, preview readability, two-column phone grid, and one-column fallback below 360 px.
- Table center: inspected the prediction total against all four player markers and verified the hand and prediction controls remain unobstructed.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: bundled Manrope/DM Sans preserve the clean geometric hierarchy; home labels, Roman card values, settings metadata, and the prediction total remain legible at phone size.
- Spacing and layout rhythm: the portrait-first profile has clear separation from the four actions; card and player-style grids keep consistent gaps; table center information does not collide with seats. The 320 × 568 home can scroll a few pixels because the requested button size and larger avatar are preserved, but every control remains visible and reachable; this is acceptable P3 behavior.
- Colors and visual tokens: light actions use white surfaces and dark actions use neutral raised surfaces with no accent fill or border. Orange remains limited to selection and turn feedback.
- Image quality and asset fidelity: supplied card imagery is translated with the existing sharp vector mascot/avatar asset, not a placeholder. The app does not recreate Android chrome.
- Copy and content: the new `How to play` label appears in the requested fourth position; `Prediction total` and `of N fights` make the sum unambiguous; visible `L4` and `LEVEL 4` text is absent from level-four cards.
- Accessibility and responsiveness: controls retain semantic buttons, accessible names, pressed states, 44 px minimum targets, keyboard dialog behavior, and no horizontal overflow across 320–1920 px test viewports.

## Comparison History

- Iteration 1 finding [P2]: player-display preview tiles inherited an older two-column button layout, compressing each visual sample into half of its tile.
  - Fix: reset each option to one internal column, use a two-up option gallery on normal phones, and fall back to one column below 360 px.
  - Post-fix evidence: `design/qa-settings-player-display-mobile.png` and the in-app browser capture show full-width, readable previews.
- Iteration 2 finding [P2]: light-mode secondary home actions inherited the old gray control surface while only Play solo was white.
  - Fix: explicitly override first and non-first home actions with the same theme-aware surface and borderless treatment.
  - Post-fix evidence: `design/qa-home-mobile.png` shows all four actions on matching white surfaces.
- Capture normalization: the first file-backed home capture landed during the splash and the first gallery capture used a desktop viewport. The capture tests now wait for splash completion and set the requested light/mobile state before saving evidence.

## Implementation Checklist

- [x] Live prediction sum added to bidding.
- [x] Portrait-first home profile and larger avatar implemented.
- [x] How to play moved into the fourth home action.
- [x] Theme-aware text-only, borderless home actions implemented.
- [x] Solo reconnect action removed.
- [x] Rounded, borderless card families retained across all ten presets.
- [x] Visible level-four labels removed while preserving accessible level information.
- [x] Top-corner logo/IVI wordmark removed.
- [x] Player display settings converted to visual style previews.
- [x] Type check, unit tests, build, responsive tests, and multiplayer prediction-flow test passed.

## Follow-up Polish

- P3: a very short 320 × 568 viewport has a small amount of vertical scroll on the home screen because all four requested full-size actions and the larger profile image are preserved.

## Previous Player-Display QA

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

previous result: passed

final result: passed
