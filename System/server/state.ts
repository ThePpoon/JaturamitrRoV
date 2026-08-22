import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  BAN_SLOTS,
  DRAFT_ORDER,
  PICK_SLOTS,
  BRACKET_SLOTS,
  SCHEDULE_ROWS,
  STANDING_ROWS,
  type BracketSlot,
  type ScheduleRow,
  type StandingRow,
  type DraftSlot,
  type MatchAction,
  type MatchState,
  type TeamId,
} from './protocol.ts';

const STATE_FILE = join(process.cwd(), 'state.json');

function emptySchedule(): ScheduleRow[] {
  return Array.from({ length: SCHEDULE_ROWS }, () => ({
    label: '',
    kind: 'versus' as const,
    text: '',
    aLogo: '',
    bLogo: '',
    score: '',
    time: '',
  }));
}

function emptyBracket(): BracketSlot[] {
  return BRACKET_SLOTS.map(() => ({ prefix: '', name: '', logo: '' }));
}

function emptyStandings(): StandingRow[] {
  return Array.from({ length: STANDING_ROWS }, () => ({
    prefix: '',
    name: '',
    logo: '',
    match: 0,
    win: 0,
    lose: 0,
    gd: 0,
    points: 0,
  }));
}

function emptyPlayers() {
  return Array<string>(PICK_SLOTS).fill('');
}

function emptySide() {
  return {
    bans: Array<string | null>(BAN_SLOTS).fill(null),
    picks: Array<string | null>(PICK_SLOTS).fill(null),
  };
}

export function defaultState(): MatchState {
  return {
    teams: {
      A: { prefix: '', name: 'TEAM A', short: 'TMA', logo: '', color: '#2f6fed', color2: '#ffffff', score: 0, players: emptyPlayers() },
      B: { prefix: '', name: 'TEAM B', short: 'TMB', logo: '', color: '#e03a3a', color2: '#ffffff', score: 0, players: emptyPlayers() },
    },
    bestOf: 3,
    gameNumber: 1,
    matchLabel: '',
    matchNumber: 1,
    phase: 'idle',
    banPick: {
      A: emptySide(),
      B: emptySide(),
      activeSlot: DRAFT_ORDER[0],
      timerEndsAt: null,
      timerDuration: 30,
    },
    lowerThird: { visible: false, title: '', subtitle: '' },
    countdown: { visible: false, endsAt: null, label: 'การแข่งขันจะเริ่มในอีก' },
    standings: emptyStandings(),
    standingsCue: 0,
    bracket: emptyBracket(),
    bracketCue: 0,
    schedule: emptySchedule(),
    scheduleCue: 0,
  };
}

/**
 * รวม state ที่โหลดจากดิสก์เข้ากับค่า default
 * ป้องกันกรณี state.json มาจากเวอร์ชันเก่าแล้วขาดฟิลด์ใหม่ ซึ่งจะทำให้ overlay พังกลางไลฟ์
 */
function reconcile(loaded: unknown): MatchState {
  const base = defaultState();
  if (!loaded || typeof loaded !== 'object') return base;
  const l = loaded as Partial<MatchState>;
  return {
    ...base,
    ...l,
    teams: {
      A: { ...base.teams.A, ...l.teams?.A, players: fitPlayers(l.teams?.A?.players) },
      B: { ...base.teams.B, ...l.teams?.B, players: fitPlayers(l.teams?.B?.players) },
    },
    banPick: {
      ...base.banPick,
      ...l.banPick,
      A: {
        bans: fitLength(l.banPick?.A?.bans, BAN_SLOTS),
        picks: fitLength(l.banPick?.A?.picks, PICK_SLOTS),
      },
      B: {
        bans: fitLength(l.banPick?.B?.bans, BAN_SLOTS),
        picks: fitLength(l.banPick?.B?.picks, PICK_SLOTS),
      },
    },
    lowerThird: { ...base.lowerThird, ...l.lowerThird },
    countdown: { ...base.countdown, ...l.countdown },
    standings: fitStandings(l.standings),
    bracket: fitBracket(l.bracket),
    schedule: fitSchedule(l.schedule),
  };
}

/** แถบตารางแมตช์ต้องมีครบทุกแถวเสมอ overlay จะได้ไม่พังตอนวนลูป */
function fitSchedule(arr: unknown): ScheduleRow[] {
  const base = emptySchedule();
  if (!Array.isArray(arr)) return base;
  return base.map((row, i) => (arr[i] && typeof arr[i] === 'object' ? { ...row, ...arr[i] } : row));
}

/** สายการแข่งต้องมีครบทุกช่องเสมอ ช่องที่ขาดเติมด้วยช่องว่าง overlay จะได้ไม่พังตอนวนลูป */
function fitBracket(arr: unknown): BracketSlot[] {
  const base = emptyBracket();
  if (!Array.isArray(arr)) return base;
  return base.map((slot, i) => (arr[i] && typeof arr[i] === 'object' ? { ...slot, ...arr[i] } : slot));
}

/** ตารางคะแนนต้องมีครบ 4 แถวเสมอ แถวที่ขาดเติมด้วยแถวว่าง overlay จะได้ไม่พังตอนวนลูป */
function fitStandings(arr: unknown): StandingRow[] {
  const base = emptyStandings();
  if (!Array.isArray(arr)) return base;
  return base.map((row, i) => (arr[i] && typeof arr[i] === 'object' ? { ...row, ...arr[i] } : row));
}

/** ชื่อผู้เล่นต้องมีครบ 5 ช่องเสมอ ช่องที่ไม่มีข้อมูลใช้สตริงว่าง ไม่ใช่ null
    เพราะ input ในหน้าคุมผูกกับค่านี้ตรง ๆ ถ้าเป็น null/undefined React จะเตือน uncontrolled input */
function fitPlayers(arr: unknown): string[] {
  const out = Array<string>(PICK_SLOTS).fill('');
  if (Array.isArray(arr)) {
    for (let i = 0; i < PICK_SLOTS; i++) if (typeof arr[i] === 'string') out[i] = arr[i];
  }
  return out;
}

function fitLength(arr: unknown, len: number): (string | null)[] {
  const out = Array<string | null>(len).fill(null);
  if (Array.isArray(arr)) {
    for (let i = 0; i < len; i++) out[i] = typeof arr[i] === 'string' ? arr[i] : null;
  }
  return out;
}

export function loadState(): MatchState {
  if (!existsSync(STATE_FILE)) return defaultState();
  try {
    return reconcile(JSON.parse(readFileSync(STATE_FILE, 'utf8')));
  } catch (err) {
    console.warn('[state] อ่าน state.json ไม่ได้ ใช้ค่าเริ่มต้นแทน:', (err as Error).message);
    return defaultState();
  }
}

let persistTimer: NodeJS.Timeout | null = null;

/** เขียนผ่านไฟล์ชั่วคราวแล้ว rename เพื่อไม่ให้ได้ไฟล์ครึ่ง ๆ ถ้าไฟดับตอนเขียน */
export function persistState(state: MatchState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const tmp = `${STATE_FILE}.tmp`;
      writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
      renameSync(tmp, STATE_FILE);
    } catch (err) {
      console.error('[state] บันทึก state.json ไม่สำเร็จ:', (err as Error).message);
    }
  }, 500);
}

function slotValue(state: MatchState, slot: DraftSlot): string | null {
  const side = state.banPick[slot.team];
  return slot.type === 'ban' ? side.bans[slot.index] : side.picks[slot.index];
}

function writeSlot(state: MatchState, slot: DraftSlot, hero: string | null) {
  const side = state.banPick[slot.team];
  const arr = slot.type === 'ban' ? side.bans : side.picks;
  if (slot.index >= 0 && slot.index < arr.length) arr[slot.index] = hero;
}

/** ช่องว่างถัดไปตาม DRAFT_ORDER นับจากช่องที่เพิ่งกรอก */
function nextEmptySlot(state: MatchState, from: DraftSlot | null): DraftSlot | null {
  const startIdx = from
    ? DRAFT_ORDER.findIndex(
        (s) => s.team === from.team && s.type === from.type && s.index === from.index,
      ) + 1
    : 0;
  for (let i = Math.max(startIdx, 0); i < DRAFT_ORDER.length; i++) {
    if (!slotValue(state, DRAFT_ORDER[i])) return DRAFT_ORDER[i];
  }
  // ถ้าหลังช่องปัจจุบันเต็มหมดแล้ว ให้วนกลับไปหาช่องว่างที่ค้างอยู่ก่อนหน้า
  for (let i = 0; i < DRAFT_ORDER.length; i++) {
    if (!slotValue(state, DRAFT_ORDER[i])) return DRAFT_ORDER[i];
  }
  return null;
}

export function reduce(state: MatchState, msg: MatchAction): MatchState {
  const next: MatchState = structuredClone(state);

  switch (msg.action) {
    case 'setTeam':
      next.teams[msg.team] = { ...next.teams[msg.team], ...msg.patch };
      break;

    case 'adjustScore': {
      const max = Math.ceil(next.bestOf / 2);
      const t = next.teams[msg.team];
      t.score = Math.min(max, Math.max(0, t.score + msg.delta));
      break;
    }

    case 'setGameNumber':
      next.gameNumber = Math.min(next.bestOf, Math.max(1, Math.round(msg.value)));
      break;

    case 'setPlayer': {
      const list = next.teams[msg.team].players;
      if (msg.index >= 0 && msg.index < list.length) list[msg.index] = msg.name;
      break;
    }

    case 'setTimerDuration':
      // จำกัดไว้ 5-180 วิ กันพิมพ์ 0 แล้วนาฬิกาหมดเวลาทันทีกลางไลฟ์
      next.banPick.timerDuration = Math.min(180, Math.max(5, Math.round(msg.seconds)));
      break;

    case 'setMatchInfo':
      if (typeof msg.patch.matchLabel === 'string') next.matchLabel = msg.patch.matchLabel;
      if (typeof msg.patch.matchNumber === 'number') {
        next.matchNumber = Math.max(1, Math.round(msg.patch.matchNumber));
      }
      break;

    case 'swapSides': {
      const a = next.teams.A;
      next.teams.A = next.teams.B;
      next.teams.B = a;
      const bpA = next.banPick.A;
      next.banPick.A = next.banPick.B;
      next.banPick.B = bpA;
      if (next.banPick.activeSlot) {
        next.banPick.activeSlot = {
          ...next.banPick.activeSlot,
          team: next.banPick.activeSlot.team === 'A' ? 'B' : 'A',
        };
      }
      break;
    }

    case 'resetMatch': {
      const fresh = defaultState();
      // เก็บชื่อ/โลโก้/สีทีมไว้ รีเซ็ตเฉพาะสกอร์และกระดาน — ผู้ใช้แทบไม่เคยอยากล้างชื่อทีมทิ้ง
      (['A', 'B'] as TeamId[]).forEach((id) => {
        fresh.teams[id] = { ...next.teams[id], score: 0 };
      });
      // ชื่อรอบกับเลขแมตช์ก็เหมือนกัน — ตั้งทีเดียวใช้ทั้งรอบ ไม่ควรหายตอนรีเซ็ตสกอร์
      fresh.matchLabel = next.matchLabel;
      fresh.matchNumber = next.matchNumber;
      return fresh;
    }

    case 'setPhase':
      next.phase = msg.phase;
      break;

    case 'setSlot':
      writeSlot(next, msg.slot, msg.hero);
      break;

    case 'setActiveSlot':
      next.banPick.activeSlot = msg.slot;
      break;

    case 'assignToActive': {
      const slot = next.banPick.activeSlot;
      if (!slot) break;
      writeSlot(next, slot, msg.hero);
      next.banPick.activeSlot = nextEmptySlot(next, slot);
      next.banPick.timerEndsAt = null;
      break;
    }

    case 'clearBoard':
      next.banPick.A = emptySide();
      next.banPick.B = emptySide();
      next.banPick.activeSlot = DRAFT_ORDER[0];
      next.banPick.timerEndsAt = null;
      break;

    case 'startTimer': {
      const secs = msg.seconds ?? next.banPick.timerDuration;
      next.banPick.timerDuration = secs;
      next.banPick.timerEndsAt = Date.now() + secs * 1000;
      break;
    }

    case 'stopTimer':
      next.banPick.timerEndsAt = null;
      break;

    case 'setLowerThird':
      next.lowerThird = { ...next.lowerThird, ...msg.patch };
      break;

    case 'setStanding': {
      const row = next.standings[msg.index];
      if (row) next.standings[msg.index] = { ...row, ...msg.patch };
      break;
    }

    case 'sortStandings':
      // เกณฑ์มาตรฐานของรายการแบบลีก: แต้มก่อน ถ้าเท่ากันดู GD ถ้ายังเท่าอีกดูจำนวนแมตช์ที่ชนะ
      next.standings.sort((a, b) => b.points - a.points || b.gd - a.gd || b.win - a.win);
      break;

    case 'setSchedule': {
      const row = next.schedule[msg.index];
      if (row) next.schedule[msg.index] = { ...row, ...msg.patch };
      break;
    }

    case 'cueSchedule':
      next.scheduleCue = (next.scheduleCue ?? 0) + 1;
      break;

    case 'setBracket': {
      const slot = next.bracket[msg.index];
      if (slot) next.bracket[msg.index] = { ...slot, ...msg.patch };
      break;
    }

    case 'clearBracket':
      next.bracket = emptyBracket();
      break;

    case 'cueBracket':
      next.bracketCue = (next.bracketCue ?? 0) + 1;
      break;

    case 'cueStandings':
      next.standingsCue = (next.standingsCue ?? 0) + 1;
      break;

    case 'moveStanding': {
      const from = msg.index;
      const to = from + msg.delta;
      if (from < 0 || from >= next.standings.length || to < 0 || to >= next.standings.length) break;
      const [row] = next.standings.splice(from, 1);
      next.standings.splice(to, 0, row);
      break;
    }

    case 'setCountdown': {
      const { seconds, ...patch } = msg.patch;
      next.countdown = { ...next.countdown, ...patch };
      if (typeof seconds === 'number') {
        next.countdown.endsAt = seconds > 0 ? Date.now() + seconds * 1000 : null;
      }
      break;
    }
  }

  return next;
}
