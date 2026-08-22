# ตั้งค่า OBS สำหรับรายการ ROV

ทำตามลำดับนี้ครั้งเดียวต่อเครื่อง แล้วบันทึกไว้ใช้ได้ตลอดรายการ

---

## 1. นำเข้า Scene Collection

```
Scene Collection > Import > เลือก obs/JaturamitrRoV.json > Import
Scene Collection > JaturamitrRoV
```

ถ้าเปลี่ยนพอร์ตของ hub จาก 3000 ให้สร้างไฟล์ใหม่ก่อนนำเข้า:

```bash
node scripts/make-scene-collection.mjs --port 3000
```

**หลังนำเข้าต้องทำเองหนึ่งครั้ง** (ค่าพวกนี้ผูกกับเครื่องแต่ละเครื่อง ใส่มาให้ล่วงหน้าไม่ได้):

| Source | ต้องทำ |
|---|---|
| `CAM - Capture Card` | ดับเบิลคลิก เลือก capture card ในช่อง Device |
| `CAM - Casters` | ดับเบิลคลิก เลือกกล้องผู้บรรยาย |
| `AUD - BGM` | เลือกไฟล์เพลงประกอบ (หรือลบ source ทิ้งถ้าไม่ใช้) |
| `MED - Replay` | ปล่อยว่างไว้ ค่อยเลือกไฟล์ตอนจะเปิดรีเพลย์ |

### ผังฉาก

| Hotkey | ฉาก | ใช้เมื่อ |
|---|---|---|
| F1 | `00 - Starting Soon` | ก่อนเริ่ม — นับถอยหลัง + สปอนเซอร์ + เพลง |
| F2 | `01 - Casters Desk` | เปิดรายการ / ช่วงวิเคราะห์ |
| F3 | `02 - Ban Pick` | ช่วงแบน-พิค |
| F4 | `03 - Live Game` | ระหว่างเกม |
| F5 | `04 - Replay` | เปิดคลิปย้อนหลัง |
| F6 | `05 - Break` | พักระหว่างเกม / ระหว่างแมตช์ |
| F7 | `06 - Results` | สรุปผล BO3 |
| F8 | `07 - Ending` | ปิดรายการ |

`SRC - Game` และ `SRC - Casters` เป็นฉากรวม source ไม่ได้มีไว้ออกอากาศ — ฉากอื่นเรียกใช้ซ้ำ
แก้กล้องที่สองฉากนี้ที่เดียว ฉากที่เหลือเปลี่ยนตามทันที

> Hotkey F1–F8 ถูกฝังมาในไฟล์แล้ว **ตรวจให้แน่ใจว่าใช้ได้จริงก่อนวันงาน** — นี่คือทางถอยเมื่อหน้าคุมมีปัญหากลางไลฟ์

---

## 2. Settings > Video

| ช่อง | ค่า |
|---|---|
| Base (Canvas) Resolution | `1920x1080` |
| Output (Scaled) Resolution | `1920x1080` |
| Downscale Filter | `Lanczos` |
| Common FPS Values | `60` |

## 3. Settings > Advanced

| ช่อง | ค่า |
|---|---|
| Process Priority | `Above Normal` |
| Renderer | `Direct3D 11` |
| Color Format | `NV12` |
| Color Space | `Rec. 709` |
| Color Range | `Partial` |

---

## 4. Settings > Output (โหมด Advanced)

### ค่าที่ต้องเหมือนกันทุก encoder

| ช่อง | ค่า | เหตุผล |
|---|---|---|
| Rate Control | `CBR` | แพลตฟอร์มไลฟ์ต้องการ bitrate คงที่ |
| Keyframe Interval | `2` วินาที | **Facebook บังคับ** ถ้าไม่ใช่ 2 อาจโดนตัดกลางไลฟ์ |
| Profile | `high` | |
| Audio | AAC · `128` kbps · 48 kHz · Stereo | |

### เลือกตามการ์ดจอที่มีในเครื่อง

**NVIDIA (NVENC H.264) — ดีที่สุด ใช้ตัวนี้ถ้ามี**

| ช่อง | ค่า |
|---|---|
| Bitrate | `6000` |
| Preset | `P5: Quality` |
| Tuning | `High Quality` |
| Multipass Mode | `Two Passes (Quarter Resolution)` |
| Psycho Visual Tuning | เปิด |
| Max B-frames | `2` |

**AMD (AMF / H.264)**

| ช่อง | ค่า |
|---|---|
| Bitrate | `8000` |
| Preset | `Quality` |

> AMF ให้คุณภาพต่อ bitrate ต่ำกว่า NVENC จึงต้องดัน bitrate ขึ้นเพื่อให้ภาพเทียบเท่ากัน

**Intel (QuickSync H.264)**

| ช่อง | ค่า |
|---|---|
| Bitrate | `6000` |
| Target Usage | `quality` |

**x264 (ซอฟต์แวร์ — ใช้เมื่อไม่มี hardware encoder เท่านั้น)**

| ช่อง | ค่า |
|---|---|
| Bitrate | `6000` |
| CPU Usage Preset | `veryfast` |
| Tune | `none` |

> x264 กิน CPU หนักมาก ถ้า CPU ในหน้าคุมขึ้นเกิน 70% ให้เปลี่ยนเป็น hardware encoder หรือลดเป็น 720p

### ถ้าเน็ตไม่พอ

ต้องมี **upload ว่างอย่างน้อย 2 เท่าของ bitrate** (6000 kbps → ต้องมี 12 Mbps ขึ้นไป)

ถ้าไม่ถึง ให้ตั้ง Output (Scaled) Resolution เป็น `1280x720` และ bitrate `4000`
**อย่าลด FPS เป็นทางเลือกแรก** — ROV เป็นเกมเร็ว ภาพ 720p60 ดูลื่นกว่า 1080p30 ชัดเจน

---

## 5. Settings > Stream — Facebook Live

| ช่อง | ค่า |
|---|---|
| Service | `Facebook Live` |
| Server | `rtmps://live-api-s.facebook.com:443/rtmp/` |
| Stream Key | สร้างจาก Facebook Live Producer |

- ใช้ **persistent stream key** จะได้ไม่ต้องเปลี่ยนคีย์ทุกครั้งที่ไลฟ์
- Facebook ไลฟ์ต่อเนื่องได้สูงสุด **8 ชั่วโมง** — รายการที่ยาวกว่านี้ต้องวางแผนตัดช่วง
- ทดสอบไลฟ์แบบ **Only me** ก่อนเสมอ อย่าทดสอบด้วยการไลฟ์จริง

---

## 6. Settings > Output > Recording

**อัดไฟล์ไว้เสมอแม้จะไลฟ์อยู่** — เป็นทั้งต้นทางไฮไลต์และตัวสำรองเมื่อไลฟ์หลุด

| ช่อง | ค่า |
|---|---|
| Type | `Standard` |
| Recording Format | `hybrid MP4` (OBS 30.2+) หรือ `mkv` |
| Encoder | ถ้า GPU ไหวให้แยกจาก stream (ได้ไฟล์คุณภาพสูงกว่า) ไม่งั้นใช้ `Use stream encoder` |
| Recording Path | ไดรฟ์ที่มีที่ว่าง ≥ 50 GB |

> **ห้ามใช้ `mp4` ธรรมดา** — ถ้า OBS crash หรือไฟดับ ไฟล์ mp4 ที่ยังเขียนไม่จบจะเปิดไม่ได้ทั้งไฟล์
> `hybrid MP4` และ `mkv` กู้ได้

### Replay Buffer

`Settings > Output > Replay Buffer` → เปิด · Maximum Replay Time `30` วินาที
`Settings > Hotkeys > Save Replay` → ผูก `F9`

---

## 7. Audio

### ไมค์ผู้บรรยาย

ใส่ที่ `Settings > Audio > Global Audio Devices` (ไม่ใช่เพิ่มเป็น source ในฉาก)
วิธีนี้เสียงผู้บรรยายจะดังทุกฉากโดยอัตโนมัติ ไม่มีทางลืมใส่ในฉากใดฉากหนึ่ง

**Filter ของไมค์ ต้องเรียงตามลำดับนี้:**

1. `Noise Suppression` — เลือก RNNoise
2. `Noise Gate` — Close Threshold `-45 dB`, Open Threshold `-35 dB`
3. `Compressor` — Ratio `4:1`, Threshold `-20 dB`
4. `Limiter` — Threshold `-3 dB`

### เสียงเกมหรี่อัตโนมัติเวลาผู้บรรยายพูด (ducking)

ใส่ `Compressor` ที่ source เสียงเกม แล้วตั้ง **Sidechain / Ducking Source = ไมค์ผู้บรรยาย**
เสียงเกมจะเบาลงเองทุกครั้งที่มีคนพูด ไม่ต้องมีคนคอยลากเฟดเดอร์

### ระดับเสียงที่ควรได้

| แหล่ง | ระดับ |
|---|---|
| ผู้บรรยาย | ประมาณ `-12 dBFS` เฉลี่ย |
| เสียงเกม | ต่ำกว่าผู้บรรยาย `6–12 dB` |
| Master | peak ไม่เกิน `-6 dBFS` |

### เสียงกับภาพไม่ตรงกัน

capture card มักหน่วงเสียงเล็กน้อย ชดเชยที่
`Advanced Audio Properties > Sync Offset` (หน่วย ms, ใส่ค่าบวกเพื่อหน่วงเสียงให้ช้าลง)

---

## 8. Capture card — จุดที่พลาดกันบ่อย

ดับเบิลคลิก `CAM - Capture Card` แล้วตรวจ:

| ช่อง | ค่า | เหตุผล |
|---|---|---|
| Resolution/FPS Type | `Custom` |
| Resolution | `1920x1080` |
| FPS | `60` |
| Video Format | `NV12` หรือ `YUY2` (USB 3.0) · `MJPEG` (ถ้าติด USB 2.0) | ผิดรูปแบบจะได้ภาพกระตุกหรือเฟรมตก |
| **Buffering** | **`Disable`** | ค่าเริ่มต้นของ OBS หน่วงภาพ ทำให้ผู้บรรยายพูดไม่ทันเกม |
| Deactivate when not showing | **ปิด** | ถ้าเปิด จะเสียเวลา re-init ทุกครั้งที่สลับกลับมาฉากเกม |

### สัดส่วนภาพจากมือถือ

ROV บนมือถือเรนเดอร์ที่ 19.5:9 แต่ HDMI ส่งออกมาเป็น 16:9 → มักได้ **ขอบดำซ้ายขวา** หรือภาพยืด

แก้ที่ `CAM - Capture Card` → คลิกขวา `Filters` → เพิ่ม `Crop/Pad` → ตัดขอบดำออก
แล้วค่อยกด `Ctrl+F` (Fit to screen) ที่ item ในฉาก

> ทำขั้นตอนนี้ **ก่อน** ปรับ transform เสมอ ไม่งั้นจะได้ภาพที่ยืดผิดสัดส่วน

---

## 9. เปิด obs-websocket

```
Tools > WebSocket Server Settings
  ☑ Enable WebSocket server
  Server Port : 4455
  ☑ Enable Authentication  →  ตั้งรหัสผ่าน
```

เอารหัสผ่านไปใส่ในไฟล์ `.env` ของโปรเจกต์:

```
OBS_URL=ws://127.0.0.1:4455
OBS_PASSWORD=รหัสที่ตั้งไว้
```

---

## 10. ตรวจ Browser Source

overlay ทุกตัวถูกใส่มาในฉากให้แล้ว ตรวจว่าตั้งค่าถูก:

| ช่อง | ค่า |
|---|---|
| Width × Height | `1920 × 1080` (ยกเว้น `OVL - Sponsors` ใช้ `1920 × 200`) |
| Shutdown source when not visible | **ไม่ติ๊ก** |
| Refresh browser when scene becomes active | **ไม่ติ๊ก** |

ทั้งสองช่องนี้ถ้าติ๊กไว้ overlay จะตัดการเชื่อมต่อกับ hub ทุกครั้งที่สลับฉาก
แล้วต้องเสียเวลา reconnect ใหม่ — เห็นเป็นอาการ "สกอร์หายแวบหนึ่ง" ตอนเปลี่ยนฉาก

ถ้า overlay ขึ้นเป็นหน้าขาวหรือว่างเปล่า แปลว่า hub ยังไม่ทำงาน — สั่ง `npm run dev` ก่อน

### overlay ไม่ขึ้นเลย ทั้งที่เปิดใน browser ปกติแล้วขึ้น

```
npm run obs:refresh
```

**สาเหตุเกือบทุกครั้งคือ browser source แคชหน้าเว็บเก่าไว้** หลังแก้โค้ด overlay
OBS มักโหลดสคริปต์เก่าปนใหม่แล้วหน้าโล่งไปเลย — state ไม่มาเพราะ WebSocket ไม่ได้ต่อ
สังเกตได้จากเทอร์มินัลจะขึ้น `[vite] ws proxy socket error: ECONNABORTED` รัว ๆ

สคริปต์นี้สั่ง "Refresh cache of current page" ให้ browser source ทุกตัวที่ชี้ไปที่ `/overlay/` ในครั้งเดียว
(กดเองในหน้าต่าง OBS ทีละตัวก็ได้ แต่มี 5 ตัวและมักลืมบางตัว)

> **ให้รันทุกครั้งหลังแก้โค้ด overlay** ก่อนออกอากาศ

> การถ่ายภาพ source ด้วย obs-websocket จะได้ภาพเปล่าถ้าฉากนั้นไม่ได้ on air อยู่
> ไม่ได้แปลว่า overlay พัง — ต้องสลับไปฉากนั้นก่อนถึงจะเห็นของจริง

---

### overlay เล็กเกินไปหรือเบลอ — ตรวจ/แก้อัตโนมัติ

```
npm run fix:obs-size          ตรวจอย่างเดียว
npm run fix:obs-size -- --apply   แก้จริง
```

สคริปต์จะไล่ทุก browser source ที่ชี้ไปที่ `/overlay/...` แล้ว

1. ตั้ง **Width × Height ของตัว source** ให้เท่าผืนผ้าใบ (สปอนเซอร์ใช้ 1920 × 200)
2. รีเซ็ต transform ของ item ในฉากให้ scale = 1 · pos = 0,0 · ไม่มี bounds/crop

> **ยืดที่ฉากไม่ช่วย** — ถ้าเพิ่ม browser source เองด้วยปุ่ม `+` OBS จะตั้งให้ **800 × 600**
> หน้าเว็บจะย่อตัวเองลงเหลือ 800px แล้วต่อให้ลากขยายในฉากจนเต็มจอ ก็เป็นการขยายภาพ 800px
> ไปเป็น 1920px ภาพเบลอและตำแหน่งไม่ตรงกับวิดีโอ `Score2.mp4`
> ต้องแก้ที่ขนาดของ source เท่านั้นถึงจะคมและตรง 1:1
