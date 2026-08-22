import { useHub } from '../shared/useHub.ts';
import { Crest, FitText, Stage } from './Stage.tsx';
import type { MatchState, Team } from '../shared/protocol.ts';

function Pips({ score, target, color }: { score: number; target: number; color: string }) {
  return (
    <div className="pips" style={{ ['--crest' as string]: color }}>
      {Array.from({ length: target }, (_, i) => (
        <i key={i} className={i < score ? 'on' : ''} />
      ))}
    </div>
  );
}

/**
 * หนึ่งทีมบนแถบสกอร์ — คืนสองชิ้นที่ "ไม่ได้ห่อรวมกัน" โดยตั้งใจ
 * ชื่อย่ออยู่บนลายกราฟิกในแถบ ส่วนชื่อเต็มต้องล็อกอยู่กับแผ่นขาวในวิดีโอ
 * ถ้าห่อไว้ในกล่องเดียวกัน พอเลื่อนชื่อย่อ ชื่อเต็มจะถูกลากตามไปหลุดแผ่นขาว
 * ตำแหน่งของแต่ละชิ้นคุมด้วยตัวแปร --sb-abbr-* กับ --sb-plate-* แยกกันใน overlay.css
 *
 * แผ่นขาวกว้างพอสำหรับชื่อเต็มบรรทัดเดียว จึงต่อ prefix เข้ากับ name แทนที่จะแยกสองบรรทัด
 * ("เบญจมราชูทิศ" + "จันทบุรี" -> "เบญจมราชูทิศ จันทบุรี")
 */
function BarTeam({ team, side }: { team: Team; side: 'left' | 'right' }) {
  const fullName = [team.prefix, team.name].filter(Boolean).join(' ');
  return (
    <>
      {/* ทีมที่ไม่ได้เลือกไฟล์โลโก้ไว้ก็ไม่ต้องแสดงอะไร — .crest จะ fallback เป็นตัวย่อ
          ซึ่งซ้ำกับชื่อย่อตัวใหญ่ที่อยู่ข้าง ๆ อยู่แล้ว */}
      {team.logo && <Crest team={team} className={`crest sb-logo ${side}`} />}
      <div className={`sb-slot sb-abbr ${side}`}>{team.short}</div>
      <div className={`sb-plate ${side}`}>
        <FitText className="name" text={fullName} max={15} min={10} />
      </div>
    </>
  );
}

function Bar({ state }: { state: MatchState }) {
  const { A, B } = state.teams;
  return (
    <div className="sb-bar">
      {/* ชื่อรอบเว้นว่างได้ ไม่ต้องเรนเดอร์กล่องเปล่าทิ้งไว้ */}
      {state.matchLabel && (
        <div className="sb-slot sb-label">
          <FitText className="txt" text={state.matchLabel} max={34} min={18} />
        </div>
      )}
      <div className="sb-slot sb-num left">{A.score}</div>
      <BarTeam team={A} side="left" />
      {/* ใช้อังกฤษตามแบบกราฟิกที่ออกแบบไว้ — ฟอนต์ Barlow Condensed ตัวใหญ่อ่านง่ายกว่าไทยที่ขนาดนี้ */}
      <div className="sb-slot sb-center">
        <div>
          MATCH {state.matchNumber} - BO{state.bestOf}
        </div>
        <div>GAME {state.gameNumber}</div>
      </div>
      <BarTeam team={B} side="right" />
      <div className="sb-slot sb-num right">{B.score}</div>
    </div>
  );
}

function ResultSide({ team, target }: { team: Team; target: number }) {
  return (
    <div
      className="side"
      style={{ ['--crest' as string]: team.color, ['--crest2' as string]: team.color2 || team.color }}
    >
      <Crest team={team} />
      {team.prefix && <div className="prefix">{team.prefix}</div>}
      <div className="name">{team.name}</div>
      {/* แถบสีประจำโรงเรียนสองโทน คั่นระหว่างชื่อกับจุดนับเกม */}
      <div className="team-stripe" />
      <Pips score={team.score} target={target} color={team.color} />
      {team.score >= target && <div className="win">ผู้ชนะ</div>}
    </div>
  );
}

function Result({ state }: { state: MatchState }) {
  const target = Math.ceil(state.bestOf / 2);
  const { A, B } = state.teams;
  return (
    <div className="result">
      <div className="headline">ผลการแข่งขัน · BO{state.bestOf}</div>
      <div className="grid">
        <ResultSide team={A} target={target} />
        <div className="bigscore">
          {A.score} <span style={{ opacity: 0.35 }}>:</span> {B.score}
        </div>
        <ResultSide team={B} target={target} />
      </div>
    </div>
  );
}

export default function ScoreboardOverlay() {
  const { state } = useHub();
  if (!state) return null;

  return <Stage>{state.phase === 'result' ? <Result state={state} /> : <Bar state={state} />}</Stage>;
}
