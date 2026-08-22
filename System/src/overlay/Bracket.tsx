import { useHub } from '../shared/useHub.ts';
import { FitText, Stage } from './Stage.tsx';
import { BRACKET_SLOTS, type BracketSlot } from '../shared/protocol.ts';

/**
 * สายการแข่ง (championship bracket) วางทับกราฟิกที่ออกแบบไว้แล้ว
 *
 * กราฟิกวาดให้แล้ว ห้ามวาดซ้ำ: หัวเรื่อง CHAMPIONSHIP BRACKET · ป้าย SEMI FINALS / GRAND FINALS ·
 * ป้าย UPPER SEMIFINAL / UPPER FINAL / LOWER FINAL / GRAND FINAL · กล่องม่วงกับกล่องทองทุกใบ ·
 * เส้นโยงสาย · โลโก้ ROV · คำว่า CHAMPION · พื้นหลัง
 *
 * overlay เติมแค่ "ใครอยู่ช่องไหน" — ตราโรงเรียนกับชื่อทีมในกล่อง
 *
 * ช่องที่ยังไม่รู้ผลขึ้น TBD ตามแบบกราฟิกต้นฉบับ ไม่ปล่อยว่าง
 * เพราะสายการแข่งที่มีกล่องว่างดูเหมือนกราฟิกโหลดไม่ครบ ส่วน TBD สื่อว่า "ยังไม่รู้ผล" ชัดกว่า
 */

function Slot({ slot, index }: { slot: BracketSlot; index: number }) {
  const meta = BRACKET_SLOTS[index];
  const filled = Boolean(slot.name || slot.prefix);
  const style = { ['--bk-i' as string]: index } as React.CSSProperties;

  // กล่องเล็กฝั่งซ้ายมีที่พอสำหรับตรา + ชื่อสองบรรทัด ส่วนกล่องกลางกับกล่องทองใส่ได้บรรทัดเดียว
  if (meta.kind === 'team') {
    return (
      <div className={`bk-slot bk-${meta.id} team${filled ? '' : ' tbd'}`} style={style}>
        {filled ? (
          <>
            {slot.logo && <img className="bk-logo" src={`/teams/${slot.logo}`} alt="" />}
            <div className="bk-name">
              {slot.prefix && <FitText className="l1" text={slot.prefix} max={13} min={9} />}
              {slot.name && <FitText className="l2" text={slot.name} max={15} min={10} />}
            </div>
          </>
        ) : (
          <span className="bk-tbd">TBD</span>
        )}
      </div>
    );
  }

  const single = [slot.prefix, slot.name].filter(Boolean).join(' ');
  return (
    <div className={`bk-slot bk-${meta.id} ${meta.kind}${filled ? '' : ' tbd'}`} style={style}>
      {filled ? <FitText className="bk-one" text={single} max={26} min={13} /> : <span className="bk-tbd">TBD</span>}
    </div>
  );
}

export default function BracketOverlay() {
  const { state } = useHub();
  if (!state) return null;

  return (
    <Stage>
      {/* key ที่ bracketCue — คนคุมกด "เล่นอนิเมชันเข้า" ทีไร ทั้งสายก็ mount ใหม่แล้วไล่เข้าอีกรอบ */}
      <div className="bk" key={state.bracketCue}>
        {state.bracket.map((slot, i) => (
          <Slot key={BRACKET_SLOTS[i].id} slot={slot} index={i} />
        ))}
      </div>
    </Stage>
  );
}
