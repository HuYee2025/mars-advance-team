# 美术方向：火星低多边形工程科幻

## 目标

项目不追求写实 3D。第一版采用“低多边形但精细”的风格：大块面、清楚轮廓、鲜明配色、可读性强，参考 `Caravan SandWitch` 的温暖探索感和 `Messenger` 的小世界流程。

## 参考资产

- 角色概念图：`assets/concepts/mars-engineer-character.png`
- 车辆/机器人概念图：`assets/concepts/mars-rover-robots.png`
- 基地布局概念图：`assets/concepts/mars-base-layout.png`
- 故事页首屏火星地表背景：`assets/story/mars-surface-hero.png`
- 福福宇航服概念图：`assets/concepts/fufu/fufu-astronaut-concept.png`
- 福福深色角色立绘：`assets/portraits/fufu-dialogue.png`
- Elon 概念图：`assets/concepts/elon-character-concept.png`
- Elon 对话图：`assets/portraits/elon-dialogue-transparent.png`
- Elon 绿幕源图：`assets/portraits/elon-dialogue-green.png`
- 放大缩小枪概念图：`assets/concepts/scale-gun-concept.png`

这些图用于方向确认，不直接作为游戏贴图。

## 可落地规则

- 角色必须看得出头、身体、手臂、腿、靴子、手套、背包、面罩。
- 车辆必须看得出车身、轮子、传感器、货仓或机械臂。
- 建筑必须看得出功能差异：居住舱、温室、氧气站、燃料站、车库、通信塔。
- 所有模型先用 Three.js 几何体拼装，不要求用户使用 Blender。
- 颜色控制在少数几类：火星红、暖白舱体、石墨黑结构、橙色安全件、蓝色状态灯、温室绿色。
- 远端异常物可以更克制：黑色石碑使用纯黑长方体、极少边线和暗色接触阴影，作为背光区域里的沉默地标。
- 福福相关飞船遗骸背景应偏 SpaceX Starship 式薄壁不锈钢工业感：圆筒壳体、环形接缝、锐利破口、尘土和少量结构梁即可；不要厚重装甲感，也不要湿漉漉、粘稠、滴落或有机感破损物。
- 手持工具优先做成低多边形、清晰剪影的小道具；颜色沿用暖白外壳、石墨黑结构、橙色安全件和蓝色发光镜头，避免过度写实或武器化。

## 不做

- 不复制 `Caravan SandWitch` 或 `Messenger` 的角色、车辆、地图、UI、Logo。
- 不追求电影级写实。
- 不依赖用户手动建模或导出资产。
- 第一阶段不做复杂骨骼动画，只做程序化走路摆动和车辆巡逻。
