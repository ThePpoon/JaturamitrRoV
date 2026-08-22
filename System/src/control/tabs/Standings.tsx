import { useEffect, useState } from 'react';
import type { ClientMessage, MatchState, StandingRow } from '../../shared/protocol.ts';
import teamPresets from '../../data/teams.json';

interface Props {
  state: MatchState;
  send: (msg: ClientMessage) => void;
}

export default function StandingsTab({ state, send }: Props) {
  const [logos, setLogos] = useState<string[]>([]);
  const [logosLoaded, setLogosLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/assets/teams')
      .then((r) => r.json())
      .then((files: string[]) => setLogos(files))
      .catch(() => setLogos([]))
      .finally(() => setLogosLoaded(true));
  }, []);

  const patch = (index: number, p: Partial<StandingRow>) =>
    send({ type: 'match', action: 'setStanding', index, patch: p });

  const move = (index: number, delta: number) => send({ type: 'match', action: 'moveStanding', index, delta });

  /** ช่องตัวเลขที่ยอมให้ลบจนว่างได้ระหว่างพิมพ์ ไม่งั้นจะลบเลข 0 ทิ้งไม่ได้เลย */
  const numField = (label: string, value: number, onSet: (n: number) => void, width = 92) => (
    <label className="field" style={{ width }}>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onSet(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  );

  return (
    <>
      <section className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>ตารางคะแนน</h2>
          <div className="grow" />
          <button className="btn" onClick={() => send({ type: 'match', action: 'cueStandings' })}>
            ▶ เล่นอนิเมชันเข้า
          </button>
          <button className="btn primary" onClick={() => send({ type: 'match', action: 'sortStandings' })}>
            เรียงอันดับอัตโนมัติ
          </button>
        </div>
        <p className="hint" style={{ marginBottom: 14 }}>
          อันดับที่ขึ้นบนจอคือ <b>ลำดับของแถวในหน้านี้</b> ไม่ได้คำนวณตอนแสดงผล —
          ปุ่มเรียงอัตโนมัติใช้เกณฑ์ <b>แต้มมากก่อน → GD มากกว่า → ชนะมากกว่า</b>
          ถ้าเสมอกันหมดแล้วต้องตัดสินด้วยกติกาอื่น ใช้ปุ่ม ▲▼ สลับเองได้
          <br />
          เรียงใหม่หรือกด ▲▼ แล้ว <b>แถวบนจอจะไหลไปอันดับใหม่ให้เห็น</b> ไม่ได้เปลี่ยนแบบกระโดด ·
          กด <b>▶ เล่นอนิเมชันเข้า</b> ตอนคัตเข้าฉากเพื่อให้แถวไหลเข้าใหม่ทีละแถว
        </p>

        {state.standings.map((row, i) => (
          <div key={i} className="team-card" style={{ marginBottom: 12 }}>
            <div className="row">
              <strong style={{ fontSize: 20, width: 34, textAlign: 'center' }}>{i + 1}</strong>
              <button className="btn ghost" disabled={i === 0} onClick={() => move(i, -1)} title="เลื่อนขึ้น">
                ▲
              </button>
              <button
                className="btn ghost"
                disabled={i === state.standings.length - 1}
                onClick={() => move(i, 1)}
                title="เลื่อนลง"
              >
                ▼
              </button>

              <select
                style={{ maxWidth: 230 }}
                value=""
                onChange={(e) => {
                  const preset = teamPresets[Number(e.target.value)];
                  if (preset) patch(i, { prefix: preset.prefix, name: preset.name, logo: preset.logo });
                }}
              >
                <option value="">เลือกจากรายชื่อทีม…</option>
                {teamPresets.map((p, n) => (
                  <option key={p.name} value={n}>
                    {p.prefix ? `${p.prefix} ${p.name}` : p.name}
                  </option>
                ))}
              </select>

              <div className="grow" />

              <button className="btn ghost" onClick={() => patch(i, { prefix: '', name: '', logo: '' })}>
                ล้างแถวนี้
              </button>
            </div>

            <div className="row">
              <label className="field" style={{ width: 220 }}>
                บรรทัดบน (ตัวเล็ก)
                <input
                  type="text"
                  value={row.prefix}
                  placeholder="เช่น BENCHAMARACHUTHIT"
                  onChange={(e) => patch(i, { prefix: e.target.value })}
                />
              </label>
              <label className="field grow">
                ชื่อทีม (ตัวใหญ่ + ตัวจางด้านหลัง)
                <input
                  type="text"
                  value={row.name}
                  placeholder="เช่น RATCHABURI"
                  onChange={(e) => patch(i, { name: e.target.value })}
                />
              </label>
              <label className="field" style={{ width: 210 }}>
                ตราโรงเรียน
                <select value={row.logo} onChange={(e) => patch(i, { logo: e.target.value })}>
                  <option value="">— ไม่มี —</option>
                  {logosLoaded && row.logo && !logos.includes(row.logo) && (
                    <option value={row.logo}>⚠ {row.logo} — ไม่พบไฟล์</option>
                  )}
                  {logos.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="row">
              {numField('MATCH', row.match, (n) => patch(i, { match: n }))}
              {numField('ชนะ', row.win, (n) => patch(i, { win: n }))}
              {numField('แพ้', row.lose, (n) => patch(i, { lose: n }))}
              {numField('GD', row.gd, (n) => patch(i, { gd: n }))}
              {numField('POINTS', row.points, (n) => patch(i, { points: n }))}
              <div className="grow" />
              <span className="chip">
                <span className="lbl">ขึ้นจอเป็น</span>&nbsp;
                <b>
                  {row.match} · {row.win}-{row.lose} · {row.gd} · {row.points}
                </b>
              </span>
            </div>
          </div>
        ))}

        <p className="hint">
          แถวที่ยังไม่ได้กรอกชื่อทีมจะ <b>ไม่แสดงอะไรเลยบนจอ</b> ทั้งแถว — ไม่ต้องกลัวเลข 0 โผล่ค้าง
        </p>
      </section>
    </>
  );
}
