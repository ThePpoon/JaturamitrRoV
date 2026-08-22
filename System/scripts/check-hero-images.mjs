/**
 * ตรวจความละเอียดรูปฮีโร่ในโฟลเดอร์ public/heroes/
 * อ่านขนาดจาก header ของไฟล์โดยตรง ไม่ต้องพึ่งไลบรารีประมวลผลภาพ
 *
 *   node scripts/check-hero-images.mjs [--min 256]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const args = process.argv.slice(2);
const MIN = Number(args[args.indexOf('--min') + 1]) || 256;
const DIR = join(process.cwd(), 'public', 'heroes');

/** อ่าน [กว้าง, สูง] จาก header ของ PNG หรือ JPEG */
function dims(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // SOF0-SOF15 ยกเว้น DHT(c4) JPG(c8) DAC(cc) คือ segment ที่เก็บขนาดภาพ
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

const rows = [];
for (const file of readdirSync(DIR)) {
  const ext = extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
  const d = dims(readFileSync(join(DIR, file)));
  if (d) rows.push({ id: file.replace(ext, ''), w: d[0], h: d[1] });
}

const small = rows.filter((r) => Math.min(r.w, r.h) < MIN).sort((a, b) => a.w - b.w);
const nonSquare = rows.filter((r) => r.w !== r.h);

console.log(`ตรวจ ${rows.length} ไฟล์ · เกณฑ์ขั้นต่ำ ${MIN}px`);
console.log(`ผ่านเกณฑ์ ${rows.length - small.length} · ต่ำกว่าเกณฑ์ ${small.length}`);

if (nonSquare.length) {
  console.log(`\nไม่เป็นสี่เหลี่ยมจัตุรัส (${nonSquare.length}) — จะโดน crop ตอนแสดง:`);
  nonSquare.forEach((r) => console.log(`  ${r.id}  ${r.w}x${r.h}`));
}

if (small.length) {
  console.log(`\nความละเอียดต่ำกว่า ${MIN}px (${small.length}):`);
  const bySize = new Map();
  small.forEach((r) => {
    const k = `${r.w}x${r.h}`;
    if (!bySize.has(k)) bySize.set(k, []);
    bySize.get(k).push(r.id);
  });
  [...bySize.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([size, ids]) => {
    console.log(`\n  ${size} (${ids.length} ตัว):`);
    console.log('    ' + ids.join(', '));
  });
}
