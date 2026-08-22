/**
 * สัญญาการสื่อสารระหว่าง hub server กับหน้าเว็บทั้งหมด (control panel + overlay)
 * ไฟล์นี้เป็นแหล่งความจริงเดียว — ฝั่ง client import ผ่าน src/shared/protocol.ts
 */

export type TeamId = 'A' | 'B';

export interface Team {
  /**
   * บรรทัดเล็กเหนือชื่อทีม เช่น "เบญจมราชูทิศ"
   * มีไว้สำหรับรายการที่ทุกทีมชื่อขึ้นต้นเหมือนกัน จะได้เน้นส่วนที่ต่างกันเป็นตัวใหญ่
   * ว่างได้ ถ้าว่างจะแสดงแค่ name บรรทัดเดียว
   */
  prefix: string;
  name: string;
  short: string;
  /** ชื่อไฟล์ใน public/teams/ เช่น "dragon.png" — ว่างได้ จะ fallback เป็นตัวย่อ */
  logo: string;
  /** สีประจำทีมหลัก (hex) ใช้กับตัวเลขสกอร์ พื้นโลโก้ และจุดนับเกม */
  color: string;
  /**
   * สีประจำทีมรอง (hex) — โรงเรียนไทยมักมีสีประจำสองสี
   * ใช้คู่กับสีหลักเป็นแถบสองโทนข้างชื่อทีม ถ้าเว้นว่างจะใช้สีหลักสีเดียว
   */
  color2: string;
  score: number;
  /**
   * ชื่อผู้เล่น 5 คน เรียงตรงกับช่อง pick 1-5 บนหน้า ban/pick
   * แยกจากชื่อฮีโร่ เพราะคนเดิมเล่นคนละฮีโร่ได้ทุกเกม แต่ชื่อผู้เล่นตั้งทีเดียวใช้ทั้งแมตช์
   * ช่องที่เว้นว่างจะไม่แสดงแถบชื่อใต้รูปฮีโร่
   */
  players: string[];
}

export const STANDING_ROWS = 4;

/**
 * หนึ่งแถวในตารางคะแนน
 *
 * แยกจาก Team เพราะตารางคะแนนพูดถึงทั้งรายการ (4 โรงเรียน) ส่วน Team คือสองทีมที่กำลังแข่งอยู่
 * ถ้าใช้โครงเดียวกันจะพันกันทันทีที่สลับฝั่งหรือเปลี่ยนคู่แข่ง
 *
 * ชื่อแบ่งเป็น prefix กับ name แบบเดียวกับ Team — prefix เป็นบรรทัดบนตัวเล็ก
 * ส่วน name คือส่วนที่ต่างกันของแต่ละโรง ใช้เป็นตัวจาง ๆ ด้านหลังแถวด้วย
 */
export interface StandingRow {
  prefix: string;
  name: string;
  /** ชื่อไฟล์ใน public/teams/ — ว่างได้ จะไม่แสดงตรา */
  logo: string;
  /** จำนวนแมตช์ที่ลงแข่งไปแล้ว */
  match: number;
  win: number;
  lose: number;
  /** ผลต่างเกมที่ได้-เสีย ติดลบได้ */
  gd: number;
  points: number;
}

/**
 * ช่องหนึ่งช่องบนสายการแข่ง (championship bracket)
 *
 * ใช้โครงเดียวกับ StandingRow ท่อนชื่อ แต่ไม่มีสถิติ เพราะสายการแข่งบอกแค่ "ใครอยู่ช่องไหน"
 * ช่องที่ยังไม่รู้ผลเว้น name ว่างไว้ overlay จะขึ้น TBD ให้เอง
 */
export interface BracketSlot {
  prefix: string;
  name: string;
  logo: string;
}

/**
 * ลำดับช่องบนสายการแข่ง เรียงตามที่ตาเห็นบนกราฟิก (ซ้ายบน -> ขวาล่าง)
 *
 * เก็บเป็น array ไม่ใช่ object เพราะ overlay กับหน้าคุมวนลูปชุดเดียวกันได้เลย
 * และเพิ่ม/ลดช่องทีหลังก็แก้ที่นี่ที่เดียว label ในหน้าคุมจะตามเอง
 */
export const BRACKET_SLOTS = [
  { id: 'usf1a', label: 'Upper SF #1 — ทีมบน', kind: 'team' },
  { id: 'usf1b', label: 'Upper SF #1 — ทีมล่าง', kind: 'team' },
  { id: 'usf2a', label: 'Upper SF #2 — ทีมบน', kind: 'team' },
  { id: 'usf2b', label: 'Upper SF #2 — ทีมล่าง', kind: 'team' },
  { id: 'lf1', label: 'Lower Final — ทีมบน', kind: 'team' },
  { id: 'lf2', label: 'Lower Final — ทีมล่าง', kind: 'team' },
  { id: 'uf1', label: 'Upper Final — ทีมบน', kind: 'slim' },
  { id: 'uf2', label: 'Upper Final — ทีมล่าง', kind: 'slim' },
  { id: 'lfw', label: 'ผู้ชนะ Lower Final (กล่องทอง)', kind: 'gold' },
  { id: 'gf', label: 'Grand Final / แชมป์ (กล่องทอง)', kind: 'gold' },
] as const;

export type BracketSlotId = (typeof BRACKET_SLOTS)[number]['id'];

export const SCHEDULE_ROWS = 4;

/**
 * หนึ่งแถวบนแถบตารางแมตช์ (ใช้ในฉากปิดท้าย/พักเบรก)
 *
 * ต่าง overlay ตัวอื่นตรงที่ "วาดแผงเอง" ไม่ได้วางทับกราฟิกที่ออกแบบมาให้
 * เพราะแถบนี้ยาวไม่คงที่ ขึ้นกับว่าวันนั้นมีกี่แมตช์ ทำเป็นภาพนิ่งไว้ล่วงหน้าไม่ได้
 */
export interface ScheduleRow {
  /** ป้ายหัวแถว เช่น "MATCH 3" / "NEXT MATCH" — เว้นว่างทั้ง label และเนื้อหา = ซ่อนแถวนี้ */
  label: string;
  /** versus = ตราสองข้าง + สกอร์ตรงกลาง · text = ข้อความเดียวเต็มกล่อง (เช่น SHOWMATCH) */
  kind: 'versus' | 'text';
  /** ใช้เมื่อ kind = 'text' */
  text: string;
  aLogo: string;
  bLogo: string;
  /** กลางกล่องแบบ versus — พิมพ์อะไรก็ได้ เช่น "3 - 4" หรือ "VS" */
  score: string;
  /** บรรทัดเล็กใต้สกอร์ เช่น "10:30 AM" */
  time: string;
}

export type Phase = 'idle' | 'banpick' | 'live' | 'break' | 'result';

export interface BanPickSide {
  /** hero id หรือ null ถ้าช่องยังว่าง */
  bans: (string | null)[];
  picks: (string | null)[];
}

export interface DraftSlot {
  team: TeamId;
  type: 'ban' | 'pick';
  index: number;
}

export const BAN_SLOTS = 5;
export const PICK_SLOTS = 5;

/**
 * ลำดับดราฟต์มาตรฐานของ ROV (ฝั่ง A = blue side เริ่มก่อน)
 * แก้ลำดับตรงนี้ที่เดียวถ้ากติกาของรายการต่างออกไป — หน้าคุมจะเดินตามอัตโนมัติ
 */
export const DRAFT_ORDER: DraftSlot[] = [
  // Ban phase 1 — ทีมละ 3
  { team: 'A', type: 'ban', index: 0 },
  { team: 'B', type: 'ban', index: 0 },
  { team: 'A', type: 'ban', index: 1 },
  { team: 'B', type: 'ban', index: 1 },
  { team: 'A', type: 'ban', index: 2 },
  { team: 'B', type: 'ban', index: 2 },
  // Pick phase 1
  { team: 'A', type: 'pick', index: 0 },
  { team: 'B', type: 'pick', index: 0 },
  { team: 'B', type: 'pick', index: 1 },
  { team: 'A', type: 'pick', index: 1 },
  { team: 'A', type: 'pick', index: 2 },
  { team: 'B', type: 'pick', index: 2 },
  // Ban phase 2 — ทีมละ 2 ที่เหลือ
  { team: 'B', type: 'ban', index: 3 },
  { team: 'A', type: 'ban', index: 3 },
  { team: 'B', type: 'ban', index: 4 },
  { team: 'A', type: 'ban', index: 4 },
  // Pick phase 2
  { team: 'B', type: 'pick', index: 3 },
  { team: 'A', type: 'pick', index: 3 },
  { team: 'A', type: 'pick', index: 4 },
  { team: 'B', type: 'pick', index: 4 },
];

export interface MatchState {
  teams: Record<TeamId, Team>;
  bestOf: number;
  gameNumber: number;
  /**
   * ชื่อรอบการแข่งขัน แสดงถัดจากโลโก้รายการบนแถบสกอร์ เช่น "SEMI FINALS"
   * ว่างได้ ถ้าว่างช่องนั้นจะไม่แสดงอะไรเลย ไม่กินที่
   */
  matchLabel: string;
  /** เลขแมตช์ในรอบนั้น แสดงกลางแถบเป็น "MATCH 1 - BO3" */
  matchNumber: number;
  phase: Phase;
  banPick: {
    A: BanPickSide;
    B: BanPickSide;
    activeSlot: DraftSlot | null;
    /** epoch ms ที่ timer จะหมด — null = ไม่ได้เดิน */
    timerEndsAt: number | null;
    /** วินาทีต่อหนึ่งตา ใช้ตอนกด start */
    timerDuration: number;
  };
  lowerThird: { visible: boolean; title: string; subtitle: string };
  countdown: { visible: boolean; endsAt: number | null; label: string };
  /** ตารางคะแนนของรายการ เรียงจากอันดับ 1 ลงไป — ลำดับใน array คืออันดับ */
  standings: StandingRow[];
  /**
   * ตัวนับสำหรับสั่งให้ตารางคะแนนเล่นอนิเมชันเข้าใหม่
   *
   * ค่าไม่มีความหมายในตัวเอง เปลี่ยนค่าเมื่อไหร่ overlay ก็ remount ตารางแล้วเล่นใหม่
   * มีไว้เพราะ browser source ตั้ง shutdown=false (ห้ามปิดตอนซ่อน ไม่งั้นต้อง reconnect ทุกครั้ง)
   * หน้าเว็บจึงโหลดครั้งเดียวค้างยาว อนิเมชันตอน mount เลยเล่นแค่รอบแรกรอบเดียว
   * คนคุมต้องสั่งเล่นเองได้ตอนคัตเข้าฉาก
   */
  standingsCue: number;
  /** สายการแข่ง — ยาวเท่า BRACKET_SLOTS และเรียงตรงกัน index ต่อ index */
  bracket: BracketSlot[];
  /** ตัวนับสั่งเล่นอนิเมชันเข้าของสายการแข่ง หลักการเดียวกับ standingsCue */
  bracketCue: number;
  /** แถบตารางแมตช์ ยาวเท่า SCHEDULE_ROWS */
  schedule: ScheduleRow[];
  scheduleCue: number;
}

// ---------- OBS ----------

export interface ObsStats {
  cpu: number;
  fps: number;
  /** เปอร์เซ็นต์เฟรมที่หลุดเพราะเน็ต — ตัวเลขสำคัญที่สุดตอนไลฟ์ */
  droppedPct: number;
  /** เฟรมที่หลุดเพราะ encode ไม่ทัน */
  encodeSkippedPct: number;
  kbps: number;
}

export interface SceneItem {
  id: number;
  name: string;
  enabled: boolean;
}

export interface ObsStatus {
  connected: boolean;
  error: string | null;
  scenes: string[];
  currentScene: string | null;
  studioMode: boolean;
  previewScene: string | null;
  streaming: boolean;
  recording: boolean;
  recordPaused: boolean;
  /** เวลาที่ไลฟ์มาแล้ว เช่น "01:23:45" */
  streamTimecode: string;
  recordTimecode: string;
  stats: ObsStats | null;
  /** รายการ source ในฉากที่ on air ตอนนี้ ใช้เปิด/ปิด overlay */
  currentSceneItems: SceneItem[];
}

// ---------- Messages ----------

export type ObsAction =
  | { action: 'setScene'; scene: string }
  | { action: 'setPreviewScene'; scene: string }
  | { action: 'transition' }
  | { action: 'startStream' }
  | { action: 'stopStream' }
  | { action: 'startRecord' }
  | { action: 'stopRecord' }
  | { action: 'saveReplay' }
  | { action: 'setItemEnabled'; scene: string; itemId: number; enabled: boolean }
  | { action: 'reconnect' };

export type MatchAction =
  | { action: 'setTeam'; team: TeamId; patch: Partial<Team> }
  | { action: 'adjustScore'; team: TeamId; delta: number }
  | { action: 'setGameNumber'; value: number }
  | { action: 'setMatchInfo'; patch: { matchLabel?: string; matchNumber?: number } }
  | { action: 'setPlayer'; team: TeamId; index: number; name: string }
  | { action: 'setTimerDuration'; seconds: number }
  | { action: 'swapSides' }
  | { action: 'resetMatch' }
  | { action: 'setPhase'; phase: Phase }
  | { action: 'setSlot'; slot: DraftSlot; hero: string | null }
  | { action: 'setActiveSlot'; slot: DraftSlot | null }
  | { action: 'assignToActive'; hero: string }
  | { action: 'clearBoard' }
  | { action: 'startTimer'; seconds?: number }
  | { action: 'stopTimer' }
  | { action: 'setLowerThird'; patch: Partial<MatchState['lowerThird']> }
  | { action: 'setCountdown'; patch: Partial<MatchState['countdown']> & { seconds?: number } }
  | { action: 'setStanding'; index: number; patch: Partial<StandingRow> }
  /** เรียงอันดับใหม่: แต้มมากก่อน → GD มากกว่า → ชนะมากกว่า */
  | { action: 'sortStandings' }
  | { action: 'moveStanding'; index: number; delta: number }
  | { action: 'cueStandings' }
  | { action: 'setBracket'; index: number; patch: Partial<BracketSlot> }
  | { action: 'clearBracket' }
  | { action: 'cueBracket' }
  | { action: 'setSchedule'; index: number; patch: Partial<ScheduleRow> }
  | { action: 'cueSchedule' };

export type ClientMessage =
  | ({ type: 'obs' } & ObsAction)
  | ({ type: 'match' } & MatchAction);

export type ServerMessage =
  | { type: 'state'; state: MatchState }
  | { type: 'obs'; status: ObsStatus }
  | { type: 'toast'; level: 'info' | 'error'; text: string };
