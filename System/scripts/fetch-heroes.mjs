/**
 * ดึงรายชื่อฮีโร่และรูปจาก API ทางการของ Garena RoV ไทย
 *
 *   node scripts/fetch-heroes.mjs                 ดึงรูป + อัปเดต heroes.json
 *   node scripts/fetch-heroes.mjs --images-only   ดึงเฉพาะรูป ไม่แตะ heroes.json
 *   node scripts/fetch-heroes.mjs --dry           ดูก่อนว่าจะได้อะไร ไม่เขียนไฟล์
 *
 * ใช้แหล่งทางการเพราะรายชื่อฮีโร่บนเซิร์ฟเวอร์ไทยคือความจริงที่ต้องตรงกับหน้างาน
 * (ฮีโร่บางตัวมีเฉพาะบางภูมิภาค และมีการเพิ่ม/ถอดตามแพตช์)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://rov.in.th/api/v2/getHeroList';
const DEST = join(process.cwd(), 'public', 'heroes');
const LIST = join(process.cwd(), 'src', 'data', 'heroes.json');
const CONCURRENCY = 6;

const flags = new Set(process.argv.slice(2));
const DRY = flags.has('--dry') || flags.has('--dry-run');
const IMAGES_ONLY = flags.has('--images-only');

/** บทบาทของ API ทางการ → รหัสบทบาทที่ระบบเราใช้ */
const ROLE_MAP = {
  assassin: 'assassin',
  mage: 'mage',
  support: 'support',
  fighter: 'warrior',
  tank: 'tank',
  carry: 'marksman',
  marksman: 'marksman',
  warrior: 'warrior',
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * ชื่อที่ API ทางการสะกดไม่ตรงกับที่ใช้เรียกกันจริง
 * ชื่อพวกนี้ขึ้นบน overlay ให้คนดูเห็น จึงต้องสะกดให้ถูก
 */
const NAME_FIX = {
  'super man': 'Superman',
  'diao chan': 'Diaochan',
  iggy: 'Iggy',
  wukong: 'Wukong',
};

function extOf(url) {
  const m = url.split('?')[0].match(/\.(png|jpe?g|webp|avif|gif)$/i);
  return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.jpg';
}

// ---------- ดึงรายชื่อ ----------

console.log(`กำลังดึงรายชื่อฮีโร่จาก ${API}`);
const res = await fetch(API, {
  headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://rov.in.th/hero' },
});
if (!res.ok) {
  console.error(`ดึงไม่สำเร็จ: HTTP ${res.status}`);
  process.exit(1);
}
const payload = await res.json();
const raw = payload?.data?.heroes;
if (!Array.isArray(raw) || raw.length === 0) {
  console.error('API ตอบกลับมาแต่ไม่มีรายชื่อฮีโร่ — รูปแบบข้อมูลอาจเปลี่ยนไป');
  process.exit(1);
}

const heroes = raw.map((h) => {
  const name = String(h.name).trim();
  return {
    id: slugify(h.slug || name),
    name: NAME_FIX[name.toLowerCase()] ?? name,
    role: ROLE_MAP[String(h.role_text || '').toLowerCase()] ?? 'warrior',
    image: h.image,
  };
});

console.log(`ได้ ${heroes.length} ตัว`);

// ---------- เทียบกับรายชื่อเดิม ----------

let previous = [];
try {
  previous = JSON.parse(readFileSync(LIST, 'utf8'));
} catch {
  // ยังไม่มีไฟล์เดิมก็ไม่เป็นไร
}
const prevIds = new Set(previous.map((h) => h.id));
const nowIds = new Set(heroes.map((h) => h.id));
const added = heroes.filter((h) => !prevIds.has(h.id));

/**
 * ฮีโร่ที่มีในรายชื่อเดิมแต่ API ทางการไม่ได้ส่งมา — เก็บไว้ ไม่ตัดทิ้ง
 * รายชื่อจาก API ไม่ครบทั้งหมด (เช่นไม่มี Arthur, Batman) ถ้าตัดตามไปเลย
 * แล้ววันแข่งมีทีมแบนตัวที่หายไป จะกรอกกระดานไม่ได้
 */
const keep = previous.filter((h) => !nowIds.has(h.id));

if (added.length) console.log(`  เพิ่มใหม่ (${added.length}): ${added.map((h) => h.name).join(', ')}`);
if (keep.length) {
  console.log(`  ไม่มีใน API แต่เก็บไว้ (${keep.length}): ${keep.map((h) => h.name).join(', ')}`);
  console.log('    (ตัวพวกนี้จะไม่มีรูป ขึ้นเป็นตัวย่อแทน)');
}

// ---------- โหลดรูป ----------

if (!DRY) mkdirSync(DEST, { recursive: true });

let ok = 0;
const failed = [];

async function download(hero) {
  if (!hero.image) {
    failed.push(`${hero.id} (API ไม่ได้ให้ URL รูป)`);
    return;
  }
  const dest = join(DEST, hero.id + extOf(hero.image));
  if (DRY) {
    ok++;
    return;
  }
  try {
    const r = await fetch(hero.image, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
  } catch (err) {
    failed.push(`${hero.id} (${err.message})`);
  }
}

console.log(`\n${DRY ? '[ลองดูเฉย ๆ] ' : ''}กำลังโหลดรูป ${heroes.length} ไฟล์…`);
const queue = [...heroes];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const hero = queue.shift();
      await download(hero);
      process.stdout.write(`\r  ${ok + failed.length}/${heroes.length}`);
    }
  }),
);
process.stdout.write('\n');

console.log(`โหลดสำเร็จ ${ok} ไฟล์`);
if (failed.length) {
  console.log(`ล้มเหลว ${failed.length}:`);
  console.log('  ' + failed.join('\n  '));
}

// ---------- อัปเดต heroes.json ----------

if (IMAGES_ONLY) {
  console.log('\nข้ามการอัปเดต heroes.json (--images-only)');
} else if (DRY) {
  console.log('\n[ลองดูเฉย ๆ] ไม่ได้เขียน heroes.json');
} else {
  // สำรองด้วยการ "คัดลอก" ไม่ใช่ "ย้าย" — ถ้าย้าย ไฟล์จะหายไปชั่วขณะ
  // แล้ว Vite ที่ watch อยู่จะพังทันทีเพราะ import หาไฟล์ไม่เจอ
  if (existsSync(LIST)) copyFileSync(LIST, LIST + '.bak');
  const out = [...heroes.map((h) => ({ id: h.id, name: h.name, role: h.role })), ...keep].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  writeFileSync(LIST, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(
    `\nเขียน src/data/heroes.json ใหม่ (${out.length} ตัว = ${heroes.length} จาก API + ${keep.length} ที่เก็บไว้)`,
  );
  console.log('ของเดิมสำรองไว้ที่ heroes.json.bak');
}
