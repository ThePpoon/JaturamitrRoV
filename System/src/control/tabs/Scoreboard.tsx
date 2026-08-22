import { useEffect, useState } from 'react';
import type { ClientMessage, MatchState, Team, TeamId } from '../../shared/protocol.ts';
import ConfirmButton from '../ConfirmButton.tsx';
import teamPresets from '../../data/teams.json';

interface Props {
  state: MatchState;
  send: (msg: ClientMessage) => void;
}

export default function ScoreboardTab({ state, send }: Props) {
  const [logos, setLogos] = useState<string[]>([]);
  // แยก "ยังโหลดไม่เสร็จ" ออกจาก "โหลดแล้วแต่ไม่มีไฟล์เลย"
  // ไม่งั้นตอนเปิดหน้าครั้งแรกจะขึ้นเตือนว่าหาไฟล์โลโก้ไม่เจอแวบหนึ่งทุกครั้ง
  const [logosLoaded, setLogosLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/assets/teams')
      .then((r) => r.json())
      .then((files: string[]) => setLogos(files))
      .catch(() => setLogos([]))
      .finally(() => setLogosLoaded(true));
  }, []);

  const patch = (team: TeamId, p: Partial<Team>) => send({ type: 'match', action: 'setTeam', team, patch: p });

  const winTarget = Math.ceil(state.bestOf / 2);

  return (
    <>
      <section className="card">
        <h2>แมตช์</h2>
        <div className="row">
          <label className="field grow">
            ชื่อรอบ — ขึ้นถัดจากโลโก้รายการบนแถบสกอร์
            <input
              type="text"
              value={state.matchLabel}
              placeholder="เช่น SEMI FINALS (เว้นว่างได้)"
              onChange={(e) =>
                send({ type: 'match', action: 'setMatchInfo', patch: { matchLabel: e.target.value } })
              }
            />
          </label>
        </div>
        <div className="row">
          <label className="field" style={{ maxWidth: 170 }}>
            แมตช์ที่
            <input
              type="number"
              min={1}
              value={state.matchNumber}
              onChange={(e) =>
                send({ type: 'match', action: 'setMatchInfo', patch: { matchNumber: Number(e.target.value) } })
              }
            />
          </label>
          <label className="field" style={{ maxWidth: 170 }}>
            เกมที่
            <input
              type="number"
              min={1}
              max={state.bestOf}
              value={state.gameNumber}
              onChange={(e) => send({ type: 'match', action: 'setGameNumber', value: Number(e.target.value) })}
            />
          </label>
          <span className="chip">
            <span className="lbl">รูปแบบ</span>&nbsp;<b>BO{state.bestOf}</b>&nbsp;— ชนะ {winTarget} เกมจบ
          </span>
          <div className="grow" />
          <button className="btn" onClick={() => send({ type: 'match', action: 'swapSides' })}>
            ⇄ สลับฝั่ง
          </button>
          <ConfirmButton
            className="btn danger"
            confirmLabel="กดอีกครั้งเพื่อรีเซ็ต"
            onConfirm={() => send({ type: 'match', action: 'resetMatch' })}
          >
            รีเซ็ตแมตช์
          </ConfirmButton>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          รีเซ็ตแมตช์จะล้างสกอร์และกระดาน ban/pick แต่ <b>เก็บชื่อ โลโก้ และสีทีมไว้</b>
        </p>
      </section>

      <section className="card">
        <h2>ทีม</h2>
        <div className="team-editor">
          {(['A', 'B'] as TeamId[]).map((id) => {
            const t = state.teams[id];
            return (
              <div
                key={id}
                className="team-card"
                style={{ ['--team' as string]: t.color, ['--team2' as string]: t.color2 || t.color }}
              >
                <div className="row">
                  <strong style={{ letterSpacing: '0.08em' }}>ฝั่ง {id}</strong>
                  <div className="grow" />
                  <select
                    style={{ maxWidth: 200 }}
                    value=""
                    onChange={(e) => {
                      const preset = teamPresets[Number(e.target.value)];
                      if (preset) patch(id, preset);
                    }}
                  >
                    <option value="">เลือกจากรายชื่อทีม…</option>
                    {teamPresets.map((p, i) => (
                      <option key={p.name} value={i}>
                        {p.prefix ? `${p.prefix} ${p.name}` : p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="field">
                  บรรทัดบน (ตัวเล็ก) — เว้นว่างได้
                  <input
                    type="text"
                    value={t.prefix}
                    placeholder="เช่น เบญจมราชูทิศ"
                    onChange={(e) => patch(id, { prefix: e.target.value })}
                  />
                </label>

                <label className="field">
                  ชื่อทีม (ตัวใหญ่)
                  <input type="text" value={t.name} onChange={(e) => patch(id, { name: e.target.value })} />
                </label>

                <div className="row">
                  <label className="field" style={{ width: 120 }}>
                    ชื่อย่อ
                    <input
                      type="text"
                      maxLength={5}
                      value={t.short}
                      onChange={(e) => patch(id, { short: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <label className="field grow">
                    โลโก้
                    <select value={t.logo} onChange={(e) => patch(id, { logo: e.target.value })}>
                      <option value="">— ไม่มี (ใช้ชื่อย่อแทน) —</option>
                      {/* ถ้าค่าที่เก็บไว้ชี้ไปไฟล์ที่ไม่มีอยู่จริง (เช่นพิมพ์ชื่อผิดใน teams.json
                          หรือไฟล์ถูกลบ/เปลี่ยนชื่อทีหลัง) ต้องมี option ให้มันเลือกอยู่
                          ไม่งั้น select จะเด้งไปโชว์ตัวเลือกแรกเงียบ ๆ เหมือนไม่ได้ตั้งโลโก้ไว้
                          แล้วคนคุมจะไม่รู้เลยว่าทำไม overlay ไม่ขึ้นตรา */}
                      {logosLoaded && t.logo && !logos.includes(t.logo) && (
                        <option value={t.logo}>⚠ {t.logo} — ไม่พบไฟล์ใน public/teams/</option>
                      )}
                      {logos.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    สีหลัก
                    <input type="color" value={t.color} onChange={(e) => patch(id, { color: e.target.value })} />
                  </label>
                  <label className="field">
                    สีรอง
                    <input type="color" value={t.color2} onChange={(e) => patch(id, { color2: e.target.value })} />
                  </label>
                </div>

                <div className="score-control">
                  <button className="btn" onClick={() => send({ type: 'match', action: 'adjustScore', team: id, delta: -1 })}>
                    −
                  </button>
                  <div className="value">{t.score}</div>
                  <button
                    className="btn primary"
                    onClick={() => send({ type: 'match', action: 'adjustScore', team: id, delta: 1 })}
                  >
                    +
                  </button>
                  {t.score >= winTarget && <span className="chip on"><span className="dot" />ชนะแมตช์</span>}
                </div>
              </div>
            );
          })}
        </div>
        {logosLoaded && logos.length === 0 && (
          <p className="hint" style={{ marginTop: 12 }}>
            ยังไม่มีไฟล์โลโก้ — วางไฟล์ PNG พื้นใสไว้ที่ <code className="url">public/teams/</code> แล้วรีเฟรชหน้านี้
          </p>
        )}
      </section>
    </>
  );
}
