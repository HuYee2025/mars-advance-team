# 决策记录

## 2026-06-24

### 玩家背景页视觉优化

原因：

用户希望用 `frontend-design` 优化 `docs/story/core-story-v2-visual.html`，让该页面更像玩家可读的游戏背景介绍，而不是普通文档页。随后用户进一步要求：封面居中、不拉大字距；删除“创作基准”；内容改成更像真实档案的故事页；福福角色卡使用和其他角色一致的深色背景。

决策：

- 页面定位为“火星任务档案”风格：首屏使用基地概念图、任务状态条和大标题建立沉浸感。
- 封面标题居中排列，不再拆字拉开字间距。
- 保持玩家公开信息边界：不展示隐藏角色 Elon，不恢复“场景与资产”概念设定区。
- 删除“创作基准”区和“玩家/创作者/游戏背景页”等出戏表达，整体改成 ARES BASE ALPHA 公开档案口吻。
- 色彩基于火星尘土、薄壁不锈钢、氧气 HUD 蓝和温室绿，避免模板化单色科幻风。
- 核心角色卡增加身份标签，章节区改为任务记录式卡片，正文区强化阅读节奏和章节索引。
- 新增 `assets/portraits/fufu-dialogue.png`，用于福福角色卡深色立绘展示；原 `assets/concepts/fufu/fufu-astronaut-concept.png` 继续作为飞船残骸场景概念图。
- 章节索引增加滚动同步高亮：阅读到对应正文段落时，右侧导航自动标记当前章节。
- 移动端需要保持标题、状态条、角色卡和正文无横向溢出。

已登记文件：

- `docs/story/core-story-v2-visual.html`
- `public/story-overview.html`
- `public/story-assets/fufu-dialogue.png`
- `assets/portraits/fufu-dialogue.png`
- `docs/lore/fufu.md`
- `docs/art-direction.md`


### 福福宇航服概念图

原因：

用户明确福福在火星室外/太空环境中应戴宇航员头盔并穿宇航服，而不是普通猫形象。该图用于玩家可见的游戏背景与角色介绍网页。

决策：

- 新增 `assets/concepts/fufu/fufu-astronaut-concept.png`。
- 福福保持黑白奶牛猫、黄色眼睛、白色脸纹、鼻子旁边明显小黑点/黑斑、黑色下巴等核心识别点。
- 火星室外形象增加小型透明头盔、轻量宠物 EVA 服、生命维持背包和状态灯。
- 福福的猫耳朵也必须是宇航服头盔/耳罩结构的一部分，腿和脚必须有 EVA 护腿、靴套或爪部护具，不能裸露在火星室外环境中。
- 最终概念图背景改为参考 SpaceX Starship 气质的薄壁不锈钢飞船遗骸角落，避免厚重装甲、干净基地、普通杂物或湿漉漉粘稠破损物，更贴合“福福在事故残骸旁被发现”的剧情。
- `docs/story/core-story-v2-visual.html` 中的福福展示图改用宇航服概念图。
- 旧 spritesheet 仍保留作为游戏动作和造型参考。

已登记文件：

- `assets/concepts/fufu/fufu-astronaut-concept.png`
- `docs/story/core-story-v2-visual.html`
- `docs/lore/fufu.md`
- `docs/art-direction.md`

### 游戏背景与角色介绍可视网页

原因：

用户希望把文章《火星先遣队：第一位人类居民》做成可视网页。该网页的作用是介绍游戏背景以及相关角色，并附带场景和角色概念图；不修改游戏本体名称。

决策：

- 新增静态网页 `docs/story/core-story-v2-visual.html`。
- 页面引用现有项目素材：基地布局、Alex、Mother、机器人、福福等概念图和对话图；Elon 是隐藏角色，不出现在玩家公开介绍页。
- 页面结构包括：封面、游戏背景、核心角色、章节脉络、场景资产、故事正文摘编、创作基准。
- 该页面为文档展示页，不接入游戏主流程，不改变现有 Vite 游戏入口，也不修改游戏名称。

已登记文件：

- `docs/story/core-story-v2-visual.html`
- `docs/story/core-story-v2-rational-wonder.md`
- `docs/production-blueprint.md`

### 新增 Elon 实验性 AI 角色设定

原因：

用户希望创建一个名为 Elon 的新角色，用来测试未来“固定知识库 + 开放式 AI 问答”的对话能力。该角色需要借鉴本地 `elon-musk-perspective` 技能中的工程判断框架，但不能在本次直接进入游戏场景、模型或代码。

决策：

- 新增 `docs/lore/elon.md`，作为 Elon 的角色卡。
- 新增 `docs/ai/elon-agent-design.md`，作为未来 AI 对话接口、prompt、知识库和边界规则的设计草案。
- Elon 定位为 ARES 计划构建的实验性工程顾问 AI，不是现实中的 Elon Musk 本人，也不是数字复活。
- Elon 的思维框架采用第一性原理、白痴指数、五步算法、垂直整合、快速迭代和多行星文明尺度。
- Elon 和 Mother 不构成敌对关系：Mother 负责安全、保护和长期稳定；Elon 负责挑战默认假设；Alex 保留现场决策权。
- 当前只创造设定和 AI 对话设计，暂不创建游戏内人物模型、场景实体或代码实现。

已登记文件：

- `docs/lore/elon.md`
- `docs/ai/elon-agent-design.md`
- `docs/production-blueprint.md`

### GitHub 发布同步入口

原因：

项目正在由多个 Codex 对话并行修改，需要一个固定入口检查未提交、未上传和未合并的修改，最终形成可部署版本。

决策：

- GitHub 仓库保持公开，方便部署服务拉取和更新。
- 这个对话作为发布同步入口。
- 每次发布前检查 `git status`、本地分支、远端分支和 GitHub 仓库可见性。
- 如有未提交改动，先审查、构建验证，再提交。
- 如有未合并分支，确认后合并到 `main`。
- 最终推送到 GitHub `main`，供后续部署网站使用。
- 仓库公开后可用于常见静态部署平台；后续如需分支保护，再单独配置 GitHub ruleset 或 branch protection。

### 新增核心故事母本

原因：

项目需要一个能统一主线任务、支线任务、角色对白、结局气质和美术氛围的长篇故事基础，而不是只依靠零散任务说明。

决策：

- 新增 `docs/story/core-story-v1.md`。
- 故事采用小说式写法，融合当前所有核心元素：
  - Alex 抵达火星。
  - Mother 与人类现场判断权。
  - 居住舱、氧气站、太阳能阵列、机器人车库、物资仓、温室、科研舱、医疗舱、通信塔、甲烷燃料厂。
  - A-12、A-01、P-03 三类机器人。
  - 福福支线。
  - 通信延迟与火星风暴。
- 基调确定为硬核科幻但温和轻松，没有反派，冲突来自对错、原则和非原则的边界，最终落到人性共鸣。

已登记文件：

- `docs/story/core-story-v1.md`
- `docs/production-blueprint.md`

### Elon支线任务与固定对白池

原因：

用户进一步明确：Elon当前虽然是实验型开放角色，但第一阶段仍要依靠固定知识库和大量固定对白互动。玩家需要在 `03 飞船 返回飞船` 上找到它，但 3 号飞船升降梯初始无法运行，必须先完成修复任务。

决策：

- Elon 在游戏内本名就是 `Elon`，只是同名，不指向现实中的 Elon Musk 本人，也不是数字复活。
- Elon 可被理解为接近马斯克式思维的工程思想人格或“精神体式”顾问，但不代表现实人物发言。
- Elon 的位置设在 `03 飞船 返回飞船` 升降平台到达顶端后的固定高空廊道，靠近飞船舱门处。
- `03 飞船 返回飞船` 内舱不可进入，玩家只在外部高空廊道靠近舱门处与 Elon 互动。
- 新增解锁支线：玩家需要寻找执行器驱动轴、高功率继电器、姿态锁止传感器、低温润滑胶囊，并在科研舱生成校准密钥，修复升降梯后才能见到 Elon。
- 升降梯修好后，玩家后续可以随时乘坐 3 号飞船升降梯，到达上层高空廊道与 Elon 交流。

后续修正：

- 用户明确要求 Elon 不在飞船内部，也不是站在升降平台本身上，而是在升降平台到达顶端后的高空廊道，靠近飞船舱门处。
- `03 飞船 返回飞船` 内舱对所有人不可进入；当前实现中靠近舱门时触发 Elon 对话，不进入飞船内舱。
- 新增大型固定对白池草案。每组对白有 ID，后续实现时应优先播放未读内容，避免玩家每次聊天都重复。
- 该阶段先写脚本和设计文档；后续已接入游戏代码和人物模型，见下方最新记录。

已登记文件：

- `docs/tasks/elon-ship-03-elevator-sidequest.md`
- `docs/dialogue/elon-fixed-dialogue-draft-v1.md`
- `docs/lore/elon.md`
- `docs/ai/elon-agent-design.md`
- `docs/production-blueprint.md`

### Elon 角色形象资产入库

原因：

用户确认 Elon 的角色形象方向：站立的人形机器狗，身体是人形宇航服结构，头部像机器狗。该图需要用于后续游戏对话区制作。

决策：

- 确认 Elon 第一版形象为人形机器狗，不使用真人脸，不指向现实人物。
- 保存完整概念图到 `assets/concepts/elon-character-concept.png`。
- 保存对话区引用图到 `assets/portraits/elon-dialogue.png`。
- 删除重复临时副本，只保留上述两张项目资产。
- `src/dialogue/dialogues.ts` 中的 Elon 对话角色已从临时 SVG 占位图切换为真实对话图。

已登记文件：

- `assets/concepts/elon-character-concept.png`
- `assets/portraits/elon-dialogue.png`
- `assets/portraits/elon-dialogue-transparent.png`
- `src/dialogue/dialogues.ts`
- `docs/lore/elon.md`
- `docs/art-direction.md`

补充：

- 新增 `assets/portraits/elon-dialogue-green.png`，作为绿色背景版本，方便后续抠图或制作透明对话立绘。
- 当前游戏已从绿幕源图生成透明对话图 `assets/portraits/elon-dialogue-transparent.png`；绿色残边已压为深灰，运行时使用透明版。

### Elon 游戏内模型与高空廊道站位接入

原因：

用户要求 Elon 真正出现在当前游戏中，并强调位置不是飞船内部，也不是升降平台本身，而是升降平台到达顶端后的高空廊道，靠近飞船舱门处；模型需要参考完整身体设定，约 2 米高，略高于 Alex，并看向火星基地。

决策：

- 03 飞船升降梯修好后，玩家可上行到固定高空廊道，与 Elon 对话。
- Elon 的 3D 模型使用简洁几何体重建：机器狗头部、人形宇航服身体、浅色装甲、深色关节、橙色点缀和蓝色发光传感器。
- Elon 挂在升降梯固定结构上，不挂在移动升降平台车厢上；站位靠近飞船舱门侧，身体朝向基地方向。
- 03 飞船内舱仍不可进入；到达舱门位置时触发 Elon 对话，而不是进入飞船。
- 对话角色图使用由绿幕源图处理出的 `assets/portraits/elon-dialogue-transparent.png`。

已登记文件：

- `src/world.ts`
- `src/main.ts`
- `src/dialogue/dialogues.ts`
- `docs/lore/elon.md`
- `docs/tasks/elon-ship-03-elevator-sidequest.md`

### 飞船内舱视角与几何体简化

原因：

用户反馈飞船内舱只能向前和向下看，无法抬头看到飞船内部顶端；同时内舱里有几块额外几何体影响观察。

决策：

- 飞船内舱移除控制台、侧边箱体、后部封板等额外几何体。
- 保留舱体圆筒、结构肋骨、地板和舱顶灯条，用更清爽的结构表达飞船内部。
- 飞船内第一人称视角放宽向上 pitch 限制，让玩家可以抬头看到舱顶。

已登记文件：

- `src/world.ts`
- `src/main.ts`

### 建筑匹配机器人外移到外围巡逻

原因：

用户发现部分建筑匹配机器人会待在建筑物内部，导致玩家无法靠近通讯。机器人应避开自己的建筑体，在建筑外围走动或站立。

决策：

- 重新检查所有建筑、飞船和太阳能阵列对应的维修机器人。
- 将温室维修工、太阳能阵列 A/B/C 维修工、飞船维护工等高风险点外移到建筑碰撞范围外。
- 修改维修机器人巡逻点生成方式：以建筑外侧方向为基准，沿外围切向移动，并只向外扩展，不再生成朝建筑内部穿行的巡逻点。
- 保留现有固定碰撞推出逻辑，并额外用几何检查验证巡逻点和巡逻线段都避开自身建筑碰撞范围。

已登记文件：

- `src/world.ts`

### 远端暗面黑色石碑异常点

原因：

用户希望在星球绝对暗面、建筑物非常稀少的位置放置一个黑色石碑，气质可参考经典科幻中的神秘石碑；玩家靠近时会听到滴滴声。

决策：

- 新增原创黑色石碑异常点，不直接复刻具体电影画面，只保留“远端、黑色、极简、沉默”的科幻气质。
- 石碑放在初始太阳方向的背光远端，远离主基地建筑群和常规巡检路线。
- 石碑模型使用低多边形几何体：黑色高直立长方体、细暗边线、低矮基座和暗色接触阴影。
- 石碑不是任务交互物；玩家靠近一定范围后自动触发双短音“滴滴”。
- 滴滴声用 Web Audio 程序合成，不新增音频文件；距离越近，滴声间隔越短、音量越明显。

已登记文件：

- `src/world.ts`
- `src/main.ts`
- `docs/art-direction.md`

### 首页故事概要占位按钮

原因：

用户希望在首页“进入基地”按钮下方新增“故事概要”按钮，并接到“游戏编剧”创作的故事概要网站。

决策：

- 首页标题区新增“故事概要”按钮，位于“进入基地”下方。
- “故事概要”点击后先播放一个短促“滴”声，再跳转到 `/story-overview.html`。
- “进入基地”开始进入游戏时也播放同一类短促“滴”声，作为按钮转换反馈。
- 首页两个按钮默认都使用深色描边样式，只有鼠标悬停时切换为橙色填充样式。
- 标题页默认选中“进入基地”；支持键盘上下键或鼠标悬停切换当前按钮，切换时播放短促“滴”声，按 Enter 或 Space 执行当前选中项。
- 滴声使用 Web Audio 程序合成，不新增音频文件。
- 故事概要网页由 `docs/story/core-story-v2-visual.html` 发布副本生成，运行时文件放在 `public/story-overview.html`。
- 故事页依赖图片复制到 `public/story-assets/`，确保构建部署后仍可访问。

已登记文件：

- `index.html`
- `src/main.ts`
- `src/style.css`
- `public/story-overview.html`
- `public/story-assets/`

### 核心故事向理性惊奇方向优化，并新增机器人对白草案

原因：

用户希望故事背景更接近阿瑟·克拉克式的硬科幻气质：宏观、理性、带有宇宙尺度的惊奇；同时当前游戏内机器人对白过短，需要扩展为 2-3 轮对话，但暂时不接入代码。

决策：

- 新增 `docs/story/core-story-v2-rational-wonder.md`，作为核心故事背景 v2。
- v2 不直接模仿具体文本，而是借鉴“理性惊奇”方向：更克制、更宏观、更强调技术系统和宇宙尺度。
- 新增 `docs/dialogue/robot-dialogue-draft-v1.md`，覆盖 15 个现有设施/飞船/阵列/任务机器人。
- 每个机器人对白保持执行单元气质，不写成复杂人格，但扩展为 2-3 轮，补充设施功能、当前风险和火星工程逻辑。
- 本次只写文档草案，不修改游戏代码。

已登记文件：

- `docs/story/core-story-v2-rational-wonder.md`
- `docs/dialogue/robot-dialogue-draft-v1.md`
- `docs/production-blueprint.md`

### 将核心故事 v2 和机器人对白草案接入当前游戏

原因：

用户希望把“游戏编剧”对话中已经形成的最新故事背景和机器人对白，直接应用到当前游戏，而不是继续停留在文档草案。

决策：

- 保留 `docs/story/core-story-v2-rational-wonder.md` 作为当前剧情气质基准。
- 将 `docs/dialogue/robot-dialogue-draft-v1.md` 中 15 组机器人对白接入 `src/dialogue/dialogues.ts`。
- 运行时根据机器人 `userData.label` 匹配对应对白：3 艘飞船维护工、9 个建筑维修工、3 个太阳能阵列维修工。
- 对话系统新增普通 `next` 推进能力，让非选项对白可以自然进入 2-3 轮。
- 福福相关提示改为“隔离、扫描、确认安全、进入观察名单”的工程化善意逻辑。

实现边界：

- 本次不新增 3D 模型、不接入 AI 后端、不处理仍在进行中的 Elon 角色设定。
- A-12、A-01、P-03 的专属任务对白仍主要通过主线/支线提示呈现，后续可再升级为独立可交互对象。

### 任务扩展采用 3 条主线任务包 + 3 条支线任务包

原因：

当前 1.0 主线只覆盖开场、氧气异常、太阳能阵列 C 和机器人车库，几分钟即可完成，适合试玩引导，但不足以承载项目主题。

决策：

- 新增 `docs/tasks/mission-expansion-v2.md`，作为下一阶段任务设计依据。
- 主线扩展为：
  - 生命支持验收。
  - 温室第一粒种子。
  - 通信延迟与风暴协议。
- 支线扩展为：
  - 未登记生命体。
  - A-01 的错位货箱。
  - 巡逻线之外。
- 所有任务继续围绕氧气、能源、温室、物资、通信、机器人调度、Mother 信任和 Alex 现场判断权展开。
- 不引入外星人、战斗或玄幻危机。

已登记文件：

- `docs/production-blueprint.md`
- `docs/tasks/mission-expansion-v2.md`

## 2026-06-23

### 1.0 部署方案采用静态站点

原因：

当前版本是 Vite + TypeScript + Three.js 的纯前端网页游戏，没有后端 API、数据库或服务端渲染需求。

决策：

- 1.0 上线以静态部署为主。
- 本地或服务器执行构建，产物为 `dist/`。
- 服务器优先使用 Nginx 托管 `dist/`。
- 后续接入 DeepSeek 对话时，再新增后端 `/api/dialogue`，API Key 不进入前端。

已登记文件：

- `docs/deployment.md`
- `docs/tech-plan.md`

### 背景音乐改为原曲压缩版

原因：

原背景音乐 MP3 约 10MB，占当前部署包主要体积。Web Audio 合成器虽然体积小，但听感与原曲不一致。

决策：

- 保留原曲听感，使用 64kbps MP3 压缩版。
- 前端导入 `src/assets/audio/mars-background-light.mp3`。
- 原 10MB MP3 保持在 `.gitignore` 中，避免误提交到 GitHub。

### 项目采用文件化共同记忆

原因：

长对话会变慢，不同 Codex 对话不会自动共享全部上下文。

决策：

- 聊天只作为工作过程。
- 项目文件作为共同记忆。
- 新对话必须先读 `AGENTS.md`、`docs/project-management.md`、`docs/production-blueprint.md`。
- 重要创意、修改和实现结果必须写回项目文件。

### 福福进入项目设定

来源：

另一个对话已把“宠物福福”写入当前项目文件。

已登记文件：

- `docs/lore/fufu.md`
- `assets/concepts/fufu/fufu-spritesheet.png`

当前定位：

福福是黑白奶牛猫，是火星基地里的情感陪伴角色，不是战斗单位。第一阶段建议作为坠毁飞船残骸旁可救助、可跟随的小猫实现。

### 1.0 可试玩版本交接记录

决策：

- 新增 `docs/dev-log/v1-implementation.md` 作为 1.0 当前状态的快速交接文件。
- 新对话继续开发前，除 `AGENTS.md`、`docs/project-management.md`、`docs/production-blueprint.md` 外，也应阅读该交接记录。

当前状态摘要：

- 已具备火星基地探索、主线任务、对话、地图、氧气背包、移动端控制、01/02 飞船升降梯和封面视觉。
- 操作规则定为：`E` 进入互动；左右键选择；空格确认。
- HUD 中“自养量”已统一改为“制氧量”。
