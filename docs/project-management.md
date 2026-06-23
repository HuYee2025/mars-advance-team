# 项目管理与多对话协作规则

## 1. 为什么需要这个文件

这个项目会被多个 Codex 对话持续推进。长对话会变慢，不同对话也不会天然共享完整上下文。

因此本项目采用一个规则：

> 对话负责推进工作，项目文件负责保存共同记忆。

任何重要创意、修改、实现结果，都必须沉淀回项目文件。这样新的对话只要读取项目文件，就能继续工作。

## 2. 项目主管文件

当前项目以这些文件作为权威来源：

- `AGENTS.md`：所有对话进入项目时的第一入口。
- `docs/project-management.md`：多对话协作制度。
- `docs/production-blueprint.md`：游戏总控文档。
- `docs/dev-log/v1-implementation.md`：1.0 当前实现交接记录。
- `docs/lore/`：角色、世界观、基地、火星生存、对话规则。
- `docs/art-direction.md`：美术方向。
- `docs/tech-plan.md`：技术方案。
- `docs/milestones.md`：阶段目标。
- `docs/decision-log.md`：重要决策记录。

## 3. 每个新对话必须先读什么

默认必读：

1. `AGENTS.md`
2. `docs/project-management.md`
3. `docs/production-blueprint.md`

按任务补充读取：

- 做剧情：读 `docs/lore/`
- 做角色：读对应角色卡，例如 `docs/lore/alex.md`、`docs/lore/mother.md`、`docs/lore/fufu.md`
- 做 AI 对话：读 `docs/lore/dialogue-rules.md`
- 做美术：读 `docs/art-direction.md` 和 `assets/concepts/`
- 做代码：读 `docs/tech-plan.md`、`docs/phase-2-plan.md` 和相关 `src/` 文件

## 4. 修改后必须写回哪里

| 工作类型 | 必须写回 |
|---|---|
| 新角色 | `docs/lore/<角色名>.md` |
| 角色关系变化 | `docs/production-blueprint.md` 和相关角色卡 |
| 主线任务变化 | `docs/production-blueprint.md` |
| 支线任务变化 | `docs/production-blueprint.md` 或新增 `docs/tasks/*.md` |
| AI 对话规则 | `docs/lore/dialogue-rules.md` |
| 新素材 | 对应 `docs/lore/*.md` 或 `docs/art-direction.md` |
| 技术架构 | `docs/tech-plan.md` |
| 阶段计划 | `docs/milestones.md` |
| 重要取舍 | `docs/decision-log.md` |

## 5. 对话结束时的交接格式

每个负责一个阶段的对话，结束前应留下简短交接：

```txt
完成了什么：
- ...

改了哪些文件：
- ...

下一步建议：
- ...

未解决问题：
- ...
```

如果这些内容对后续开发有长期价值，就写进 `docs/decision-log.md` 或相关设计文档，不要只留在聊天里。

## 6. 创意和实现的边界

可以提出新创意，但落地前要检查是否符合项目方向：

- 温和现实科幻。
- 火星基地工程逻辑。
- Alex 是工程师 + 人类学家。
- Mother 是机器 AI，不是人形，不是反派。
- 机器人是执行者，不是复杂人格角色。
- 福福是情感陪伴角色，不是战斗单位。

如果新创意改变了这些原则，必须先写清楚原因，并更新总控文档。

## 7. 当前已登记的重要新增内容

### 1.0 可试玩版本

当前 1.0 已经形成可试玩闭环。新对话需要快速接续时，先读：

- `docs/dev-log/v1-implementation.md`

该文件记录了当前已完成的场景、交互、对话、HUD、地图、移动端、封面和操作规则。

### 福福

另一个对话已把宠物福福写入项目：

- 设定文件：`docs/lore/fufu.md`
- 参考素材：`assets/concepts/fufu/fufu-spritesheet.png`

福福的当前定位：

- 黑白奶牛猫。
- 情感陪伴角色。
- 后期由 Alex 在坠毁飞船残骸旁发现并救助。
- 不说人类语言。
- 第一阶段可做成低多边形小猫跟随 Alex。

## 8. 项目主管原则

本项目后续默认由“项目主管”视角协调：

- 先控制范围，再做功能。
- 先写清楚设定，再写代码。
- 先做可试玩闭环，再扩展复杂系统。
- AI 对话只负责自然表达，主线逻辑必须由代码控制。
- 任何 agent 做出的有效创意，都要进入项目文件，成为所有对话都能读到的共同资产。
