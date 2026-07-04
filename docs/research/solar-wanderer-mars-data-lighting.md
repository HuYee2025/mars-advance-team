# Solar-Wanderer 对火星真实数据与光照的可用性研究

更新时间：2026-07-04

研究对象：

- GitHub 仓库：`https://github.com/hyqzz/Solar-Wanderer`
- 本次检查 commit：`c88ac40b15dcaa5fa33a16d14ca6f102d5bf7a50`
- 仓库定位：浏览器端 1:1 实时太阳系探索器，Three.js + Vite，MIT 协议。

## 结论

Solar-Wanderer 对本项目最有价值的是“真实太阳位置/行星自转/太阳光照方向”的计算和 shader 思路，不是火星近地表素材。

它当前包含火星整球贴图 `public/textures/mars.jpg`，尺寸 `8192 x 4096`，适合远景整球、地图底图、对话背景或轨道视角参考；但不适合直接作为玩家脚下的真实火星表面图片。真实 DEM 地形、MOLA/HiRISE 瓦片流式加载在仓库 README 和 ROADMAP 中属于计划目标，源码有接口雏形，但默认 URL 仍是占位/示例性质，不能直接当成已完成数据管线。

## 对本项目可借鉴的内容

### 1. 真实太阳光照方向

可借鉴：

- `src/astro/planets.js`：用 JPL Standish 行星元素或 VSOP87 计算行星日心位置。
- `src/astro/rotation.js`：用 IAU/WGCCRE 自转模型计算行星姿态。
- `src/scene/builder.js`：每帧根据火星到太阳的向量更新 `uSunDir`，并按距离计算太阳辐照度。
- `src/scene/planetMaterial.js`：shader 中根据 `dot(normal, sunDir)` 生成昼夜明暗和晨昏线。
- `src/scene/atmosphere.js`：Rayleigh + Mie 单次散射，火星大气参数考虑尘埃、蓝色日落和雾霾。

对我们项目的用法：

- 先不要整体搬 Solar-Wanderer 的 1:1 天文尺度系统。
- 抽出一个轻量 `marsSunModel`：输入真实时间或游戏内 sol，输出火星表面的太阳方向向量、太阳高度角、太阳方位角、昼夜强度。
- 用该方向替换当前 `src/main.ts` 里预设的 `DirectionalLight` 方向。
- 继续保留我们现有低多边形基地、美术风格、雷达和任务系统。

### 2. 火星大气和日落观感

可借鉴：

- 火星白昼偏黄褐、日落太阳附近偏蓝的视觉设定。
- 大气散射单独放 shader，而不是只靠环境光调色。
- 风暴季/尘埃雾霾可以作为游戏事件调节光照和能见度。

对我们项目的用法：

- 第一阶段只做轻量版：按太阳高度角插值天空色、雾色、太阳光色和阴影强度。
- 第二阶段再考虑移植 `createAtmosphere()` 这类 shader 壳层。

### 3. 真实火星地标坐标

可借鉴：

- `src/scene/landmarks.js` 包含 Perseverance、Curiosity、Zhurong、Opportunity 的经纬度、简化模型和路径点结构。
- 它的 `latLonToDir()` 坐标映射方式适合我们未来把真实地标投到小星球表面。

对我们项目的用法：

- 机遇号遗迹目前已经是项目内隐藏点。后续可以把它从游戏坐标改成真实经纬度驱动，再映射到小星球坐标。
- 如果扩展“真实火星探索点”，优先做 3-5 个地标：Jezero、Gale、Meridiani Planum、Olympus Mons、Valles Marineris。

## 不建议直接使用的内容

### 1. 不直接使用 `mars.jpg` 作为近地表真实图片

原因：

- 它是整球贴图，近距离会糊。
- 来源在 README 中写为 Solar System Scope、Steve Albers SOS、NASA JPL Photojournal 混合；版权约束不是单一 public domain。
- 它不是玩家脚下地表照片，也不是 HiRISE 级局部实拍。

可用边界：

- 可作为远景火星球体贴图参考。
- 可作为压缩后的对话背景/地图底图参考。
- 若使用，需要保留来源和许可证说明，尤其注意 Solar System Scope 的 CC-BY-4.0 署名要求。

### 2. 不直接依赖仓库内 DEM URL

原因：

- `src/scene/demTiles.js` 明确说 URL 是占位符，真实部署时要替换为可用的 CORS-enabled 瓦片服务。
- ROADMAP 也明确当前短板是“地形是程序噪声生成，不是真实 DEM”。

可用边界：

- 可以借它的 DEM tile streaming 设计：金字塔瓦片、LRU 缓存、同步采样、无网回退到程序化地形。
- 数据源需要我们自己选定、下载、切片、压缩和托管。

## 推荐数据方案

### 火星表面图片

如果要求“图片真实”，优先用 NASA/JPL/HiRISE 或 PDS/USGS 来源，不用普通素材站。

推荐分层：

- 远景整球：NASA/USGS 全局火星 basemap 或 MOLA shaded relief。
- 近地表局部：HiRISE 真实图像，选择一块适合基地附近的沙地/岩地，裁成无缝或半无缝地表贴图。
- 高度地形：MOLA 全球 DEM 做大尺度地形；局部区域需要更真实时，用 HiRISE DTM 或 HRSC/MOLA blended DEM。

首个可执行落点：

- 不做全火星 DEM 流式加载。
- 先选一个固定基地区域视觉包：`albedo/basecolor + roughness + normal/height`，来源写清楚，用作基地周边 200-400 游戏单位内的地表纹理。

### 太阳光照

如果要求“太阳光照真实”，优先实现这三层：

1. 真实太阳方向：按火星自转、太阳位置和游戏时间计算。
2. 真实昼夜/晨昏线：地表 normal 与太阳方向点积决定直射光。
3. 火星大气色彩：按太阳高度角调天空色、雾色、太阳颜色，后续再上大气散射 shader。

## 建议进入项目的下一步

第一步最适合做“真实太阳光照 MVP”，不要先做全量 DEM。

理由：

- 我们已有小星球、基地、暗面蜘蛛、太阳能阵列和太阳雷达点，光照真实化会立刻提升全局可信度。
- 改动范围比 DEM 小，不会推翻当前地图、碰撞、任务和移动端性能。
- 还能服务玩法：太阳能阵列朝向、暗面蜘蛛避光、真实昼夜/黄昏氛围。

建议任务拆法：

1. 新增 `src/mars-sun-model.ts`，只输出太阳方向和太阳高度角。
2. 替换 `src/main.ts` 的 `sunLight.position` 更新逻辑。
3. 让 `updateSolarArrays()`、暗面蜘蛛避光和可见太阳位置统一使用同一个太阳方向。
4. 增加一个开发 HUD/日志，用当前时间验证太阳高度角和方位角。

真实火星表面图片作为第二步：先选定一个 NASA/HiRISE 局部图像做基地地表纹理，不先引入全火星瓦片服务。

