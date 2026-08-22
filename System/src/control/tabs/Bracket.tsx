import { useEffect, useState } from 'react';
import { BRACKET_SLOTS, type BracketSlot, type ClientMessage, type MatchState } from '../../shared/protocol.ts';
import ConfirmButton from '../ConfirmButton.tsx';
import teamPresets from '../../data/teams.json';

interface Props {
  state: MatchState;
  send: (msg: ClientMessage) => void;
}

/** หัวข้อคั่นกลุ่ม ให้หน้าคุมอ่านเป็นสายการแข่งเหมือนที่เห็นบนจอ ไม่ใช่ช่องกรอก 10 ช่องรวด */
const GROUP_AT: Record<number, string> = {
  0: 'UPPER SEMIFINAL — 4 ทีมเริ่มต้น',
  4: 'LOWER FINAL — ทีมที่ตกมาสายล่าง',
  6: 'UPPER FINAL — ผู้ชนะสายบน',
  8: 'กล่องทอง — ผลรอบตัดสิน',
};

export default function BracketTab({ state, send }: Props) {
  const [logos, setLogos] = useState<string[]>([]);
  const [logosLoaded, setLogosLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/assets/teams')
      .then((r) => r.json())
      .then((files: string[]) => setLogos(files))
      .catch(() => setLogos([]))
      .finally(() => setLogosLoaded(true));
  }, []);

  const patch = (index: number, p: Partial<BracketSlot>) =>
    send({ type: 'match', action: 'setBracket', index, patch: p });

  return (
    <section className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>สายการแข่ง (Championship Bracket)</h2>
        <div className="grow" />
        <button className="btn" onClick={() => send({ type: 'match', action: 'cueBracket' })}>
          ▶ เล่นอนิเมชันเข้า
        </button>
        <ConfirmButton
          className="btn danger"
          confirmLabel="กดอีกครั้งเพื่อล้าง"
          onConfirm={() => send({ type: 'match', action: 'clearBracket' })}
        >
          ล้างทั้งสาย
        </ConfirmButton>
      </div>

      <p className="hint" style={{ marginBottom: 16 }}>
        ช่องที่เว้นว่างจะขึ้น <b>TBD</b> บนจอ ตามแบบกราฟิกต้นฉบับ — ไม่ต้องพิมพ์ TBD เอง ·
        กด <b>▶ เล่นอนิเมชันเข้า</b> ตอนคัตเข้าฉากเพื่อให้ช่องไล่เข้าทีละช่อง
      </p>

      {state.bracket.map((slot, i) => (
        <div key={BRACKET_SLOTS[i].id}>
          {GROUP_AT[i] && (
            <h3 style={{ margin: '18px 0 8px', fontSize: 13, letterSpacing: '0.08em', color: 'var(--muted)' }}>
              {GROUP_AT[i]}
            </h3>
          )}

          <div className="team-card" style={{ marginBottom: 10 }}>
            <div className="row">
              <strong style={{ minWidth: 210, fontSize: 13 }}>{BRACKET_SLOTS[i].label}</strong>

              <select
                style={{ maxWidth: 220 }}
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

              <span className="chip">
                <span className="lbl">ขึ้นจอ</span>&nbsp;
                <b>{[slot.prefix, slot.name].filter(Boolean).join(' ') || 'TBD'}</b>
              </span>

              <button className="btn ghost" onClick={() => patch(i, { prefix: '', name: '', logo: '' })}>
                ล้าง
              </button>
            </div>

            <div className="row">
              <label className="field" style={{ width: 220 }}>
                บรรทัดบน (ตัวเล็ก)
                <input
                  type="text"
                  value={slot.prefix}
                  placeholder="เช่น BENCHAMARACHUTHIT"
                  onChange={(e) => patch(i, { prefix: e.target.value })}
                />
              </label>
              <label className="field grow">
                ชื่อทีม
                <input
                  type="text"
                  value={slot.name}
                  placeholder="เว้นว่าง = ขึ้น TBD"
                  onChange={(e) => patch(i, { name: e.target.value })}
                />
              </label>
              <label className="field" style={{ width: 210 }}>
                ตราโรงเรียน
                <select value={slot.logo} onChange={(e) => patch(i, { logo: e.target.value })}>
                  <option value="">— ไม่มี —</option>
                  {logosLoaded && slot.logo && !logos.includes(slot.logo) && (
                    <option value={slot.logo}>⚠ {slot.logo} — ไม่พบไฟล์</option>
                  )}
                  {logos.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      ))}

      <p className="hint" style={{ marginTop: 14 }}>
        กล่องกลาง (Upper Final) และกล่องทองแสดง <b>ชื่อบรรทัดเดียว</b> — บรรทัดบนกับชื่อทีมจะถูกต่อกัน
        ส่วนกล่องฝั่งซ้ายแสดงตรา + ชื่อสองบรรทัด ตามที่กราฟิกเว้นที่ไว้
      </p>
    </section>
  );
}
