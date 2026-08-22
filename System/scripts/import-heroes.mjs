/**
 * นำเข้ารูปฮีโร่จากโฟลเดอร์ที่โหลดมา แล้วเปลี่ยนชื่อไฟล์ให้ตรงกับ id ใน heroes.json
 *
 *   node scripts/import-heroes.mjs                    ดูสถานะว่ามีรูปครบหรือยัง
 *   node scripts/import-heroes.mjs <โฟลเดอร์ต้นทาง>    คัดลอกเข้ามาให้
 *   node scripts/import-heroes.mjs <โฟลเดอร์> --dry    ลองดูก่อนว่าจะจับคู่ยังไง ไม่เขียนไฟล์จริง
 *   node scripts/import-heroes.mjs <โฟลเดอร์> --move   ย้ายแทนคัดลอก
 *
 * ไฟล์ที่โหลดมามักตั้งชื่อไม่ตรงกัน เช่น "Tel'Annas.png", "hero_nakroth.jpg",
 * "128px-Lu Bu.webp" สคริปต์นี้จับคู่ให้เองโดยตัดอักขระที่ไม่ใช่ตัวอักษร/ตัวเลขออกก่อนเทียบ
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const heroes = JSON.parse(readFileSync(new URL('../src/data/heroes.json', import.meta.url), 'utf8'));

const DEST = join(process.cwd(), 'public', 'heroes');
const EXTS = new Set(['.png', '.webp', '.jpg', '.jpeg', '.avif', '.gif']);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const srcDir = args.find((a) => !a.startsWith('--'));
const DRY = flags.has('--dry') || flags.has('--dry-run');
const MOVE = flags.has('--move');

/** ตัดทุกอย่างที่ไม่ใช่ตัวอักษร/ตัวเลขออก เพื่อให้ "Tel'Annas" กับ "telannas" เทียบกันติด */
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * คำที่มักติดมากับชื่อไฟล์ที่โหลดจากเว็บ
 * ตัดเฉพาะตอนอยู่หัวหรือท้ายเท่านั้น ถ้าตัดกลางคำอาจไปโดนชื่อฮีโร่จริงเข้า
 */
const NOISE = ['hero', 'heroes', 'icon', 'icons', 'portrait', 'avatar', 'square', 'circle', 'thumb', 'aov', 'rov', 'arenaofvalor'];

function stripNoise(s) {
  let out = s;
  let changed = true;
  while (changed) {
    changed = false;
    out = out.replace(/^\d+px/, () => ((changed = true), ''));
    out = out.replace(/^\d+/, () => ((changed = true), ''));
    for (const n of NOISE) {
      if (out.startsWith(n) && out.length > n.length) {
        out = out.slice(n.length);
        changed = true;
      }
      if (out.endsWith(n) && out.length > n.length) {
        out = out.slice(0, -n.length);
        changed = true;
      }
    }
  }
  return out;
}

const byNorm = new Map(heroes.map((h) => [norm(h.id), h]));
for (const h of heroes) byNorm.set(norm(h.name), h); // เผื่อชื่อไฟล์ตรงกับชื่อแสดงผลแทน id

/** คืน hero ที่เข้าคู่ หรือ null ถ้าไม่แน่ใจ — ยอมพลาดดีกว่าจับคู่ผิดแล้วขึ้นรูปผิดคนกลางไลฟ์ */
function match(fileBase) {
  const raw = norm(fileBase);
  if (byNorm.has(raw)) return byNorm.get(raw);

  const cleaned = stripNoise(raw);
  if (byNorm.has(cleaned)) return byNorm.get(cleaned);

  // เทียบแบบ "ชื่อไฟล์มีชื่อฮีโร่อยู่ข้างใน" ใช้เฉพาะ id ยาว >= 4 ตัวอักษร
  // เพราะ id สั้นอย่าง qi / max / ata / zip ไปโผล่ในคำอื่นได้ง่ายเกินไป
  const hits = heroes.filter((h) => norm(h.id).length >= 4 && cleaned.includes(norm(h.id)));
  return hits.length === 1 ? hits[0] : null;
}

function listImages(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && EXTS.has(extname(d.name).toLowerCase()))
    .map((d) => join(d.parentPath ?? d.path ?? dir, d.name));
}

/** ฮีโร่ที่มีไฟล์รูปอยู่แล้ว (นามสกุลอะไรก็ได้) */
function existingIds() {
  if (!existsSync(DEST)) return new Set();
  const found = new Set();
  for (const f of readdirSync(DEST)) {
    const ext = extname(f).toLowerCase();
    if (EXTS.has(ext)) found.add(basename(f, ext).toLowerCase());
  }
  return found;
}

function report() {
  const have = existingIds();
  const missing = heroes.filter((h) => !have.has(h.id));
  const extra = [...have].filter((id) => !heroes.some((h) => h.id === id));

  console.log(`รูปฮีโร่: ${heroes.length - missing.length} / ${heroes.length}`);
  if (missing.length) {
    console.log(`\nยังขาด ${missing.length} ตัว:`);
    console.log('  ' + missing.map((h) => `${h.id} (${h.name})`).join('\n  '));
  } else {
    console.log('ครบทุกตัวแล้ว');
  }
  if (extra.length) {
    console.log(`\nไฟล์ที่ไม่ตรงกับฮีโร่ตัวไหนใน heroes.json (${extra.length}):`);
    console.log('  ' + extra.join(', '));
  }
}

// ---------- ไม่ได้ระบุโฟลเดอร์ต้นทาง = แค่รายงานสถานะ ----------

if (!srcDir) {
  report();
  process.exit(0);
}

if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
  console.error(`ไม่พบโฟลเดอร์: ${srcDir}`);
  process.exit(1);
}

// ---------- นำเข้า ----------

const files = listImages(srcDir);
if (files.length === 0) {
  console.error(`ไม่พบไฟล์รูปใน ${srcDir}`);
  process.exit(1);
}

if (!DRY) mkdirSync(DEST, { recursive: true });

const done = [];
const unmatched = [];
const claimed = new Map(); // id -> ไฟล์ที่จับจองไว้แล้ว กันสองไฟล์ทับกันเงียบ ๆ

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const hero = match(basename(file, ext));

  if (!hero) {
    unmatched.push(file);
    continue;
  }
  if (claimed.has(hero.id)) {
    unmatched.push(`${file}  (ซ้ำกับ ${basename(claimed.get(hero.id))} → ${hero.id})`);
    continue;
  }

  claimed.set(hero.id, file);
  const dest = join(DEST, hero.id + ext);
  if (!DRY) {
    if (MOVE) renameSync(file, dest);
    else copyFileSync(file, dest);
  }
  done.push(`${basename(file)}  →  ${hero.id}${ext}`);
}

console.log(`${DRY ? '[ลองดูเฉย ๆ ไม่ได้เขียนไฟล์] ' : ''}จับคู่ได้ ${done.length} ไฟล์`);
if (done.length) console.log('  ' + done.join('\n  '));

if (unmatched.length) {
  console.log(`\nจับคู่ไม่ได้ ${unmatched.length} ไฟล์ — ต้องเปลี่ยนชื่อเองให้ตรงกับ id:`);
  console.log('  ' + unmatched.join('\n  '));
}

console.log('');
report();
