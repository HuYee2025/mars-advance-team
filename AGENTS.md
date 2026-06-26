# 项目协作规则

本项目是《火星先遣队：第一位居民》。任何新的 Codex 对话、子任务或 agent 进入本项目时，先读：

1. `docs/project-management.md`
2. `docs/production-blueprint.md`
3. `docs/dev-log/current-handoff.md`
4. 当前任务相关的 `docs/lore/*.md`

## 工作原则

- 聊天只是过程，项目文件才是共同记忆。
- 所有重要创意、设定、技术决策和实现状态，都要写回项目文件。
- 不要只把关键内容留在某个对话里。
- 修改角色、世界观、主线、系统设计时，必须同步更新对应文档。
- 新增素材时，必须记录用途、路径和后续使用方式。

## 当前项目主管文件

- 总控文档：`docs/production-blueprint.md`
- 协作制度：`docs/project-management.md`
- 当前交接：`docs/dev-log/current-handoff.md`
- 1.0 交接记录：`docs/dev-log/v1-implementation.md`
- 角色和世界观：`docs/lore/`
- 美术方向：`docs/art-direction.md`
- 技术方案：`docs/tech-plan.md`
- 阶段计划：`docs/milestones.md`

## 交接要求

每个阶段完成后，至少更新一个项目文件：

- 新角色/新设定：更新 `docs/lore/`
- 新任务/剧情：更新 `docs/production-blueprint.md`
- 新 UI/交互规则：更新 `docs/production-blueprint.md` 或 `docs/tech-plan.md`
- 新素材：更新相关 `docs/lore/*.md` 或 `docs/art-direction.md`
- 重要决策：更新 `docs/decision-log.md`

## 长对话压缩规则

- 同一对话如果已经发生约 3 次自动压缩，先进入交接检查，不继续默认推进大型修改。
- 交接检查先确认重要技术、UI、剧情、设定和实现状态是否写入项目文件。
- 如果记录完整，建议开启新对话继续；如果记录不完整，先补 `docs/dev-log/current-handoff.md` 或相关权威文档。
