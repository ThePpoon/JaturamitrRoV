import { useState } from 'react';
import type { ClientMessage, MatchState, ObsStatus, Phase } from '../../shared/protocol.ts';
import { formatClock, secondsLeft, useNow } from '../../shared/useHub.ts';

interface Props {
  state: MatchState;
  obs: ObsStatus | null;
  send: (msg: ClientMessage) => void;
}

const PHASES: { id: Phase; label: string }[] = [
  { id: 'idle', label: 'ยังไม่เริ่ม' },
  { id: 'banpick', label: 'Ban / Pick' },
  { id: 'live', label: 'กำลังแข่ง' },
  { id: 'break', label: 'พักเบรก' },
  { id: 'result', label: 'สรุปผล' },
];

const OVERLAY_PAGES = ['scoreboard', 'banpick', 'lowerthird', 'sponsors', 'countdown'];

const COUNTDOWN_PRESETS = [1, 3, 5, 10, 15];

export default function OverlayTab({ state, obs, send }: Props) {
  const now = useNow(250);
  const [title, setTitle] = useState(state.lowerThird.title);
  const [subtitle, setSubtitle] = useState(state.lowerThird.subtitle);
  const [label, setLabel] = useState(state.countdown.label);

  const left = secondsLeft(state.countdown.endsAt, now);

  return (
    <>
      <section className="card">
        <h2>ช่วงของรายการ</h2>
        <div className="row">
          {PHASES.map((p) => (
            <button
              key={p.id}
              className={`btn${state.phase === p.id ? ' primary' : ''}`}
              onClick={() => send({ type: 'match', action: 'setPhase', phase: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          overlay ใช้ค่านี้ตัดสินใจว่าจะแสดงอะไร เช่น หน้าสรุปผลจะขึ้นเฉพาะตอนเลือก “สรุปผล”
        </p>
      </section>

      <section className="card">
        <h2>เปิด / ปิด source ในฉากที่ออกอากาศ</h2>
        {!obs?.currentScene ? (
          <p className="hint">ยังไม่ทราบฉากปัจจุบัน</p>
        ) : obs.currentSceneItems.length === 0 ? (
          <p className="hint">ฉาก “{obs.currentScene}” ยังไม่มี source</p>
        ) : (
          <>
            <p className="hint" style={{ marginBottom: 12 }}>
              ฉากปัจจุบัน: <b>{obs.currentScene}</b>
            </p>
            <div className="item-list">
              {obs.currentSceneItems.map((item) => (
                <label key={item.id} className="item-toggle">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      send({
                        type: 'obs',
                        action: 'setItemEnabled',
                        scene: obs.currentScene!,
                        itemId: item.id,
                        enabled: e.target.checked,
                      })
                    }
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>Lower third</h2>
        <div className="row">
          <label className="field grow">
            บรรทัดบน
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อผู้บรรยาย" />
          </label>
          <label className="field grow">
            บรรทัดล่าง
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="ตำแหน่ง / คำอธิบาย"
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            onClick={() => send({ type: 'match', action: 'setLowerThird', patch: { title, subtitle, visible: true } })}
          >
            แสดง
          </button>
          <button
            className="btn"
            onClick={() => send({ type: 'match', action: 'setLowerThird', patch: { visible: false } })}
          >
            ซ่อน
          </button>
          <span className={`chip ${state.lowerThird.visible ? 'on' : ''}`}>
            <span className="dot" />
            {state.lowerThird.visible ? 'กำลังแสดง' : 'ซ่อนอยู่'}
          </span>
        </div>
      </section>

      <section className="card">
        <h2>นับถอยหลัง</h2>
        <div className="row">
          <label className="field grow">
            ข้อความ
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <div className="timer-big">{left === null ? '--:--' : formatClock(left)}</div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {COUNTDOWN_PRESETS.map((m) => (
            <button
              key={m}
              className="btn"
              onClick={() =>
                send({ type: 'match', action: 'setCountdown', patch: { seconds: m * 60, label, visible: true } })
              }
            >
              {m} นาที
            </button>
          ))}
          <div className="grow" />
          <button
            className="btn"
            onClick={() => send({ type: 'match', action: 'setCountdown', patch: { visible: false, seconds: 0 } })}
          >
            ซ่อน / หยุด
          </button>
        </div>
      </section>

      <section className="card">
        <h2>ที่อยู่ Browser Source</h2>
        <p className="hint" style={{ marginBottom: 10 }}>
          เพิ่มเป็น Browser Source ใน OBS ขนาด <b>1920 × 1080</b> (ยกเว้น sponsors ใช้ 1920 × 200)
          และ <b>ไม่ต้อง</b> ติ๊ก “Shutdown source when not visible” เพื่อให้ overlay ต่อกับ hub ค้างไว้ตลอด
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {OVERLAY_PAGES.map((p) => (
            <code key={p} className="url">
              {location.origin}/overlay/{p}
            </code>
          ))}
        </div>
      </section>
    </>
  );
}
