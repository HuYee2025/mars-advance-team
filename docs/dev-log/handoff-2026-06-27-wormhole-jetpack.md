# 交接记录：虫洞、远古巨树拱门与飞行背包

更新时间：2026-06-27 23:28 CST

## 当前状态

- 本地测试地址：`http://127.0.0.1:5174/`
- `5173` 当时被占用，当前 Vite dev server 跑在 `5174`。
- 最近一次验证：`npm run build` 通过。
- 当前有未提交改动，主要集中在 `src/main.ts`、`src/world.ts`、`src/style.css`、`index.html`、`docs/dev-log/current-handoff.md`，并新增 `docs/site-planning/` 与 `src/assets/wormhole-swirl-generated.png`。

## 最近实现重点

- 背面黑暗半球新增“远古巨树拱门”，一体化石化树桩形态，实体柱子有碰撞，中间门洞可通行。
- 拱门主体已下沉，两侧尖角埋入火星土里；门洞中间不再铺额外坡道，直接走火星地表。
- 拱门门洞内有周期性蓝白星门光效，约每 `180s` 开启一次，持续约 `28.5s`。
- 光效激活时穿过门洞会触发 `wormholeFall` 虫洞坠落事件。
- 虫洞期间暂停普通移动、互动、喷气背包、碰撞任务触发和氧气消耗。
- 虫洞前约 `20s` 使用蓝色漩涡星云背景，后约 `10s` 红色火星点出现并放大，最后安全落回出生点。
- 当前虫洞背景使用 Image 生成图：`src/assets/wormhole-swirl-generated.png`。
- 虫洞速度线改为日漫式直线透视：远处细，靠近人物更粗。
- 虫洞中 `W/A/S/D` 控制轻微画面漂移，松开自动回中；`C` 仍可切换第一/第三人称。
- 飞行背包拆成两种：
  - `HUYEE`：临时飞行背包，落地或重生后消失，不显示 HUD 能量。
  - `上 上 下 下 左 左 右 右`：常备飞行背包装备，键盘方向键、`WASD` 和触屏摇杆都支持，HUD 显示“飞行背包 / Jetpack”能量。
- 常备飞行背包落地后保留，可双击 `Space` 或触屏双击“跳”再次启动。
- 常备背包飞行时能量下降，落地后从当前值到 `100%` 固定约 `10s` 线性恢复。

## 当前用户最新反馈

用户希望继续微调虫洞：

- 人物要在屏幕居中，不要偏上。
- 人物要能看到整体轮廓，大概占画面 `2/3`，不要太大。
- `W/A/S/D` 要能让人物在屏幕上下左右移动一定距离。
- 射线应是直线速度线，有纵深透视：远处细，靠近人物粗。
- 蓝色漩涡背景要高清，有星星点点，旋转要再快一点，有原地旋转速度感。

最近已按这些方向改了一轮，但还没有经过用户最终确认。

## 关键源码位置

- 虫洞触发与状态：
  - `src/main.ts`：`maybeTriggerWormholeFall()`
  - `src/main.ts`：`startWormholeFall()`
  - `src/main.ts`：`updateWormholeFall()`
  - `src/main.ts`：`finishWormholeFall()`
- 虫洞视觉：
  - `src/main.ts`：`createWormholeFallVisual()`
  - `src/main.ts`：`createWormholeGeneratedTexture()`
  - `src/main.ts`：`createWormholeSwirlTexture()`
  - `src/main.ts`：`updateWormholeFallVisual()`
  - `src/main.ts`：`updateWormholeCamera()`
  - `src/main.ts`：`updateWormholePlayerPose()`
- 飞行背包：
  - `src/main.ts`：`activateTemporaryJetpack()`
  - `src/main.ts`：`unlockEquipmentJetpack()`
  - `src/main.ts`：`activateEquipmentJetpack()`
  - `src/main.ts`：`updateJetpackEnergy()`
  - `src/main.ts`：`handleKeyboardFlightCodeKey()`
  - `src/main.ts`：`handleMobileFlightCodeGesture()`
  - `src/main.ts`：`handleJumpPress()`
- HUD：
  - `index.html`：`#jetpack-status-row`
  - `src/main.ts`：`updateReadouts()`
- 古树拱门模型和星门光效：
  - `src/world.ts`

## 测试建议

1. 刷新 `http://127.0.0.1:5174/`。
2. 输入或触屏摇杆完成 `上 上 下 下 左 左 右 右`，确认常备飞行背包 HUD 出现。
3. 飞到远古巨树拱门附近，等待蓝光开启。
4. 蓝光开启后穿过门洞，确认触发虫洞。
5. 虫洞前 `20s` 检查：
   - 人物是否居中。
   - 是否能看到完整轮廓。
   - `W/A/S/D` 是否能让人物在画面中上下左右漂移。
   - 速度线是否像直线透视，而不是乱折线。
   - 蓝色漩涡是否清晰、旋转速度是否合适。
6. 虫洞后 `10s` 检查红色火星点放大和安全落地。
7. 常备飞行背包落地后检查能量是否约 `10s` 恢复到 `100%`。

## 注意事项

- 不要删除 `src/assets/wormhole-swirl-generated.png`，当前虫洞主背景依赖它。
- Image 生成图原始文件保留在 `/Users/huyi/.codex/generated_images/019f05f1-1326-7c83-a4c3-21d5ef52f708/`，项目中使用的是复制后的 `src/assets/wormhole-swirl-generated.png`。
- 如果继续调虫洞，优先改 `updateWormholeCamera()` 和 `updateWormholeFallVisual()`，避免影响普通游戏镜头。
- 如果虫洞效果仍不满意，可以考虑完全隐藏硬速度线，只保留旋转漩涡背景和少量半透明直线。
- 当前文档 `docs/dev-log/current-handoff.md` 已同步记录主要状态；本文件是更短的专项交接。
