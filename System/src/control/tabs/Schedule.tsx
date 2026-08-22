import { useEffect, useState } from 'react';
import type { ClientMessage, MatchState, ScheduleRow } from '../../shared/protocol.ts';

interface Props {
  state: MatchState;
  send: (msg: ClientMessage) => void;
}

export default function ScheduleTab({ state, send }: Props) {
  const [logos, setLogos] = useState<string[]>([]);
  const [logosLoaded, setLogosLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/assets/teams')
      .then((r) => r.json())
      .then((files: string[]) => setLogos(files))
      .catch(() => setLogos([]))
      .finally(() => setLogosLoaded(true));
  }, []);

  const patch = (index: number, p: Partial<ScheduleRow>) =>
    send({ type: 'match', action: 'setSchedule', index, patch: p });

  const logoSelect = (index: number, key: 'aLogo' | 'bLogo', label: string) => {
    const value = state.schedule[index][key];
    return (
      <label className="field grow">
        {label}
        <select value={value} onChange={(e) => patch(index, { [key]: e.target.value } as Partial<ScheduleRow>)}>
          <option value="">— ไม่มี —</option>
          {logosLoaded && value && !logos.includes(value) && <option value={value}>⚠ {value} — ไม่พบไฟล์</option>}
          {logos.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
    );
  };

  return (
    <section className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>แถบตารางแมตช์</h2>
        <div className="grow" />
        <button className="btn" onClick={() => send({ type: 'match', action: 'cueSchedule' })}>
          ▶ เล่นอนิเมชันเข้า
        </button>
      </div>

      <p className="hint" style={{ marginBottom: 16 }}>
        แถวที่ <b>ไม่ได้กรอกอะไรเลยจะหายไปจากจอ</b> และแถวที่เหลือเลื่อนขึ้นมาชิดกันเอง —
        วันไหนมี 2 แมตช์ก็กรอกแค่ 2 แถว ไม่ต้องปิดอะไรเพิ่ม
      </p>

      {state.schedule.map((row, i) => (
        <div key={i} className="team-card" style={{ marginBottom: 12 }}>
          <div className="row">
            <label className="field" style={{ width: 210 }}>
              ป้ายหัวแถว
              <input
                type="text"
                value={row.label}
                placeholder="เช่น MATCH 3 / NEXT MATCH"
                onChange={(e) => patch(i, { label: e.target.value })}
              />
            </label>

            <label className="field" style={{ width: 190 }}>
              รูปแบบ
              <select
                value={row.kind}
                onChange={(e) => patch(i, { kind: e.target.value as ScheduleRow['kind'] })}
              >
                <option value="versus">ตราสองข้าง + สกอร์</option>
                <option value="text">ข้อความเดียว (SHOWMATCH)</option>
              </select>
            </label>

            <label className="field" style={{ width: 150 }}>
              เวลา
              <input
                type="text"
                value={row.time}
                placeholder="เช่น 10:30 AM"
                onChange={(e) => patch(i, { time: e.target.value })}
              />
            </label>

            <div className="grow" />

            <button
              className="btn ghost"
              onClick={() =>
                patch(i, { label: '', text: '', aLogo: '', bLogo: '', score: '', time: '' })
              }
            >
              ล้างแถวนี้
            </button>
          </div>

          {row.kind === 'text' ? (
            <div className="row">
              <label className="field grow">
                ข้อความ (ตัวใหญ่สีทอง)
                <input
                  type="text"
                  value={row.text}
                  placeholder="เช่น SHOWMATCH"
                  onChange={(e) => patch(i, { text: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <div className="row">
              {logoSelect(i, 'aLogo', 'ตราฝั่งซ้าย')}
              <label className="field" style={{ width: 150 }}>
                กลางกล่อง
                <input
                  type="text"
                  value={row.score}
                  placeholder="เช่น 3 - 4 หรือ VS"
                  onChange={(e) => patch(i, { score: e.target.value })}
                />
              </label>
              {logoSelect(i, 'bLogo', 'ตราฝั่งขวา')}
            </div>
          )}
        </div>
      ))}

      <p className="hint">
        แถบนี้ <b>วาดแผงเอง</b> ไม่ได้วางทับกราฟิก — ปรับตำแหน่ง/ขนาด/สีได้ที่ตัวแปร <code>--sc-*</code>{' '}
        ในบล็อก <code>.sc</code> ของ <code className="url">src/overlay/overlay.css</code>
      </p>
    </section>
  );
}
