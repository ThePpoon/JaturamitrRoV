import { useState } from 'react';
import type { ClientMessage, ObsStatus } from '../../shared/protocol.ts';
import ConfirmButton from '../ConfirmButton.tsx';

interface Props {
  obs: ObsStatus | null;
  send: (msg: ClientMessage) => void;
}

/** แยก "03 - Live Game" เป็นเลขกำกับกับชื่อ เพื่อให้ปุ่มอ่านง่ายจากระยะไกล */
function splitSceneName(name: string) {
  const m = name.match(/^(\d+)\s*[-–]\s*(.+)$/);
  return m ? { tag: m[1], label: m[2] } : { tag: null, label: name };
}

export default function LiveTab({ obs, send }: Props) {
  const [showAll, setShowAll] = useState(false);

  // ฉาก SRC เป็นฉากตั้งค่า source ไม่ได้มีไว้ออกอากาศ ซ่อนไว้กันกดพลาด
  const scenes = (obs?.scenes ?? []).filter((s) => showAll || !/^SRC\b/i.test(s));

  return (
    <>
      <section className="card">
        <h2>ฉาก</h2>
        {scenes.length === 0 ? (
          <p className="hint">
            ยังไม่พบฉากใน OBS — ตรวจว่าเชื่อมต่อ OBS แล้วและ import scene collection จาก{' '}
            <code className="url">obs/JaturamitrRoV.json</code> เรียบร้อย
          </p>
        ) : (
          <div className="scene-grid">
            {scenes.map((scene) => {
              const { tag, label } = splitSceneName(scene);
              const onair = obs?.currentScene === scene;
              return (
                <button
                  key={scene}
                  className={`scene-btn${onair ? ' onair' : ''}`}
                  onClick={() => send({ type: 'obs', action: 'setScene', scene })}
                >
                  <span className="tag">{onair ? 'ON AIR' : (tag ?? 'ฉาก')}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <label className="item-toggle" style={{ minHeight: 44 }}>
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            แสดงฉาก SRC ด้วย
          </label>
        </div>
      </section>

      {obs?.studioMode && (
        <section className="card">
          <h2>Studio mode</h2>
          <div className="row">
            <span className="chip">
              <span className="lbl">Preview</span>&nbsp;<b>{obs.previewScene ?? '—'}</b>
            </span>
            <button className="btn primary" onClick={() => send({ type: 'obs', action: 'transition' })}>
              Transition →
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            เปิด studio mode อยู่ ปุ่มฉากด้านบนจะสั่ง <b>program</b> โดยตรง
          </p>
        </section>
      )}

      <section className="card">
        <h2>ควบคุมการออกอากาศ</h2>
        <div className="row">
          {obs?.streaming ? (
            <ConfirmButton
              className="btn danger wide"
              confirmLabel="กดอีกครั้งเพื่อหยุดไลฟ์"
              onConfirm={() => send({ type: 'obs', action: 'stopStream' })}
            >
              ■ หยุดไลฟ์
            </ConfirmButton>
          ) : (
            <button
              className="btn primary wide"
              disabled={!obs?.connected}
              onClick={() => send({ type: 'obs', action: 'startStream' })}
            >
              ● เริ่มไลฟ์
            </button>
          )}

          {obs?.recording ? (
            <ConfirmButton
              className="btn danger wide"
              confirmLabel="กดอีกครั้งเพื่อหยุดอัด"
              onConfirm={() => send({ type: 'obs', action: 'stopRecord' })}
            >
              ■ หยุดอัด
            </ConfirmButton>
          ) : (
            <button
              className="btn warn wide"
              disabled={!obs?.connected}
              onClick={() => send({ type: 'obs', action: 'startRecord' })}
            >
              ● เริ่มอัด
            </button>
          )}

          <button
            className="btn wide"
            disabled={!obs?.connected}
            onClick={() => send({ type: 'obs', action: 'saveReplay' })}
          >
            ⟲ บันทึก Replay
          </button>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          อัดไฟล์ไว้เสมอแม้จะไลฟ์อยู่ — ไฟล์บันทึกคือต้นทางเดียวที่ใช้ตัดไฮไลต์ได้จริง
          และเป็นตัวสำรองถ้าไลฟ์หลุดกลางคัน
        </p>
      </section>
    </>
  );
}
