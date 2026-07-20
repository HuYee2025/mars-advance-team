# Cybertruck GLB 候选清单

更新时间：2026-07-20

## 结论

先用现有程序车完成驾驶手感；高精模型等驾驶原型稳定后再购买/接入。真正适合接入的模型必须确认：GLB/GLTF 可导出、车轮节点可独立旋转、材质贴图可在 Three.js 正常加载、授权覆盖本项目。

## 候选

| 候选 | 格式/体量 | 适合度 | 备注 |
| --- | --- | --- | --- |
| [ArtStation Tesla Cyber Truck 2025](https://www.artstation.com/marketplace/p/ebVv2/) | GLB，约 99MB | 首选外观 | 页面标注 rigged wheels + adjustable suspension；约 $50。当前页面提示部分地区不可用，购买前需确认节点命名和授权。 |
| [CGTrader 2024 Tesla Cyber Truck](https://www.cgtrader.com/3d-models/car/suv/tesla-cyber-truck-2024) | GLTF，约 80.2MB | 性价比候选 | Royalty Free、PBR、Rigged；页面未明确独立轮子节点，需购买后检查。 |
| [CGTrader 2025 Tesla Cybertruck](https://www.cgtrader.com/3d-models/car/suv/2025-tesla-cybertruck) | 多级 GLB，最高约 406 万面 | 旗舰候选 | 有低/中/高精度版本，约 685MB、约 $149；适合英雄车辆，不适合当前首轮原型。 |
| [CGTrader Tesla Cybertruck interior/exterior](https://www.cgtrader.com/3d-models/car/sport-car/tesla-cybertruck-3d-model-interior-and-exterior) | GLTF，约 22.7MB | 中期候选 | Royalty Free、PBR、Rigged；完整内外饰，仍需确认轮子节点。 |
| [Babylon Cybertruck demo GLB](https://punkoffice.com/cybertruck/assets/cybertruck.glb) | GLB，约 115KB | 仅原型占位 | 约 1,160 三角形、单 mesh、无独立车轮，论坛作者允许使用，但没有明确商业授权，不进入正式版本。 |

## 接入方案

模型接入不改变驾驶物理：保留 `src/main.ts` 的球面切平面控制和 `src/world.ts` 的车辆变换，只把 `createCybertruckRover()` 的视觉 fallback 替换成 GLB，并将车轮节点绑定到现有轮子旋转状态。模型文件体量超过 20MB 时，必须走现有 `attachCoreLodModel` 的异步加载/LOD，不要把高精度网格首屏硬塞进主包。
