# 美术方向：火星低多边形工程科幻

## 目标

项目不追求写实 3D。第一版采用“低多边形但精细”的风格：大块面、清楚轮廓、鲜明配色、可读性强，参考 `Caravan SandWitch` 的温暖探索感和 `Messenger` 的小世界流程。

## 参考资产

- 角色概念图：`assets/concepts/mars-engineer-character.webp`
- 车辆/机器人概念图：`assets/concepts/mars-rover-robots.webp`
- 基地布局概念图：`assets/concepts/mars-base-layout.webp`
- 故事页首屏火星地表背景：`assets/story/mars-surface-hero.webp`
- 福福宇航服概念图：`assets/concepts/fufu/fufu-astronaut-concept.webp`
- 福福深色角色立绘：`assets/portraits/fufu-dialogue.webp`
- Elon 概念图：`assets/concepts/elon-character-concept.webp`
- Elon 对话图：`assets/portraits/elon-dialogue-transparent.webp`
- Elon 绿幕源图：`assets/portraits/elon-dialogue-green.png`
- 放大缩小枪概念图：`assets/concepts/scale-gun-concept.webp`
- 黑色方碑绿幕源图：`assets/portraits/monolith-dialogue-green.png`
- 黑色方碑透明对话立绘：`assets/portraits/monolith-dialogue-transparent.webp`

这些图主要用于方向确认；默认预览和网页引用使用 WebP 压缩版本，PNG 原图只作为后续再处理的源文件。

## 可落地规则

- 角色必须看得出头、身体、手臂、腿、靴子、手套、背包、面罩。
- 车辆必须看得出车身、轮子、传感器、货仓或机械臂。
- 建筑必须看得出功能差异：居住舱、温室、氧气站、燃料站、车库、通信塔。
- 所有模型先用 Three.js 几何体拼装，不要求用户使用 Blender。
- 颜色控制在少数几类：火星红、暖白舱体、石墨黑结构、橙色安全件、蓝色状态灯、温室绿色。
- 远端异常物可以更克制：黑色方碑使用宽直立矩形、纯黑表面和极少边线，不设底座、不加圆形接触盘，像直接埋在火星土里；画面关系依靠太阳方向形成的投影来表达。
- 黑色方碑对话立绘采用 45 度视角；绿色背景只用于抠图源，运行时必须使用透明背景版本。缩放枪只能作为对话框内物品图出现，不能替代方碑成为对话对象。
- 福福相关飞船遗骸背景应偏 SpaceX Starship 式薄壁不锈钢工业感：圆筒壳体、环形接缝、锐利破口、尘土和少量结构梁即可；不要厚重装甲感，也不要湿漉漉、粘稠、滴落或有机感破损物。
- 手持工具优先做成低多边形、清晰剪影的小道具；颜色沿用暖白外壳、石墨黑结构、橙色安全件和蓝色发光镜头，避免过度写实或武器化。
- 远处太阳要有清楚的实体球轮廓，但不能像月亮；主体应是黄白到橙红的火球，有火纹、日冕和明显外光晕，光晕服务于“燃烧感”，不能退回成一团无结构的朦胧光斑。
- 陨石主体不是发光球，而是不自发光的灰黑石质小天体；运行时使用 `src/assets/meteor-rock-generated.png` 作为低精度坑洼贴图，尾迹应接近火星车粉尘的雾态 sprite，避免线条、光圈或太阳式发光感。
- NASA Perseverance 纪念火星车应偏真实低多边形：六轮、摇臂悬挂、桅杆相机、机械臂、仪器箱和后部 RTG 圆筒是主要识别点；体量要小，不抢基地建筑主视觉。

## 不做

- 不复制 `Caravan SandWitch` 或 `Messenger` 的角色、车辆、地图、UI、Logo。
- 不追求电影级写实。
- 不依赖用户手动建模或导出资产。
- 第一阶段不做复杂骨骼动画，只做程序化走路摆动和车辆巡逻。
