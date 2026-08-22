/**
 * สร้างไฟล์ .env สำหรับเครื่องใหม่
 * เรียกจาก setup.bat โดยส่งรหัสผ่านมาทาง environment variable ชื่อ OBSPASS
 *
 * ที่ต้องแยกเป็นไฟล์แทนการเขียน node -e ใน setup.bat เพราะ:
 *  - รหัสผ่านที่มี " & ^ | ทำให้ cmd แยกคำสั่งผิด ถ้าส่งผ่าน command line
 *  - ลำดับ \n ในสตริงยาว ๆ บน command line ของ cmd เชื่อถือไม่ได้
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), '.env');

// กันเหนียว: ไม่เขียนทับของเดิมเด็ดขาด เพราะข้างในมีรหัสผ่านที่ผู้ใช้ตั้งไว้
if (existsSync(FILE)) {
  console.log('มีไฟล์ .env อยู่แล้ว ไม่เขียนทับ');
  process.exit(0);
}

const password = process.env.OBSPASS ?? '';

const content = [
  '# obs-websocket (Tools > WebSocket Server Settings ใน OBS)',
  'OBS_URL=ws://127.0.0.1:4455',
  `OBS_PASSWORD=${password}`,
  '',
  '# พอร์ตของ hub server',
  'PORT=3000',
  'HUB_PORT=3001',
  '',
].join('\n');

writeFileSync(FILE, content, 'utf8');
console.log(password ? 'สร้าง .env พร้อมรหัสผ่านแล้ว' : 'สร้าง .env แล้ว (ยังไม่ได้ใส่รหัสผ่าน)');
