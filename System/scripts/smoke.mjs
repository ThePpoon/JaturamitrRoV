/**
 * ทดสอบ hub server แบบ end-to-end โดยไม่ต้องเปิด OBS
 * ใช้ตรวจว่า state sync ระหว่างหน้าคุมกับ overlay ทำงานจริง
 *
 *   node scripts/smoke.mjs [ws://127.0.0.1:3000/ws]
 */
import { WebSocket } from 'ws';

const URL = process.argv[2] ?? 'ws://127.0.0.1:3000/ws';
const results = [];
let failed = 0;

function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
}

/**
 * client ที่เก็บ state ทุกก้อนที่ได้รับไว้ในคิวตั้งแต่วินาทีที่ต่อสำเร็จ
 * ถ้ารอ attach listener ทีหลัง ข้อความ state แรกที่ server ส่งทันทีจะหลุดหายไป
 */
async function connect() {
  const ws = new WebSocket(URL);
  const queue = [];
  const waiters = [];

  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type !== 'state') return;
    queue.push(msg.state);
    for (const w of waiters.slice()) {
      if (w.predicate(msg.state)) {
        waiters.splice(waiters.indexOf(w), 1);
        clearTimeout(w.timer);
        w.resolve(msg.state);
      }
    }
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('เชื่อมต่อ hub ไม่ได้ภายใน 5 วินาที')), 5000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });

  return {
    send: (msg) => ws.send(JSON.stringify(msg)),
    close: () => ws.close(),
    /** ตำแหน่งปัจจุบันของคิว ใช้กันไม่ให้ wait ไปเจอ state เก่าที่เกิดก่อนคำสั่งที่เพิ่งส่ง */
    mark: () => queue.length,
    /** รอ state ที่ผ่านเงื่อนไข — ตรวจของที่ได้มาแล้ว (ตั้งแต่ since) ก่อน แล้วค่อยรอของใหม่ */
    wait(predicate, since = 0, timeoutMs = 3000) {
      for (let i = queue.length - 1; i >= since; i--) {
        if (predicate(queue[i])) return Promise.resolve(queue[i]);
      }
      return new Promise((resolve, reject) => {
        const w = {
          predicate,
          resolve,
          timer: setTimeout(() => {
            waiters.splice(waiters.indexOf(w), 1);
            reject(new Error('รอ state ไม่ทันเวลา'));
          }, timeoutMs),
        };
        waiters.push(w);
      });
    },
  };
}

const control = await connect();
const overlay = await connect();

// 1. ทั้งสอง client ต้องได้ state ทันทีที่ต่อ
const initial = await control.wait(() => true);
await overlay.wait(() => true);
check('client ได้ state ทันทีที่เชื่อมต่อ', !!initial?.teams?.A);
check('รูปแบบเป็น BO3', initial.bestOf === 3, `bestOf=${initial.bestOf}`);

// เริ่มจากสถานะสะอาดเสมอ เผื่อมี state.json ค้างจากการทดสอบรอบก่อน
control.send({ type: 'match', action: 'resetMatch' });
await overlay.wait((s) => s.teams.A.score === 0 && s.banPick.A.bans[0] === null);

// 2. คำสั่งจากหน้าคุมต้องไปถึง overlay (นี่คือหัวใจของระบบ)
const NAME = 'ทดสอบ ' + Date.now();
control.send({ type: 'match', action: 'setTeam', team: 'A', patch: { name: NAME } });
const onOverlay = await overlay.wait((s) => s.teams.A.name === NAME);
check('เปลี่ยนชื่อทีมที่หน้าคุมแล้ว overlay อัปเดตตาม', onOverlay.teams.A.name === NAME);

// 3. สกอร์ต้องตันที่จำนวนเกมที่ต้องชนะ (BO3 = 2)
for (let i = 0; i < 5; i++) control.send({ type: 'match', action: 'adjustScore', team: 'A', delta: 1 });
const capped = await overlay.wait((s) => s.teams.A.score === 2).catch(() => null);
check('สกอร์ตันที่ 2 ใน BO3 กดเกินไม่ขึ้น', capped?.teams.A.score === 2, `score=${capped?.teams.A.score}`);

// 4. ดราฟต์: เลือกฮีโร่แล้วช่องที่กำลังกรอกต้องเลื่อนตามลำดับเอง
control.send({ type: 'match', action: 'assignToActive', hero: 'nakroth' });
const afterPick = await overlay.wait((s) => s.banPick.A.bans[0] === 'nakroth');
check('เลือกฮีโร่ลงช่องแรกได้', afterPick.banPick.A.bans[0] === 'nakroth');
check(
  'ช่องที่กำลังกรอกเลื่อนไปฝั่ง B ตามลำดับดราฟต์',
  afterPick.banPick.activeSlot?.team === 'B' && afterPick.banPick.activeSlot?.type === 'ban',
  JSON.stringify(afterPick.banPick.activeSlot),
);

// 5. สลับฝั่งต้องพากระดาน ban/pick ไปด้วย ไม่ใช่สลับแค่ชื่อ
let m = overlay.mark();
control.send({ type: 'match', action: 'swapSides' });
const swapped = await overlay.wait((s) => s.teams.B.name === NAME, m);
check('สลับฝั่งย้ายทั้งชื่อและกระดานไปด้วยกัน', swapped.banPick.B.bans[0] === 'nakroth');

// 6. รีเซ็ตต้องล้างสกอร์และกระดาน แต่เก็บชื่อทีมไว้
m = overlay.mark();
control.send({ type: 'match', action: 'resetMatch' });
const reset = await overlay.wait((s) => s.teams.B.score === 0 && s.banPick.B.bans[0] === null, m);
check('รีเซ็ตแมตช์ล้างสกอร์และกระดานแต่เก็บชื่อทีม', reset.teams.B.name === NAME);

control.close();
overlay.close();

console.log('\n' + results.join('\n'));
console.log(failed === 0 ? `\nผ่านทั้งหมด ${results.length} ข้อ` : `\nไม่ผ่าน ${failed} ข้อ`);
process.exit(failed === 0 ? 0 : 1);
