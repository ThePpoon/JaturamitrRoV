import { useMemo, useState } from 'react';
import {
  BAN_SLOTS,
  DRAFT_ORDER,
  PICK_SLOTS,
  type ClientMessage,
  type DraftSlot,
  type MatchState,
  type TeamId,
} from '../../shared/protocol.ts';
import { formatClock, secondsLeft, useNow } from '../../shared/useHub.ts';
import { heroById, heroImageUrl, heroInitials, heroes, ROLE_LABEL } from '../../shared/heroes.ts';
import ConfirmButton from '../ConfirmButton.tsx';

interface Props {
  state: MatchState;
  send: (msg: ClientMessage) => void;
}

/** รูปฮีโร่ที่ตกไปใช้ตัวย่อเองถ้ายังไม่มีไฟล์ */
function Thumb({ heroId, name }: { heroId: string; name: string }) {
  return (
    <span className="thumb">
      <span className="fallback">{heroInitials(name)}</span>
      <img
        src={heroImageUrl(heroId)}
        alt=""
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </span>
  );
}

function sameSlot(a: DraftSlot | null, b: DraftSlot) {
  return !!a && a.team === b.team && a.type === b.type && a.index === b.index;
}

/** ลำดับที่ 1..20 ของช่องนี้ใน DRAFT_ORDER เอาไว้พิมพ์กำกับบนช่อง */
function orderNumber(slot: DraftSlot) {
  const i = DRAFT_ORDER.findIndex((s) => sameSlot(s, slot));
  return i >= 0 ? i + 1 : null;
}

export default function BanPickTab({ state, send }: Props) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const now = useNow(200);

  const bp = state.banPick;
  const left = secondsLeft(bp.timerEndsAt, now);

  // ฮีโร่ที่ถูกแบนหรือเลือกไปแล้วห้ามเลือกซ้ำ — กันความผิดพลาดที่ต้องมาแก้ทีหลังกลางไลฟ์
  const used = useMemo(() => {
    const s = new Set<string>();
    (['A', 'B'] as TeamId[]).forEach((t) => {
      [...bp[t].bans, ...bp[t].picks].forEach((h) => h && s.add(h));
    });
    return s;
  }, [bp]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return heroes.filter(
      (h) => (!role || h.role === role) && (!q || h.name.toLowerCase().includes(q) || h.id.includes(q)),
    );
  }, [query, role]);

  const setActive = (slot: DraftSlot) => send({ type: 'match', action: 'setActiveSlot', slot });

  const renderSlots = (team: TeamId, type: 'ban' | 'pick') => {
    const count = type === 'ban' ? BAN_SLOTS : PICK_SLOTS;
    const values = type === 'ban' ? bp[team].bans : bp[team].picks;
    return (
      <div className="slot-row">
        {Array.from({ length: count }, (_, i) => {
          const slot: DraftSlot = { team, type, index: i };
          const heroId = values[i];
          const hero = heroId ? heroById.get(heroId) : null;
          const active = sameSlot(bp.activeSlot, slot);
          return (
            <button
              key={i}
              className={`slot ${type}${heroId ? ' filled' : ''}${active ? ' active' : ''}`}
              onClick={() => setActive(slot)}
              onContextMenu={(e) => {
                // คลิกขวาเพื่อล้างช่อง เร็วกว่าการเปิดเมนูตอนต้องแก้สด
                e.preventDefault();
                send({ type: 'match', action: 'setSlot', slot, hero: null });
              }}
              title={hero ? `${hero.name} (คลิกขวาเพื่อล้าง)` : 'คลิกเพื่อเลือกช่องนี้'}
            >
              <span className="num">#{orderNumber(slot)}</span>
              {hero ? <Thumb heroId={hero.id} name={hero.name} /> : <span className="nm">—</span>}
              {hero && <span className="nm">{hero.name}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <section className="card">
        <div className="row" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>กระดาน Ban / Pick</h2>
          <div className="grow" />
          <div className="timer-big" style={{ color: left !== null && left <= 5 ? 'var(--live)' : undefined }}>
            {left === null ? '--:--' : formatClock(left)}
          </div>
          <label className="field" style={{ width: 104 }}>
            ตั้งเวลา (วิ)
            <input
              type="number"
              min={5}
              max={180}
              value={bp.timerDuration}
              onChange={(e) =>
                send({ type: 'match', action: 'setTimerDuration', seconds: Number(e.target.value) })
              }
            />
          </label>
          <button className="btn" onClick={() => send({ type: 'match', action: 'startTimer' })}>
            เริ่มจับเวลา
          </button>
          <button className="btn ghost" onClick={() => send({ type: 'match', action: 'stopTimer' })}>
            หยุด
          </button>
          <ConfirmButton
            className="btn danger"
            confirmLabel="กดอีกครั้งเพื่อล้าง"
            onConfirm={() => send({ type: 'match', action: 'clearBoard' })}
          >
            ล้างกระดาน
          </ConfirmButton>
        </div>

        <div className="draft-board">
          {(['A', 'B'] as TeamId[]).map((team) => (
            <div key={team} className="draft-col">
              <h3 style={{ color: state.teams[team].color }}>
                {state.teams[team].name} — ฝั่ง {team}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>แบน</div>
              {renderSlots(team, 'ban')}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>เลือก</div>
              {renderSlots(team, 'pick')}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                ชื่อผู้เล่น (ขึ้นเป็นแถบใต้รูปฮีโร่)
              </div>
              <div className="slot-row player-row">
                {Array.from({ length: PICK_SLOTS }, (_, i) => (
                  <input
                    key={i}
                    type="text"
                    value={state.teams[team].players[i] ?? ''}
                    placeholder={`ผู้เล่น ${i + 1}`}
                    onChange={(e) =>
                      send({ type: 'match', action: 'setPlayer', team, index: i, name: e.target.value })
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="hint">
          ช่องที่กระพริบคือช่องที่กำลังกรอก — เลือกฮีโร่ด้านล่างแล้วระบบจะเลื่อนไปช่องถัดไปตามลำดับดราฟต์เอง
          · คลิกช่องเพื่อย้อนกลับไปแก้ · <b>คลิกขวาที่ช่องเพื่อล้าง</b>
        </p>
      </section>

      <section className="card">
        <h2>แผงกลาง — สกอร์ · แมตช์ · เกม</h2>
        <div className="row">
          {(['A', 'B'] as TeamId[]).map((id) => (
            <div key={id} className="score-control">
              <span className="chip">
                <span className="lbl">{state.teams[id].short || `ฝั่ง ${id}`}</span>
              </span>
              <button
                className="btn"
                onClick={() => send({ type: 'match', action: 'adjustScore', team: id, delta: -1 })}
              >
                −
              </button>
              <div className="value">{state.teams[id].score}</div>
              <button
                className="btn primary"
                onClick={() => send({ type: 'match', action: 'adjustScore', team: id, delta: 1 })}
              >
                +
              </button>
            </div>
          ))}

          <div className="grow" />

          <div className="score-control">
            <span className="chip">
              <span className="lbl">MATCH</span>
            </span>
            <button
              className="btn"
              onClick={() =>
                send({ type: 'match', action: 'setMatchInfo', patch: { matchNumber: state.matchNumber - 1 } })
              }
            >
              −
            </button>
            <div className="value">{state.matchNumber}</div>
            <button
              className="btn primary"
              onClick={() =>
                send({ type: 'match', action: 'setMatchInfo', patch: { matchNumber: state.matchNumber + 1 } })
              }
            >
              +
            </button>
          </div>

          <div className="score-control">
            <span className="chip">
              <span className="lbl">GAME</span>
            </span>
            <button
              className="btn"
              onClick={() => send({ type: 'match', action: 'setGameNumber', value: state.gameNumber - 1 })}
            >
              −
            </button>
            <div className="value">{state.gameNumber}</div>
            <button
              className="btn primary"
              onClick={() => send({ type: 'match', action: 'setGameNumber', value: state.gameNumber + 1 })}
            >
              +
            </button>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          ทั้งสี่ค่านี้ใช้ร่วมกับแถบสกอร์ตอนแข่ง — แก้ที่นี่หรือที่แท็บสกอร์บอร์ดก็ได้ ค่าเดียวกัน
          · สกอร์ตันที่ {Math.ceil(state.bestOf / 2)} (ชนะ BO{state.bestOf}) · เกมตันที่ {state.bestOf}
        </p>
      </section>

      <section className="card">
        <h2>เลือกฮีโร่</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            className="grow"
            type="text"
            placeholder="พิมพ์ชื่อฮีโร่…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <select style={{ maxWidth: 190 }} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">ทุกบทบาท</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {query && (
            <button className="btn ghost" onClick={() => setQuery('')}>
              ล้าง
            </button>
          )}
        </div>

        {!bp.activeSlot && (
          <p className="hint" style={{ marginBottom: 12, color: 'var(--warn)' }}>
            กระดานเต็มแล้ว — คลิกช่องที่ต้องการแก้ก่อนเลือกฮีโร่
          </p>
        )}

        <div className="hero-grid">
          {filtered.map((h) => (
            <button
              key={h.id}
              className="hero-btn"
              disabled={used.has(h.id) || !bp.activeSlot}
              onClick={() => send({ type: 'match', action: 'assignToActive', hero: h.id })}
              title={ROLE_LABEL[h.role] ?? h.role}
            >
              <Thumb heroId={h.id} name={h.name} />
              <span className="nm">{h.name}</span>
            </button>
          ))}
        </div>
        {filtered.length === 0 && <p className="hint">ไม่พบฮีโร่ที่ตรงกับคำค้น</p>}
      </section>
    </>
  );
}
