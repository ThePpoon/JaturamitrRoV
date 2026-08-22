import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { WebSocketServer, type WebSocket } from 'ws';

import { ObsManager } from './obs.ts';
import { loadState, persistState, reduce } from './state.ts';
import type { ClientMessage, MatchState, ObsStatus, ServerMessage } from './protocol.ts';

// Node โหลด .env ได้เองตั้งแต่ v20.12 ไม่ต้องพึ่ง dotenv
try {
  process.loadEnvFile(join(process.cwd(), '.env'));
} catch {
  // ไม่มี .env ก็ใช้ค่าเริ่มต้นได้
}

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(isProd ? (process.env.PORT ?? 3000) : (process.env.HUB_PORT ?? 3001));
const OBS_URL = process.env.OBS_URL ?? 'ws://127.0.0.1:4455';
const OBS_PASSWORD = process.env.OBS_PASSWORD ?? '';

let state: MatchState = loadState();
const clients = new Set<WebSocket>();

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(msg: ServerMessage) {
  const raw = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(raw);
  }
}

function broadcastState() {
  broadcast({ type: 'state', state });
  persistState(state);
}

/**
 * เคลียร์นาฬิกาให้เองเมื่อหมดเวลา
 *
 * ถ้าไม่ทำ timerEndsAt จะค้างเป็นเวลาในอดีตตลอด แล้ว secondsLeft() คืน 0 ไปเรื่อย ๆ
 * ผลคือหน้าคุมค้างที่ 00:00 สีแดง และ overlay ค้างเลข 0 กะพริบแดงไม่มีวันหยุด
 * จนกว่าคนคุมจะไปกด "หยุด" เอง ซึ่งกลางดราฟต์ไม่มีใครว่างไปกด — ดูเหมือนระบบค้าง
 *
 * hub เป็นที่เดียวที่รู้เวลาจริง จึงต้องเคลียร์จากตรงนี้ ไม่ใช่ให้แต่ละหน้าเดาเอง
 * ไม่งั้น overlay กับหน้าคุมจะเคลียร์คนละจังหวะกัน
 */
const TIMER_GRACE_MS = 2000; // ค้างเลข 0 ไว้แป๊บหนึ่งให้คนดูเห็นว่าหมดเวลาแล้วจริง ๆ
let timerSweep: NodeJS.Timeout | null = null;

function scheduleTimerSweep() {
  if (timerSweep) {
    clearTimeout(timerSweep);
    timerSweep = null;
  }
  const endsAt = state.banPick.timerEndsAt;
  if (!endsAt) return;

  timerSweep = setTimeout(() => {
    timerSweep = null;
    // มีคนกดเริ่มรอบใหม่ระหว่างรอ — ปล่อยให้รอบใหม่ทำงานต่อ อย่าไปตัดของเขา
    if (state.banPick.timerEndsAt !== endsAt) return;
    state = reduce(state, { action: 'stopTimer' });
    broadcastState();
  }, Math.max(0, endsAt - Date.now()) + TIMER_GRACE_MS);
}

let lastObsStatus: ObsStatus | null = null;
const obs = new ObsManager(OBS_URL, OBS_PASSWORD, (status) => {
  lastObsStatus = status;
  broadcast({ type: 'obs', status });
});

const app = Fastify({ logger: false });

app.get('/api/health', async () => ({
  ok: true,
  obs: lastObsStatus?.connected ?? false,
  clients: clients.size,
}));

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const ASSET_KINDS = new Set(['teams', 'sponsors', 'heroes']);

/**
 * รายชื่อไฟล์รูปใน public/<kind>/
 * มีไว้ให้หน้าคุมทำ dropdown เลือกโลโก้ได้ แทนที่จะต้องพิมพ์ชื่อไฟล์เองแล้วพิมพ์ผิด
 */
app.get<{ Params: { kind: string } }>('/api/assets/:kind', async (req, reply) => {
  const { kind } = req.params;
  if (!ASSET_KINDS.has(kind)) return reply.code(404).send({ error: 'unknown asset kind' });
  const dir = join(process.cwd(), 'public', kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => IMAGE_RE.test(f))
    .sort();
});

const HERO_EXTS = ['.png', '.webp', '.jpg', '.jpeg', '.avif', '.gif'];
const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};

/**
 * รูปฮีโร่จาก public/heroes/ โดยหาให้เองว่าไฟล์เป็นนามสกุลอะไร
 * ทำเป็น endpoint แทนที่จะให้ overlay เดา URL ตรง ๆ เพราะรูปที่โหลดมาจากแหล่งต่าง ๆ
 * มีทั้ง .png .jpg .webp ปนกัน ถ้าบังคับให้เป็น .png อย่างเดียวต้องมานั่งแปลงไฟล์ทีละตัว
 */
app.get<{ Params: { id: string } }>('/api/hero-image/:id', async (req, reply) => {
  // กัน path traversal: id มาจาก URL จึงต้องเหลือแค่อักขระที่ใช้ตั้งชื่อฮีโร่ได้จริง
  const id = req.params.id.replace(/[^a-z0-9_-]/gi, '');
  if (!id) return reply.code(404).send();

  const dir = join(process.cwd(), 'public', 'heroes');
  for (const ext of HERO_EXTS) {
    const file = join(dir, id + ext);
    if (existsSync(file)) {
      return reply
        .type(MIME[ext])
        .header('cache-control', 'public, max-age=3600')
        .send(createReadStream(file));
    }
  }
  return reply.code(404).send();
});

if (isProd) {
  const dist = join(process.cwd(), 'dist');
  if (!existsSync(dist)) {
    console.error('[hub] ไม่พบโฟลเดอร์ dist/ — รัน `npm run build` ก่อนใช้โหมด production');
    process.exit(1);
  }
  await app.register(fastifyStatic, { root: dist });
  // ทุก route ที่ไม่ใช่ไฟล์จริงให้ตกที่ index.html เพราะ client เป็น SPA
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' });
    return reply.sendFile('index.html');
  });
}

const wss = new WebSocketServer({ server: app.server, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  // ส่ง state ก้อนเต็มทันทีที่ต่อ — overlay ที่เพิ่งเปิดจะได้ภาพถูกต้องโดยไม่ต้องรอ event ถัดไป
  send(ws, { type: 'state', state });
  send(ws, { type: 'obs', status: obs.getStatus() });

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === 'match') {
      const { type: _t, ...action } = msg;
      state = reduce(state, action as Parameters<typeof reduce>[1]);
      broadcastState();
      // ทุก action แตะนาฬิกาได้หมด (startTimer, stopTimer, assignToActive, clearBoard, resetMatch)
      // จึงตั้งใหม่ทุกครั้งแทนที่จะดักเฉพาะบาง action แล้วหลุดกรณีใดกรณีหนึ่ง
      scheduleTimerSweep();
      return;
    }

    if (msg.type === 'obs') {
      const { type: _t, ...action } = msg;
      void obs.dispatch(action as Parameters<typeof obs.dispatch>[0]).then((err) => {
        if (err) send(ws, { type: 'toast', level: 'error', text: err });
      });
    }
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

await app.listen({ port: PORT, host: '0.0.0.0' });

// state.json อาจถูกบันทึกไว้ตอนนาฬิกากำลังเดิน ถ้า hub รีสตาร์ทกลางคันจะโหลดเวลาที่หมดไปแล้วกลับมา
// ต้องกวาดทิ้งตั้งแต่ตอนบูต ไม่งั้นเปิดมาเจอนาฬิกาค้าง 0 กะพริบแดงทันที
scheduleTimerSweep();

const webPort = isProd ? PORT : 3000;
console.log('');
console.log('  Jaturamitr ROV — Broadcast Hub');
console.log('  ------------------------------------------------');
console.log(`  OBS        : ${OBS_URL}${OBS_PASSWORD ? '' : '  (ไม่ได้ตั้งรหัสผ่าน)'}`);
console.log(`  หน้าคุม     : http://localhost:${webPort}/control`);
for (const ip of lanAddresses()) {
  console.log(`  จากแท็บเล็ต : http://${ip}:${webPort}/control`);
}
console.log('');
console.log('  Browser Source ที่ต้องใส่ใน OBS:');
for (const path of ['scoreboard', 'banpick', 'lowerthird', 'sponsors', 'countdown']) {
  console.log(`    http://localhost:${webPort}/overlay/${path}`);
}
console.log('');

await obs.start();

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    obs.stop();
    void app.close().then(() => process.exit(0));
  });
}
