# Minimal Decki design QA

Source visual truth: .codex-remote-attachments/01a1021d-7c36-7a02-9196-ccb28582c0bb/2b1409ae-fbe0-4aec-b360-9493a75badb9/1-1000010762.jpg (1280 x 853).
Implementation evidence: test-results/minimal-phone.png (390 x 844 CSS/pixel viewport, 1x), test-results/minimal-compact.png (360 x 740, 1x). Desktop reviewed at 1100 x 850. State: offline practice, second fight, human turn, partial-progress orange count.

## Comparison
Reference and phone screenshot opened together in one image comparison input. Source is a card sheet, not a whole-screen mockup; compare card faces proportionally, and assess the surrounding table against the user's written requirements. Source cards approximately 220 x 356; app cards approximately 68 x 97 on mobile. Intentional adaptations: compact game proportions, corner numerals indicate level 1–4 (earlier user requirement), center Roman numeral indicates value I–X, bottom corner rotated for card orientation. Cards are semantic game controls with actual selectable text/value content, not decorative image assets.

Typography: black Times-style serif card values; simple sans-serif controls; enlarged won/call counts. Spacing: hand centered, owners and cards grouped, numbered play sequence. Colors: neutral black by default, green exact, orange partial progress. Image fidelity: plain white faces, thin black outline, rounded corners; no illustrations to recreate. Copy: Leads, Played, Waiting, Your turn, Won / Call.

## Findings and iterations
- Initial mobile play-order labels truncated by an inherited maximum width. Removed that limit and recaptured; complete labels visible.
- Initial compact screen clipped the bottom row of cards. Reduced redundant space above and within the table; recaptured at 360 x 740. All four cards and the hand remain visible. The table independently scrolls for history/larger games.
- No remaining actionable P0/P1/P2 differences in the reviewed views.

## Interaction evidence
Browser tested a complete upward drag: the selected card left the hand and appeared under its owner. Tapping and dragging less than the threshold did not play. Offline bots advance normally. No browser console errors. TypeScript check and production build passed; 47 unit/integration tests passed, including gesture direction, call colors, and clockwise order from leader. Existing browser test sources updated for gestures/keyboard play; their CLI suites were not run. Physical Android touch behavior remains unverified; browser pointer drag verified.

## Follow-up polish
No blocking polish items. No physical-device screenshot available in this environment.

final result: passed
