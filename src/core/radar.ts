export const RADAR_CONTACT_KINDS = [
  "mission",
  "rover",
  "cargo",
  "xwing",
  "ship",
  "building",
  "energy",
  "robot",
  "oxygen",
  "unknown",
  "ancient",
  "coin",
  "orbital",
  "meteor",
  "sun",
] as const;

export type RadarContactKind = (typeof RADAR_CONTACT_KINDS)[number];

export type RadarContact = {
  id: string;
  label: string;
  kind: RadarContactKind;
  distance: number;
  lateral: number;
  forward: number;
  heading: number;
  priority: number;
  moving: boolean;
  missionTarget: boolean;
  unknown: boolean;
  oxygenSupplyTarget?: boolean;
  coinTarget?: boolean;
};

export type RadarMode = "compact" | "expanded";

export type RadarSelection = {
  visible: RadarContact[];
  hiddenCount: number;
};

export type RadarLayout = {
  x: number;
  y: number;
  scale: number;
  heading: number;
  distanceRatio: number;
};

export function shouldShowParkedXWing(input: {
  unlocked: boolean;
  active: boolean;
  visible: boolean;
}) {
  return input.unlocked && !input.active && input.visible;
}

const KIND_PRIORITY: Record<RadarContactKind, number> = {
  mission: 1000,
  rover: 820,
  cargo: 810,
  xwing: 800,
  oxygen: 740,
  unknown: 700,
  ancient: 680,
  meteor: 660,
  sun: 640,
  ship: 520,
  building: 500,
  energy: 430,
  robot: 460,
  coin: 380,
  orbital: 320,
};

export function classifyRadarContact(input: {
  label?: string;
  userKind?: string;
  typeHint?: RadarContactKind;
  missionTarget?: boolean;
  unknown?: boolean;
}) {
  if (input.missionTarget) return "mission" as const;
  if (input.unknown) return "unknown" as const;
  if (input.typeHint) return input.typeHint;
  const label = input.label ?? "";
  const userKind = input.userKind ?? "";
  if (userKind === "rover" || label.includes("电动巡检车")) return "rover" as const;
  if (userKind === "cargo" || label.includes("运输车")) return "cargo" as const;
  if (userKind === "xwing" || label.toLowerCase().includes("x-wing")) return "xwing" as const;
  if (label.includes("飞船")) return "ship" as const;
  if (label === "太阳") return "sun" as const;
  if (label.includes("能源") || label.includes("太阳能")) return "energy" as const;
  if (label.includes("车辆")) return "cargo" as const;
  if (label.includes("机器人")) return "robot" as const;
  if (label.includes("远古巨树拱门")) return "ancient" as const;
  return "building" as const;
}

export function radarContactPriority(contact: Pick<RadarContact, "kind" | "priority" | "distance">) {
  return (contact.priority || 0) + KIND_PRIORITY[contact.kind] - Math.min(Math.max(contact.distance, 0), 10000) * 0.01;
}

export function selectRadarContacts(contacts: readonly RadarContact[], mode: RadarMode): RadarSelection {
  const maxContacts = mode === "expanded" ? 32 : 12;
  const sorted = [...contacts].sort((a, b) => {
    const priorityDelta = radarContactPriority(b) - radarContactPriority(a);
    return priorityDelta !== 0 ? priorityDelta : a.distance - b.distance;
  });
  return {
    visible: sorted.slice(0, maxContacts),
    hiddenCount: Math.max(0, sorted.length - maxContacts),
  };
}

export function layoutRadarContact(
  contact: Pick<RadarContact, "distance" | "lateral" | "forward" | "heading">,
  radius: number,
  range: number,
  mode: RadarMode,
  zoom = 1,
): RadarLayout {
  const distanceRatio = clamp(contact.distance / Math.max(range, 1), 0, 1);
  const spreadRatio = mode === "expanded" ? Math.sqrt(distanceRatio) : distanceRatio;
  const markerScale = mode === "expanded" ? lerp(0.86, 1.22, clamp((zoom - 0.65) / 2.55, 0, 1)) : 1;
  return {
    x: clamp(contact.lateral * spreadRatio, -1, 1) * radius,
    y: clamp(-contact.forward * spreadRatio, -1, 1) * radius,
    scale: markerScale,
    heading: contact.heading,
    distanceRatio,
  };
}

export function getRadarContactSignature(contacts: readonly RadarContact[]) {
  return contacts
    .map((contact) => [
      contact.id,
      contact.label,
      contact.kind,
      Math.round(contact.lateral * 100),
      Math.round(contact.forward * 100),
      Math.round(contact.heading),
      contact.missionTarget ? 1 : 0,
      contact.unknown ? 1 : 0,
    ].join(":"))
    .sort()
    .join("|");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}
