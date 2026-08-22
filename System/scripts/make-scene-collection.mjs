/**
 * สร้าง OBS scene collection สำหรับรายการ ROV
 *
 *   node scripts/make-scene-collection.mjs [--port 3000] [--out obs/JaturamitrRoV.json]
 *
 * เขียนเป็น generator แทนที่จะ commit JSON ก้อนเดียว เพราะ:
 *  - เปลี่ยนพอร์ตหรือชื่อฉากแล้วสร้างใหม่ได้ ไม่ต้องไล่แก้ JSON 1,000 บรรทัดด้วยมือ
 *  - เลย์เอาต์ของทุกฉากอยู่รวมกันที่เดียว อ่านออกว่าอะไรวางตรงไหน
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PORT = argOf('--port', '3000');
const OUT = argOf('--out', 'obs/JaturamitrRoV.json');
const COLLECTION = 'JaturamitrRoV';
const BASE = `http://localhost:${PORT}`;

const CANVAS = { w: 1920, h: 1080 };
// กล้องผู้บรรยายแบบ picture-in-picture: กว้าง 1/4 จอ เว้นขอบ 40px
const PIP = { w: 480, h: 270, margin: 40 };

// ---------- ตัวช่วยสร้าง source ----------

let idCounter = 0;

function source(id, name, settings = {}, extra = {}) {
  return {
    balance: 0.5,
    deinterlace_field_order: 0,
    deinterlace_mode: 0,
    enabled: true,
    flags: 0,
    hotkeys: {},
    id,
    mixers: 255,
    monitoring_type: 0,
    muted: false,
    name,
    private_settings: {},
    'push-to-mute': false,
    'push-to-mute-delay': 0,
    'push-to-talk': false,
    'push-to-talk-delay': 0,
    settings,
    sync: 0,
    versioned_id: id,
    volume: 1.0,
    ...extra,
  };
}

/**
 * item หนึ่งชิ้นในฉาก
 * pos/scale คิดจากพิกัดจริงบน canvas 1920x1080 เพื่อให้อ่านเลย์เอาต์ออกจากโค้ดได้ตรง ๆ
 */
function item(name, { x = 0, y = 0, w = CANVAS.w, h = CANVAS.h, srcW = CANVAS.w, srcH = CANVAS.h, visible = true } = {}) {
  return {
    align: 5, // ยึดมุมซ้ายบน
    blend_method: 'default',
    blend_type: 'normal',
    bounds: { x: 0.0, y: 0.0 },
    bounds_align: 0,
    bounds_type: 0,
    crop_bottom: 0,
    crop_left: 0,
    crop_right: 0,
    crop_top: 0,
    group_item_backup: false,
    hide_transition: { duration: 0 },
    id: ++idCounter,
    locked: false,
    name,
    pos: { x, y },
    private_settings: {},
    rot: 0.0,
    scale: { x: w / srcW, y: h / srcH },
    scale_filter: 'disable',
    show_transition: { duration: 0 },
    visible,
  };
}

function scene(name, items, hotkeyKey) {
  const s = source('scene', name, {
    custom_size: false,
    id_counter: idCounter + 1,
    items,
  });
  if (hotkeyKey) {
    // hotkey สำรองสำหรับสลับฉากที่ OBS โดยตรง เผื่อหน้าคุมมีปัญหากลางไลฟ์
    s.hotkeys = { 'OBSBasic.SelectScene': [{ key: hotkeyKey }] };
  }
  return s;
}

const overlay = (name, path, height = CANVAS.h) =>
  source('browser_source', name, {
    url: `${BASE}/overlay/${path}`,
    width: CANVAS.w,
    height,
    fps_custom: false,
    reroute_audio: false,
    restart_when_active: false,
    // ต้องเป็น false เพื่อให้ overlay ต่อกับ hub ค้างไว้ตลอด
    // ถ้า shutdown ทุกครั้งที่ซ่อน จะเสียเวลา reconnect ทุกครั้งที่สลับฉาก
    shutdown: false,
    webpage_control_level: 1,
  });

// ---------- sources ----------

const sources = [];

// กล้อง: ตั้ง buffering=false ไว้ให้แล้ว (ค่าเริ่มต้นของ OBS หน่วงภาพ)
// ส่วน device id ต้องเลือกเองหน้างานเพราะผูกกับเครื่องแต่ละเครื่อง
sources.push(
  source('dshow_input', 'CAM - Capture Card', {
    res_type: 1,
    resolution: '1920x1080',
    buffering: false,
    video_format: 0,
    active: true,
  }),
);
sources.push(
  source('dshow_input', 'CAM - Casters', {
    res_type: 0,
    buffering: false,
    active: true,
  }),
);

sources.push(
  source('color_source_v3', 'BG - Backdrop', {
    color: 4279701773, // #0d1117 (OBS เก็บเป็น 0xAABBGGRR)
    width: CANVAS.w,
    height: CANVAS.h,
  }),
);

sources.push(
  source('ffmpeg_source', 'MED - Replay', {
    is_local_file: true,
    local_file: '',
    looping: false,
    restart_on_activate: true,
    close_when_inactive: true,
  }),
);

sources.push(
  source('ffmpeg_source', 'AUD - BGM', {
    is_local_file: true,
    local_file: '',
    looping: true,
    restart_on_activate: false,
  }),
);

sources.push(
  source('text_gdiplus_v2', 'TXT - Replay Label', {
    text: 'REPLAY',
    font: { face: 'Barlow Condensed', flags: 1, size: 96, style: 'Bold' },
    color: 4294967295,
    outline: true,
    outline_size: 4,
    outline_color: 4278190080,
  }),
);

sources.push(overlay('OVL - Scoreboard', 'scoreboard'));
sources.push(overlay('OVL - BanPick', 'banpick'));
sources.push(overlay('OVL - LowerThird', 'lowerthird'));
sources.push(overlay('OVL - Countdown', 'countdown'));
sources.push(overlay('OVL - Standings', 'standings'));
sources.push(overlay('OVL - Bracket', 'bracket'));
sources.push(overlay('OVL - Schedule', 'schedule'));
sources.push(overlay('OVL - Sponsors', 'sponsors', 200));

// ---------- ฉากรวม source (nested scene) ----------
// ตั้งค่ากล้องที่เดียว ฉากอื่นเรียกใช้ซ้ำ วันงานแก้จุดเดียวจบ

sources.push(scene('SRC - Game', [item('CAM - Capture Card')]));
sources.push(scene('SRC - Casters', [item('CAM - Casters')]));

// ---------- ฉากออกอากาศ ----------

const SPONSOR_Y = CANVAS.h - 200 - 30;
const pipBottomRight = {
  x: CANVAS.w - PIP.w - PIP.margin,
  y: CANVAS.h - PIP.h - PIP.margin,
  w: PIP.w,
  h: PIP.h,
};
const pipTopRight = { x: CANVAS.w - PIP.w - PIP.margin, y: PIP.margin, w: PIP.w, h: PIP.h };
const sponsorItem = () => item('OVL - Sponsors', { y: SPONSOR_Y, h: 200, srcH: 200 });

const programScenes = [
  [
    '00 - Starting Soon',
    'OBS_KEY_F1',
    [item('OVL - Countdown'), sponsorItem(), item('AUD - BGM'), item('BG - Backdrop')],
  ],
  ['01 - Casters Desk', 'OBS_KEY_F2', [item('OVL - LowerThird'), sponsorItem(), item('SRC - Casters')]],
  [
    '02 - Ban Pick',
    'OBS_KEY_F3',
    [item('SRC - Casters', pipTopRight), item('OVL - BanPick'), item('SRC - Game')],
  ],
  [
    '03 - Live Game',
    'OBS_KEY_F4',
    [item('SRC - Casters', pipBottomRight), item('OVL - Scoreboard'), item('SRC - Game')],
  ],
  ['04 - Replay', 'OBS_KEY_F5', [item('TXT - Replay Label', { x: 70, y: 60, w: 340, h: 110, srcW: 340, srcH: 110 }), item('MED - Replay')]],
  ['05 - Break', 'OBS_KEY_F6', [item('OVL - Scoreboard'), sponsorItem(), item('AUD - BGM'), item('BG - Backdrop')]],
  [
    '06 - Results',
    'OBS_KEY_F7',
    [item('SRC - Casters', pipBottomRight), item('OVL - Scoreboard'), item('BG - Backdrop')],
  ],
  ['07 - Ending', 'OBS_KEY_F8', [sponsorItem(), item('AUD - BGM'), item('BG - Backdrop')]],
];

// OBS วาด item ตัวแรกของ array ไว้บนสุด ในโค้ดจึงเรียงจากชั้นบนลงชั้นล่าง
for (const [name, key, items] of programScenes) {
  sources.push(scene(name, items, key));
}

// ---------- ประกอบ collection ----------

const sceneOrder = programScenes.map(([name]) => ({ name }));
sceneOrder.push({ name: 'SRC - Game' }, { name: 'SRC - Casters' });

const collection = {
  AuxAudioDevice1: null,
  current_program_scene: programScenes[0][0],
  current_scene: programScenes[0][0],
  current_transition: 'Fade',
  groups: [],
  modules: {},
  name: COLLECTION,
  preview_locked: false,
  quick_transitions: [
    { duration: 300, fade_to_black: false, hotkeys: {}, id: 1, name: 'Cut' },
    { duration: 300, fade_to_black: false, hotkeys: {}, id: 2, name: 'Fade' },
  ],
  saved_projectors: [],
  scaling_enabled: false,
  scaling_level: 0,
  scaling_off_x: 0.0,
  scaling_off_y: 0.0,
  scene_order: sceneOrder,
  sources,
  transition_duration: 300,
  transitions: [],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(collection, null, 4), 'utf8');

console.log(`เขียน ${OUT} แล้ว`);
console.log(`  ฉากออกอากาศ ${programScenes.length} ฉาก + ฉากรวม source 2 ฉาก`);
console.log(`  overlay ชี้ไปที่ ${BASE}/overlay/...`);
console.log('');
console.log('นำเข้า OBS: Scene Collection > Import > เลือกไฟล์นี้');
console.log('หลังนำเข้าต้องเลือกอุปกรณ์เองหนึ่งครั้งที่ CAM - Capture Card และ CAM - Casters');
