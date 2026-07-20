# Changelog

## 0.2.1 — 2026-07-20

- Split rover interaction into `Q Drive vehicle (free)` and `E Hitch a ride (10 coins)`.
- Driving now takes over the current rover and pauses its automatic route; hitching keeps the passenger behavior.
- Verification: `npm test`, `npm run build`, `npm run i18n:audit`, and Playwright interaction preview.

## 0.2.0 — 2026-07-20

- Added the spherical Mars Cybertruck driving prototype with throttle, steering, boost, braking, collision clearance, wheel spin, and surface effects.
- Added a development preview at `?cybertruck-drive-preview` and documented high-resolution Cybertruck GLB candidates and licensing risks.
- Verification: `npm test`, `npm run build`, and Playwright preview launch.

## 0.1.0 — 2026-07-20

- Baseline rollback snapshot before the Mars vehicle driving prototype.
- Preserves the current gameplay, UI, model, and research changes already present in the working tree.
