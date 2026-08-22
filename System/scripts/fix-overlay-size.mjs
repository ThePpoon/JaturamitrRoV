/**
 * ตั้งขนาด browser source ของ overlay ใน OBS ให้ตรงกับผืนผ้าใบ แล้วรีเซ็ต transform ให้เต็มจอพอดี
 *
 *   node scripts/fix-overlay-size.mjs           ตรวจอย่างเดียว ไม่แก้อะไร
 *   node scripts/fix-overlay-size.mjs --apply   แก้จริง
 *
 * ทำไมต้องมีสคริปต์นี้ — overlay ทุกตัวถูกออกแบบบนผืนผ้าใบ 1920x1080 แบบพิกเซลต่อพิกเซล
 * (โดยเฉพาะแถบสกอร์ที่ต้องวางทับช่องว่างในวิดีโอ animation/Score2.mp4 ให้ตรงเป๊ะ)
 * ถ้า browser source ถูกตั้งไว้ขนาดอื่น — ค่าเริ่มต้นตอนกด "+" ใน OBS คือ 800x600 —
 * หน้าเว็บจะย่อตัวเองลงตามขนาดนั้น แล้วต้องไปยืดที่ scene อีกที ภาพจะเบลอและตำแหน่งเพี้ยน
 * แก้ที่ขนาดของ source เท่านั้นถึงจะได้ 1:1 จริง ยืดที่ scene ไม่ช่วย
 */
import { join } from 'node:path';
import OBSWebSocket from 'obs-websocket-js';

try {
  process.loadEnvFile(join(process.cwd(), '.env'));
} catch {
  // ไม่มี .env ก็ใช้ค่าเริ่มต้นได้
}

const APPLY = process.argv.includes('--apply');
const OBS_URL = process.env.OBS_URL ?? 'ws://127.0.0.1:4455';
const OBS_PASSWORD = process.env.OBS_PASSWORD ?? '';

/** overlay ที่ต้องสูงเท่าผืนผ้าใบ กับตัวที่เป็นแถบเตี้ย ๆ วางลอยอยู่ในฉาก */
const STRIP_HEIGHT = { sponsors: 200 };

const obs = new OBSWebSocket();
await obs.connect(OBS_URL, OBS_PASSWORD);

const { baseWidth, baseHeight } = await obs.call('GetVideoSettings');
console.log(`ผืนผ้าใบของ OBS : ${baseWidth} x ${baseHeight}`);
if (baseWidth !== 1920 || baseHeight !== 1080) {
  console.log('  ! overlay ออกแบบไว้บน 1920x1080 — ตั้ง Settings > Video > Base Resolution ให้ตรงก่อน');
}
console.log(APPLY ? 'โหมด: แก้จริง' : 'โหมด: ตรวจอย่างเดียว (ใส่ --apply เพื่อแก้)');
console.log('');

const { inputs } = await obs.call('GetInputList', { inputKind: 'browser_source' });
const { scenes } = await obs.call('GetSceneList');

let changed = 0;

for (const input of inputs) {
  const name = input.inputName;
  const { inputSettings } = await obs.call('GetInputSettings', { inputName: name });
  const url = inputSettings.url ?? '';
  const match = url.match(/\/overlay\/([a-z]+)/);
  if (!match) continue;

  // OBS ไม่ส่งค่าที่ยังเป็นค่า default กลับมาใน inputSettings — browser source เริ่มต้นที่ 800x600
  const nowW = inputSettings.width ?? 800;
  const nowH = inputSettings.height ?? 600;
  const wantW = baseWidth;
  const wantH = STRIP_HEIGHT[match[1]] ?? baseHeight;
  const fullCanvas = wantH === baseHeight;

  console.log(`${name}  (${url})`);
  console.log(`  ขนาด source : ${nowW} x ${nowH}  ->  ${wantW} x ${wantH}${nowW === wantW && nowH === wantH ? '  (ถูกอยู่แล้ว)' : '  << ต้องแก้'}`);

  if (APPLY && (nowW !== wantW || nowH !== wantH)) {
    await obs.call('SetInputSettings', {
      inputName: name,
      inputSettings: { width: wantW, height: wantH },
      overlay: true, // รวมกับค่าเดิม ไม่ล้าง url และค่าอื่นทิ้ง
    });
    changed++;
  }

  // ขนาด source ถูกแล้วยังไม่พอ ถ้า item ในฉากถูกลากย่อ/ขยายไว้ ภาพก็ยังเพี้ยนอยู่ดี
  for (const scene of scenes) {
    const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: scene.sceneName });
    for (const si of sceneItems) {
      if (si.sourceName !== name) continue;
      const t = si.sceneItemTransform;
      const offScale = Math.abs(t.scaleX - 1) > 0.001 || Math.abs(t.scaleY - 1) > 0.001;
      const offPos = fullCanvas && (t.positionX !== 0 || t.positionY !== 0);
      const offBounds = t.boundsType !== 'OBS_BOUNDS_NONE';
      const offCrop = t.cropLeft || t.cropRight || t.cropTop || t.cropBottom;

      if (!offScale && !offPos && !offBounds && !offCrop) {
        console.log(`  ฉาก ${scene.sceneName} : transform ปกติ`);
        continue;
      }

      console.log(
        `  ฉาก ${scene.sceneName} : scale ${t.scaleX.toFixed(3)},${t.scaleY.toFixed(3)}` +
          ` pos ${Math.round(t.positionX)},${Math.round(t.positionY)}` +
          ` bounds ${t.boundsType}  << ต้องรีเซ็ต`,
      );

      if (APPLY) {
        await obs.call('SetSceneItemTransform', {
          sceneName: scene.sceneName,
          sceneItemId: si.sceneItemId,
          sceneItemTransform: {
            scaleX: 1,
            scaleY: 1,
            // แถบเตี้ยอย่างสปอนเซอร์ตั้งใจวางลอยกลางจอ เก็บตำแหน่งเดิมไว้ ย้ายให้เฉพาะตัวที่ต้องเต็มจอ
            ...(fullCanvas ? { positionX: 0, positionY: 0 } : {}),
            boundsType: 'OBS_BOUNDS_NONE',
            cropLeft: 0,
            cropRight: 0,
            cropTop: 0,
            cropBottom: 0,
          },
        });
        changed++;
      }
    }
  }
  console.log('');
}

if (!inputs.length) console.log('ไม่พบ browser source ใน OBS เลย');

console.log(APPLY ? `แก้ไปทั้งหมด ${changed} จุด` : 'ยังไม่ได้แก้อะไร — รันซ้ำด้วย --apply ถ้าค่าข้างบนถูกต้อง');

await obs.disconnect();
