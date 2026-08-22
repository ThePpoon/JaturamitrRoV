/**
 * สั่ง "Refresh cache of current page" ให้ browser source ของ overlay ทุกตัวใน OBS
 *
 *   npm run obs:refresh
 *
 * ทำไมต้องมี — browser source ใน OBS แคชหน้าเว็บไว้แน่นมาก
 * หลังแก้โค้ด overlay แล้ว OBS มักยังโชว์ของเก่า หรือแย่กว่านั้นคือโหลดสคริปต์เก่าปนใหม่
 * แล้วหน้าโล่งไปเลย (state ไม่มา เพราะ WebSocket ไม่ได้ต่อ)
 * อาการจะเหมือน "เปิดใน browser ปกติแล้วขึ้น แต่ใน OBS ไม่ขึ้น"
 *
 * กด refresh ในหน้าต่าง OBS ทีละตัวก็ได้ แต่มี 5 overlay และมักลืมบางตัว
 * สคริปต์นี้ไล่ให้ครบทุกตัวที่ url ชี้ไปที่ /overlay/ ในครั้งเดียว
 */
import { join } from 'node:path';
import OBSWebSocket from 'obs-websocket-js';

try {
  process.loadEnvFile(join(process.cwd(), '.env'));
} catch {
  // ไม่มี .env ก็ใช้ค่าเริ่มต้นได้
}

const obs = new OBSWebSocket();
await obs.connect(process.env.OBS_URL ?? 'ws://127.0.0.1:4455', process.env.OBS_PASSWORD ?? '');

const { inputs } = await obs.call('GetInputList', { inputKind: 'browser_source' });
let done = 0;

for (const input of inputs) {
  const name = input.inputName;
  const { inputSettings } = await obs.call('GetInputSettings', { inputName: name });
  const url = inputSettings.url ?? '';
  if (!/\/overlay\//.test(url)) continue;

  await obs.call('PressInputPropertiesButton', { inputName: name, propertyName: 'refreshnocache' });
  console.log(`รีเฟรชแล้ว: ${name}  (${url})`);
  done++;
}

if (!done) {
  console.log('ไม่พบ browser source ที่ชี้ไปที่ /overlay/ ใน OBS');
} else {
  console.log('');
  console.log(`รีเฟรชไปทั้งหมด ${done} ตัว`);
  console.log('ถ้ายังไม่ขึ้น ให้ตรวจว่า hub ทำงานอยู่ (`npm run dev`) แล้วรันซ้ำอีกครั้ง');
}

await obs.disconnect();
