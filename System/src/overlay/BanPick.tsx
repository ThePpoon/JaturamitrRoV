import { useHub, useNow, secondsLeft } from '../shared/useHub.ts';
import { heroImageUrl, heroInitials, heroName } from '../shared/heroes.ts';
import { Crest, Stage } from './Stage.tsx';
import { BAN_SLOTS, PICK_SLOTS, type DraftSlot, type MatchState, type TeamId } from '../shared/protocol.ts';

/**
 * หน้า ban/pick วางทับกราฟิก overlay ที่ออกแบบไว้แล้ว (เหมือนแถบสกอร์ที่วางทับ Score2.mp4)
 *
 * กราฟิกวาดพวกนี้ให้แล้ว overlay จึง "ห้ามวาดซ้ำ": ป้าย BAN สองข้าง · โลโก้กับชื่อรายการ ·
 * คำว่า VS · กรอบช่องแบน · กรอบช่องเลือก · แถบสีชมพูใต้ช่องเลือก · พื้นหลังทั้งหมด
 *
 * ที่ overlay มีหน้าที่เติมคือ: รูปฮีโร่ที่แบน · รูปฮีโร่ที่เลือก · ชื่อผู้เล่น ·
 * ตราโรงเรียนสองข้าง VS · ตัวเลขสกอร์ · นาฬิกา · MATCH/GAME
 */

function Portrait({ heroId, className }: { heroId: string; className: string }) {
  const name = heroName(heroId) ?? heroId;
  return (
    <div className={className}>
      {/* ตัวย่ออยู่ข้างหลังเสมอ ถ้ารูปโหลดไม่ได้จะซ่อน img แล้วเห็นตัวย่อแทน */}
      <span className="fallback">{heroInitials(name)}</span>
      <img
        src={heroImageUrl(heroId)}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

function sameSlot(a: DraftSlot | null, team: TeamId, type: 'ban' | 'pick', index: number) {
  return !!a && a.team === team && a.type === type && a.index === index;
}

/** รูปฮีโร่ที่ถูกแบน วางลงในกรอบที่กราฟิกเว้นไว้บนแถบ BAN */
function BanRow({ state, team, side }: { state: MatchState; team: TeamId; side: 'left' | 'right' }) {
  const bans = state.banPick[team].bans;
  const active = state.banPick.activeSlot;
  return (
    <div className={`bp-bans ${side}`}>
      {Array.from({ length: BAN_SLOTS }, (_, i) => {
        const id = bans[i];
        const isActive = sameSlot(active, team, 'ban', i);
        return (
          // key ผูกกับ id ไม่ใช่ index — พอแบนตัวใหม่ React จะ mount ใหม่ CSS animation จึงเล่นซ้ำได้
          // ถ้า key เป็น index เดิม element เดิมจะถูก reuse แล้ว animation จะไม่เล่นเลยตั้งแต่ตัวที่สอง
          <div key={id ?? `empty-${i}`} className={`bp-ban${id ? ' filled' : ''}${isActive ? ' active' : ''}`}>
            {id && <Portrait heroId={id} className="pic reveal" />}
          </div>
        );
      })}
    </div>
  );
}

/** รูปฮีโร่ที่ถูกเลือก + ชื่อผู้เล่นบนแถบสีชมพูใต้รูป */
function PickRow({ state, team, side }: { state: MatchState; team: TeamId; side: 'left' | 'right' }) {
  const t = state.teams[team];
  const picks = state.banPick[team].picks;
  const active = state.banPick.activeSlot;
  return (
    <div className={`bp-picks ${side}`}>
      {Array.from({ length: PICK_SLOTS }, (_, i) => {
        const id = picks[i];
        const isActive = sameSlot(active, team, 'pick', i);
        return (
          <div key={i} className={`bp-card${isActive ? ' active' : ''}`}>
            {/* key ที่ id เพื่อให้เอฟเฟกต์เปิดตัวเล่นใหม่ทุกครั้งที่เปลี่ยนฮีโร่ */}
            <div className="port">{id && <Portrait key={id} heroId={id} className="pic reveal" />}</div>
            {/* ชื่อผู้เล่นใช้ transition ไม่ใช่ key — ถ้า key ตามชื่อ จะเล่นเอฟเฟกต์ใหม่ทุกตัวอักษรที่พิมพ์ */}
            <div className={`who${t.players[i] ? '' : ' empty'}`}>{t.players[i] ?? ''}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function BanPickOverlay() {
  const { state } = useHub();
  const now = useNow(200);
  if (!state) return null;

  const bp = state.banPick;
  const left = secondsLeft(bp.timerEndsAt, now);
  // ตอนยังไม่กดเริ่มให้โชว์เวลาที่ตั้งไว้ค้างไว้ ช่องนาฬิกาจะได้ไม่ว่างจนดูเหมือนกราฟิกพัง
  const clock = left ?? bp.timerDuration;
  const turn = bp.activeSlot?.team ?? null;
  const { A, B } = state.teams;

  return (
    <Stage>
      <div className="bp">
        <BanRow state={state} team="A" side="left" />
        <BanRow state={state} team="B" side="right" />

        <PickRow state={state} team="A" side="left" />
        <PickRow state={state} team="B" side="right" />

        {A.logo && <Crest team={A} className="crest bp-logo left" />}
        {B.logo && <Crest team={B} className="crest bp-logo right" />}

        {/* key ที่ตัวเลข — สกอร์เปลี่ยนทีไร element ใหม่ก็เล่นเอฟเฟกต์เด้งหนึ่งครั้ง */}
        <div key={`a${A.score}`} className="bp-sc left">
          {A.score}
        </div>
        <div key={`b${B.score}`} className="bp-sc right">
          {B.score}
        </div>

        {/* ลูกศรชี้ไปทางทีมที่ถึงตาเลือก เหมือนกราฟิกของลีกทางการ ช่วยให้คนดูรู้ว่ารอใครอยู่ */}
        <div className={`bp-clock${left !== null && left <= 5 ? ' low' : ''}`}>
          <span className={`chev${turn === 'A' ? ' on' : ''}`}>&laquo;</span>
          <span className="num">{clock}</span>
          <span className={`chev${turn === 'B' ? ' on' : ''}`}>&raquo;</span>
        </div>
        <div className="bp-mg">
          MATCH {state.matchNumber} &nbsp;·&nbsp; GAME {state.gameNumber} &nbsp;·&nbsp; BO{state.bestOf}
        </div>
      </div>
    </Stage>
  );
}
