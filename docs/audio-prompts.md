# 音乐与音效提示词清单

更新时间：2026-07-06

## 1. 制作原则

本项目的音频方向是克制的深空工程科幻：孤独、宏大、神秘，但不做热闹战斗音乐。音乐参考可以在内部理解为《星际穿越》《2001 太空漫游》的气质，但外部生成提示词不要直接写电影名、作曲家名或现成 IP 名称。

音效可以借鉴经典科幻声音的构成逻辑，例如能量剑的低频嗡鸣、电流震荡、挥动时的 pitch sweep，但不得直接采样电影原声，也不要在最终提示词里写 `Star Wars lightsaber`。

推荐流程：

1. 长背景音乐用 Suno / Udio / Stable Audio 生成，优先导出无 vocals 的 instrumental。
2. 短音效用 Stable Audio / ElevenLabs Sound Effects 生成，或后续由 Codex 用 Web Audio / Audacity / ffmpeg 做二次处理。
3. 每个资产先生成 3-5 个版本，选 1 个主版本和 1 个备用版本。
4. 入库前统一转为压缩音频，长音乐优先 `mp3`，短音效优先 `mp3` 或 `ogg`。
5. 文件放入 `src/assets/audio/`，最终由代码控制循环、淡入淡出、音量和触发条件。

全局 negative prompt：

```txt
No vocals, no lyrics, no recognizable existing movie theme, no famous composer imitation, no copyrighted melody, no sudden loud jump scare, no comedy sound, no EDM beat, no rock drums, no trailer braam overload.
```

## 2. 第一批必须做的音频

| ID | 用途 | 建议文件名 | 类型 | 时长 | 循环 |
|---|---|---|---|---:|---|
| `bgm_title_theme` | 首页 / 开场主题曲 | `mars-title-theme.mp3` | BGM | 60-120s | 是 |
| `bgm_exploration_loop` | 平时基地探索 | `mars-exploration-loop.mp3` | BGM | 60-120s | 是 |
| `bgm_darkside_ambient` | 暗面区域 | `mars-darkside-ambient.mp3` | BGM | 60-120s | 是 |
| `bgm_ancient_portal` | 远古巨树 / 时空之门 | `ancient-portal-theme.mp3` | BGM | 30-90s | 是 |
| `bgm_wormhole_layer` | 虫洞坠落极简氛围 | `wormhole-low-drone.mp3` | BGM | 30s | 是或一次性 |
| `bgm_spider_danger` | 暗面蜘蛛区域 | `spider-danger-ambient.mp3` | BGM | 30-60s | 是 |
| `bgm_greenhouse_fufu` | 温室启动 / 福福情感线 | `greenhouse-fufu-theme.mp3` | BGM | 20-60s | 可选 |
| `sfx_scale_gun` | 缩放枪核心音效组 | 见下方 | SFX | 0.5-3s | 否 |
| `sfx_energy_blade` | 激光剑核心音效组 | 见下方 | SFX | 0.3-8s | 部分循环 |

## 3. 背景音乐 Prompts

### 3.1 首页开场主题曲

用途：标题页、游戏第一印象。要宏大，但不要像预告片。

```txt
Instrumental deep space exploration soundtrack for a lonely Mars colony game, slow organ-like pads, warm low drones, sparse piano notes, subtle wordless choir texture without vocals, vast cosmic atmosphere, calm and awe-inspiring, mysterious but not scary, cinematic science fiction, seamless loop, 90 seconds.
```

### 3.2 平时基地探索

用途：默认游戏背景音乐，长时间听不烦。

```txt
Minimal instrumental ambient music for walking around a small Mars engineering base, soft low-frequency drone, sparse piano tones, gentle analog synth pad, distant air circulation feeling, lonely but safe, slow tempo, no drums, no melody hook, seamless loop, 90 seconds.
```

### 3.3 暗面区域

用途：进入火星背面、远离基地、未知区域。

```txt
Dark side of Mars ambient soundtrack, extremely spacious and cold, low sub drone, faint metallic resonance, distant solar wind texture, very sparse harmonic movement, no rhythm, no horror jump scare, mysterious ancient space atmosphere, seamless loop, 90 seconds.
```

### 3.4 远古巨树 / 时空之门

用途：靠近远古巨树拱门和时空之门激活前后。

```txt
Ancient alien portal ambient theme for a petrified giant tree arch on Mars, deep resonant low tones, slow shimmering high frequencies, subtle ritual-like pulse, blue-white energy feeling, cosmic and sacred, not fantasy, not horror, cinematic sci-fi, seamless loop, 60 seconds.
```

### 3.5 虫洞坠落极简氛围

用途：当前设定是虫洞期间接近寂静。这个音轨只能做极低存在感。

```txt
Almost silent wormhole fall ambience, very low sub-bass pressure, distant gravitational vibration, faint breathing-like space movement, no music melody, no drums, no impact, minimal cinematic science fiction soundscape, immersive but quiet, 30 seconds.
```

### 3.6 暗面蜘蛛危险氛围

用途：进入蜘蛛活动区，不是战斗音乐。

```txt
Subtle danger ambience for strange eight-legged creatures on the dark side of Mars, unstable low drone, faint granular clicking texture, slow irregular pulse, tense but restrained, no action drums, no monster roar, no horror jump scare, science fiction ecological anomaly, seamless loop, 45 seconds.
```

### 3.7 温室 / 福福温柔主题

用途：温室启动、第一次水循环、安抚福福、基地开始像生活空间。

```txt
Warm emotional instrumental theme for the first living things in a Mars base, soft piano, gentle warm synth pad, tiny bell-like highlights, fragile hope, intimate and restrained, no vocals, no big orchestra, no sentimental pop, cinematic but minimal, 45 seconds.
```

### 3.8 沙尘暴 / 终章危机

用途：风暴协议、能源/氧气/通信同时承压。

```txt
Restrained crisis soundtrack for a Mars dust storm survival sequence, heavy low drone, slow pulsing synth, distant wind pressure, subtle ticking tension, engineering emergency mood, no action drums, no heroic melody, no trailer hits, seamless loop, 60 seconds.
```

### 3.9 通信塔 / Starlink 链路

用途：通信塔修复、轨道链路、深空信号。

```txt
Cold deep-space communication ambience, sparse radio-like pulses, glassy synth tones, distant orbital signal texture, precise and lonely, slow tempo, no drums, no melody hook, scientific Mars communication system mood, seamless loop, 60 seconds.
```

### 3.10 03 返回飞船高空廊道 / 埃隆

用途：返回飞船升降梯顶部、高空廊道、埃隆智能体对话。

```txt
High-altitude Mars spaceship walkway ambience, thin atmosphere feeling, cold electronic pad, subtle mechanical hum, distant wind, rational and focused mood, isolated engineering advisor scene, minimal cinematic sci-fi, no vocals, seamless loop, 60 seconds.
```

### 3.11 结局暖主题

用途：高信任结局、史蒂夫称呼亚历克斯为 X。

```txt
Warm restrained ending theme for a Mars colony game, lonely piano motif, soft organ-like pad, quiet hopeful harmony, human and machine cooperation, vast space but intimate emotion, no vocals, no triumphant orchestra, cinematic minimal science fiction, 60 seconds.
```

### 3.12 结局冷主题

用途：低信任结局，基地勉强稳定但权限更紧。

```txt
Cold restrained ending ambience for a Mars base that survived but remains uncertain, low drone, sparse piano fragments, distant mechanical hum, unresolved harmony, quiet tension, no vocals, no horror, no action rhythm, cinematic minimal science fiction, 45 seconds.
```

## 4. 缩放枪音效 Prompts

缩放枪不是普通武器，声音要像“空间尺度被重采样”，不要像枪械开火。

### 4.1 装备 / 举起缩放枪

```txt
Original sci-fi handheld gravity scaling device equip sound, short clean mechanical click, glassy electronic wake-up tone, subtle low-frequency pulse, futuristic but not weapon-like, dry mix, no explosion, no gunshot, 1 second.
```

### 4.2 锁定目标

```txt
Original sci-fi target lock sound for a scale manipulation device, two precise electronic beeps, soft rising tone, clean user interface feedback, no alarm, no melody, dry mix, 0.8 seconds.
```

### 4.3 放大目标

```txt
Original sci-fi object enlargement sound effect, smooth rising pitch sweep, elastic spatial expansion, low-frequency swell, glassy shimmer, clean futuristic energy, no explosion, no magic spell, no gunshot, 2 seconds.
```

### 4.4 缩小目标

```txt
Original sci-fi object shrink sound effect, smooth downward pitch sweep, collapsing spatial resonance, tight electronic pulse, subtle low-frequency suction, clean futuristic energy, no cartoon effect, no magic spell, 2 seconds.
```

### 4.5 60 秒后恢复尺寸

```txt
Original sci-fi object restoring to normal scale sound, neutral pitch glide returning to center, soft digital recalibration pulse, gentle low thump, clean and non-combat, 1.5 seconds.
```

### 4.6 命中失败 / 无目标

```txt
Subtle sci-fi device failed lock sound, short dry negative beep, low volume, clean interface feedback, not annoying, no alarm, no comedy, 0.5 seconds.
```

## 5. 激光剑音效 Prompts

激光剑声音要原创。借鉴的是“能量刃”的物理感：电流、等离子、低频嗡鸣、挥动时音高变化。不要使用任何现成电影原声或 IP 名称。

### 5.1 点亮 / 展开

```txt
Original sci-fi energy blade ignition sound, deep electric hum starting from silence, quick plasma burst, clean rising power-up, blue-white energy feeling, cinematic space adventure tone, no explosion, no copyrighted movie sound, 1.5 seconds.
```

### 5.2 收回 / 关闭

```txt
Original sci-fi energy blade shutdown sound, electric plasma hum collapses quickly, descending pitch, soft energy snap, clean and powerful, no explosion, no copyrighted movie sound, 1 second.
```

### 5.3 持续嗡鸣循环

用途：按 `I` 展开后循环播放，音量必须很低，避免长时间烦人。

```txt
Original sci-fi energy blade idle hum loop, deep electric vibration, subtle plasma shimmer, stable low-frequency energy, smooth seamless loop, low intensity, no melody, no buzzing harshness, no copyrighted movie sound, 6 seconds.
```

### 5.4 普通挥动

用途：角色转身或轻挥时播放，短。

```txt
Original sci-fi energy blade swing sound, smooth whoosh with electric pitch sweep, deep plasma resonance, fast movement through air, clean cinematic science fiction, no impact, no explosion, no copyrighted movie sound, 0.8 seconds.
```

### 5.5 举剑 / 强光照明

用途：按住 `J` 举起激光剑，表现亮度和能量提升。

```txt
Original sci-fi energy blade raised power sound, electric hum intensifies, low-frequency swell, bright plasma shimmer, heroic but restrained, no melody, no explosion, no copyrighted movie sound, 1.2 seconds.
```

### 5.6 蜘蛛避光反应

用途：蜘蛛被激光剑光源逼退时，可作为很轻的环境反馈，不是攻击命中。

```txt
Subtle alien creature reaction to bright energy light, faint chittering retreat, low organic-electronic texture, distant and restrained, not horror, not aggressive, no roar, 1 second.
```

## 6. 其它关键音效 Prompts

### 6.1 时空之门支付确认 / 门开始启动

```txt
Original sci-fi ancient portal activation sound, coin-like confirmation click followed by deep energy startup, blue-white field opening, slow rising resonance, mysterious and powerful, no explosion, 3 seconds.
```

### 6.2 时空之门完全打开

```txt
Original sci-fi portal fully open sound, wide shimmering energy field, deep stable resonance, faint electric arcs, ancient cosmic gateway mood, seamless or fading tail, no horror, 5 seconds.
```

### 6.3 白色粒子云转入虫洞

```txt
Original sci-fi transition from white particle cloud into black wormhole, airy particle rush, sudden low-frequency drop, deep space suction, cinematic but restrained, no explosion, 3 seconds.
```

### 6.4 温室水循环恢复

```txt
Futuristic Mars greenhouse water circulation restored, soft water flow begins, gentle pump startup, warm electronic confirmation tone, hopeful and clean, no music melody, 3 seconds.
```

### 6.5 福福安抚成功

```txt
Small animal comfort sound inside a tiny space helmet, soft muffled purr and tiny chirp, warm and gentle, no cartoon exaggeration, no human voice, 2 seconds.
```

### 6.6 沙尘暴预警

```txt
Mars base dust storm warning sound, restrained low alarm pulse, distant wind pressure, serious engineering alert, not loud, not panic, no siren cliché, 3 seconds.
```

### 6.7 通信塔链路建立

```txt
Deep space communication link established sound, precise radio pulses, clean digital lock tone, faint orbital shimmer, calm engineering confirmation, no melody, 2 seconds.
```

### 6.8 黑色方碑信号

当前代码已有 Web Audio 双音 beep。若换成素材，可用：

```txt
Mysterious black monolith proximity signal, two pure sine-like tones, increasing tension, clean and minimal, deep space anomaly feeling, no melody, no horror jump scare, 1 second.
```

### 6.9 金币拾取

当前适合继续使用短促合成音，不建议外部生成复杂音效。若需要替换：

```txt
Short clean sci-fi coin pickup sound, tiny metallic ping, soft digital sparkle, low volume, satisfying but not cartoon, 0.4 seconds.
```

### 6.10 积分奖励

```txt
Short sci-fi score reward sound, gentle rising confirmation tone, warm digital shimmer, satisfying and restrained, no casino sound, no arcade jingle, 1 second.
```

## 7. CoreDesk 与 Codex 的分工

CoreDesk 可以作为创意整理、提示词管理和版本记录工具。如果 CoreDesk 已经接入可导出音频的生成服务，也可以直接在 CoreDesk 里生成。

Codex 可以做的事：

- 打开你已经登录并授权的网页工具，按提示词生成音频。
- 下载生成结果，整理命名。
- 使用本地工具检查时长、码率、响度。
- 用 ffmpeg 压缩、裁剪、淡入淡出、转格式。
- 把最终文件接入 `src/assets/audio/` 和游戏代码。

Codex 不能可靠保证的事：

- 不能绕过验证码、登录保护、付费墙或人工审核。
- 不应直接使用电影、游戏、唱片里的受版权保护采样。
- 不应把你的账号密码写进项目文件或聊天记录。
- 外部网站 UI 经常变化，自动生成流程可能需要你在浏览器里完成登录、授权或支付确认。

## 8. 接入验收标准

- 背景音乐默认音量低，不盖过 UI、对话和环境声。
- 所有循环音乐必须听不出明显断点。
- 虫洞仍保持“近乎寂静”的设计，不改成普通配乐段落。
- 激光剑持续嗡鸣必须非常轻，只有展开时存在，收回后停止。
- 缩放枪音效不应像枪械，不应暗示战斗。
- 移动端加载体积不能明显膨胀；第一轮优先控制总音频新增体积。
