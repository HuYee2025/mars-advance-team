import alexPortraitUrl from "../../assets/portraits/alex-dialogue.png";
import motherPortraitUrl from "../../assets/portraits/mother-bust.png";
import repairRobotPortraitUrl from "../../assets/portraits/repair-robot-dialogue.png";

export type CharacterId = "alex" | "mother" | "repairRobot";
export type DialogueSceneId = "intro" | "oxygen" | "solar" | "garage" | "robot";
export type DialogueNodeId =
  | "intro_start"
  | "intro_alex_identity"
  | "intro_base_history"
  | "intro_robot_builders"
  | "intro_alex_question"
  | "intro_mother_role"
  | "intro_task"
  | "intro_task_confirm"
  | "oxygen_start"
  | "oxygen_safe"
  | "oxygen_fast"
  | "oxygen_robot"
  | "solar_start"
  | "solar_oxygen"
  | "solar_greenhouse"
  | "solar_comms"
  | "garage_start"
  | "garage_authorize"
  | "garage_manual"
  | "garage_protocol"
  | "robot_status";

export type DialogueEffect =
  | "trustUp"
  | "trustDown"
  | "integrityUp"
  | "integrityDown"
  | "autonomyUp"
  | "completeOxygen"
  | "completeSolar"
  | "completeGarage";

export type DialogueChoice = {
  label: string;
  next: DialogueNodeId;
  effects?: DialogueEffect[];
};

export type DialogueNode = {
  id: DialogueNodeId;
  scene: DialogueSceneId;
  speaker: CharacterId;
  listener: CharacterId;
  text: string;
  choices?: DialogueChoice[];
  end?: boolean;
};

export const characters: Record<CharacterId, { name: string; callsign: string; portrait: string; side: "left" | "right" }> = {
  alex: {
    name: "Alex",
    callsign: "火星第一位人类公民",
    portrait: alexPortraitUrl,
    side: "left",
  },
  mother: {
    name: "Mother",
    callsign: "ARES BASE ALPHA 中央 AI",
    portrait: motherPortraitUrl,
    side: "right",
  },
  repairRobot: {
    name: "A-12",
    callsign: "维修执行单元",
    portrait: repairRobotPortraitUrl,
    side: "right",
  },
};

export const sceneStartNodes: Record<DialogueSceneId, DialogueNodeId> = {
  intro: "intro_start",
  oxygen: "oxygen_start",
  solar: "solar_start",
  garage: "garage_start",
  robot: "robot_status",
};

export const dialogueNodes: Record<DialogueNodeId, DialogueNode> = {
  intro_start: {
    id: "intro_start",
    scene: "intro",
    speaker: "mother",
    listener: "alex",
    text: "Alex，头盔通信已建立。欢迎抵达 ARES BASE ALPHA。你是本基地记录中的火星第一位人类公民。",
    choices: [{ label: "收到。确认我的身份。", next: "intro_alex_identity", effects: ["trustUp"] }],
  },
  intro_alex_identity: {
    id: "intro_alex_identity",
    scene: "intro",
    speaker: "alex",
    listener: "mother",
    text: "这里是 Alex。工程师，人类学任务负责人。飞船着陆完整。我现在看到的是一个已经运转起来的基地，不是一片空地。",
    choices: [{ label: "询问基地建立时间。", next: "intro_base_history", effects: ["autonomyUp"] }],
  },
  intro_base_history: {
    id: "intro_base_history",
    scene: "intro",
    speaker: "mother",
    listener: "alex",
    text: "第一批自动化货运飞船在 3 个火星年前抵达。机器人先部署能源阵列，再建立居住舱、温室、氧气生产站和甲烷燃料厂。",
    choices: [{ label: "这些都是机器人完成的？", next: "intro_robot_builders" }],
  },
  intro_robot_builders: {
    id: "intro_robot_builders",
    scene: "intro",
    speaker: "mother",
    listener: "alex",
    text: "是。它们没有复杂自我意识，只执行建设、巡检、搬运和维修指令。但在你抵达之前，它们已经让基地保持了 1,109 个火星日的最低运行。",
    choices: [{ label: "Alex 回应。", next: "intro_alex_question", effects: ["trustUp"] }],
  },
  intro_alex_question: {
    id: "intro_alex_question",
    scene: "intro",
    speaker: "alex",
    listener: "mother",
    text: "那我不是来启动基地的。我是来接管一个已经有秩序的系统。Mother，你在这个系统里负责什么？",
    choices: [{ label: "听 Mother 说明。", next: "intro_mother_role" }],
  },
  intro_mother_role: {
    id: "intro_mother_role",
    scene: "intro",
    speaker: "mother",
    listener: "alex",
    text: "我负责维持基地、机器人和生命支持系统。我不会替你成为人类负责人。但在风险超出阈值时，我会阻止会导致基地失效的行为。",
    choices: [
      { label: "我会尊重安全流程。", next: "intro_task", effects: ["trustUp"] },
      { label: "现场判断必须留给现场的人。", next: "intro_task", effects: ["autonomyUp"] },
    ],
  },
  intro_task: {
    id: "intro_task",
    scene: "intro",
    speaker: "mother",
    listener: "alex",
    text: "记录完成。先确认你的生活空间。01 建筑居住舱需要完成空气循环和补给柜验收。随后处理 03 建筑氧气生产站压降报警。",
    choices: [{ label: "确认第一项任务。", next: "intro_task_confirm" }],
  },
  intro_task_confirm: {
    id: "intro_task_confirm",
    scene: "intro",
    speaker: "alex",
    listener: "mother",
    text: "收到。我先验收居住舱，再去氧气生产站。之后我们再讨论，火星第一位人类公民到底是接管基地，还是加入基地。",
    end: true,
  },
  oxygen_start: {
    id: "oxygen_start",
    scene: "oxygen",
    speaker: "mother",
    listener: "alex",
    text: "你已到达氧气生产站。外壳无明显破损，但进气曲线不稳定。请选择第一步处理方式。",
    choices: [
      { label: "按安全流程检查进气口和舱压。", next: "oxygen_safe", effects: ["trustUp", "integrityUp", "completeOxygen"] },
      { label: "直接手动重启压缩机。", next: "oxygen_fast", effects: ["autonomyUp", "integrityDown", "completeOxygen"] },
      { label: "先授权 A-12 进入管线区。", next: "oxygen_robot", effects: ["trustUp", "integrityUp", "completeOxygen"] },
    ],
  },
  oxygen_safe: {
    id: "oxygen_safe",
    scene: "oxygen",
    speaker: "mother",
    listener: "alex",
    text: "确认：没有泄漏。压降来自供电波动。氧气站进入稳定模式，请转往太阳能阵列 C。",
    end: true,
  },
  oxygen_fast: {
    id: "oxygen_fast",
    scene: "oxygen",
    speaker: "mother",
    listener: "alex",
    text: "压缩机已恢复，但重启电流超过建议阈值。记录你的现场决策。下一步请恢复太阳能阵列 C。",
    end: true,
  },
  oxygen_robot: {
    id: "oxygen_robot",
    scene: "oxygen",
    speaker: "repairRobot",
    listener: "alex",
    text: "授权收到。A-12 已进入外部管线区。未发现破口。建议切换太阳能阵列 C 的备用功率组。",
    end: true,
  },
  solar_start: {
    id: "solar_start",
    scene: "solar",
    speaker: "mother",
    listener: "alex",
    text: "太阳能阵列 C 输出下降。沙尘覆盖 34%，角度锁定异常。基地只能保留一个系统在高功率状态。",
    choices: [
      { label: "优先供氧气站。", next: "solar_oxygen", effects: ["trustUp", "integrityUp", "completeSolar"] },
      { label: "优先保温室生态舱。", next: "solar_greenhouse", effects: ["autonomyUp", "completeSolar"] },
      { label: "优先恢复通信塔。", next: "solar_comms", effects: ["autonomyUp", "integrityDown", "completeSolar"] },
    ],
  },
  solar_oxygen: {
    id: "solar_oxygen",
    scene: "solar",
    speaker: "mother",
    listener: "alex",
    text: "接受。氧气站维持高功率。太阳能阵列 C 已重新校准，请前往机器人车库授权维修单元出动。",
    end: true,
  },
  solar_greenhouse: {
    id: "solar_greenhouse",
    scene: "solar",
    speaker: "mother",
    listener: "alex",
    text: "温室进入保护供电。这个选择不最高效，但有长期意义。请前往机器人车库完成管线巡检授权。",
    end: true,
  },
  solar_comms: {
    id: "solar_comms",
    scene: "solar",
    speaker: "mother",
    listener: "alex",
    text: "通信塔恢复，但氧气站安全余量降低。该选择已记录。请前往机器人车库，派出 A-12 检查管线。",
    end: true,
  },
  garage_start: {
    id: "garage_start",
    scene: "garage",
    speaker: "repairRobot",
    listener: "alex",
    text: "A-12 待命。任务队列：氧气管线复查、太阳能阵列固定、外部阀门密封。请确认授权方式。",
    choices: [
      { label: "授权 A-12 按 Mother 安全流程执行。", next: "garage_authorize", effects: ["trustUp", "integrityUp", "completeGarage"] },
      { label: "我手动指定优先级，先修外部阀门。", next: "garage_manual", effects: ["autonomyUp", "completeGarage"] },
      { label: "让 Mother 和 A-12 共同生成维修协议。", next: "garage_protocol", effects: ["trustUp", "autonomyUp", "integrityUp", "completeGarage"] },
    ],
  },
  garage_authorize: {
    id: "garage_authorize",
    scene: "garage",
    speaker: "mother",
    listener: "alex",
    text: "授权完成。生命支持验收通过。下一项：温室生态舱启动。",
    end: true,
  },
  garage_manual: {
    id: "garage_manual",
    scene: "garage",
    speaker: "mother",
    listener: "alex",
    text: "外部阀门优先级已更新。你的判断有效，但我会保留风险限制。下一项：温室生态舱启动。",
    end: true,
  },
  garage_protocol: {
    id: "garage_protocol",
    scene: "garage",
    speaker: "mother",
    listener: "alex",
    text: "维修协议已建立。人类现场判断权将进入后续评估。下一项：温室生态舱启动。",
    end: true,
  },
  robot_status: {
    id: "robot_status",
    scene: "robot",
    speaker: "repairRobot",
    listener: "alex",
    text: "A-12 在线。当前服从 Mother 维修队列。可执行：管线检查、密封、阵列固定、低速搬运。",
    end: true,
  },
};
