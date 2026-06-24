# 决策记录

## 2026-06-24

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
