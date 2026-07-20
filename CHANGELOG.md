# Changelog

## 0.2.4 — 2026-07-20

- Restrict the title-screen update list to `gameplay` entries so bug fixes and build maintenance never displace a gameplay update.
- Verification: `npm run build`, `npm test`, and `npm run i18n:audit`.

## 0.2.3 — 2026-07-20

- Added the data-driven title-screen update list; it automatically shows the latest three gameplay updates and uses the newest update date as the heading.
- Added `03 驾驶 Cybertruck 在火星上奔驰` dated `7月20日`.
- Verification: `npm run build`, `npm test`, and `npm run i18n:audit`.

## 0.2.2 — 2026-07-20

- Hide Alex's character model during both driving and hitching; restore it immediately after getting off.
- Verification: `npm run build`, `npm test`, `npm run i18n:audit`, and Playwright rover preview.

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
