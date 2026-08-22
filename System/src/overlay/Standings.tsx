import { useHub } from '../shared/useHub.ts';
import { FitText, Stage } from './Stage.tsx';
import type { StandingRow } from '../shared/protocol.ts';

/**
 * ตารางคะแนนของรายการ วางทับกราฟิกที่ออกแบบไว้แล้ว (แบบเดียวกับแถบสกอร์และหน้า ban/pick)
 *
 * กราฟิกวาดให้แล้ว ห้ามวาดซ้ำ: หัวเรื่อง · โลโก้รายการ · หัวคอลัมน์ RANK/TEAM/MATCH/... ·
 * กล่องสีม่วงของทุกช่อง · พื้นหลัง · แถบตราสี่โรงด้านล่าง
 *
 * overlay เติมแค่: เลขอันดับ · ตราโรงเรียน · ชื่อทีม · ตัวเลขสี่คอลัมน์ขวา
 *
 * อันดับมาจาก "ลำดับใน array" ตรง ๆ ไม่ได้คำนวณตอนแสดงผล
 * เพราะคนคุมต้องสลับอันดับเองได้ตอนแต้มเท่ากัน ซึ่งกติกาตัดสินไม่ได้อยู่ในข้อมูลที่ระบบมี
 */

/**
 * ชื่อประจำตัวของแถว ใช้เป็น key
 *
 * ต้องผูกกับ "ทีม" ไม่ใช่ index — เวลาเรียงอันดับใหม่ React จะได้ย้าย DOM node เดิมไปตำแหน่งใหม่
 * แล้ว CSS transition บน top ทำให้แถวไหลไปที่อันดับใหม่ให้เห็น
 * ถ้า key เป็น index React จะสลับแค่ "เนื้อหา" ในกล่องเดิม ภาพที่ได้คือตัวเลขกระพริบเปลี่ยน ไม่มีการเคลื่อนไหว
 */
function rowKey(row: StandingRow, i: number) {
  const id = `${row.prefix}|${row.name}`;
  return id === '|' ? `empty-${i}` : id;
}

function Row({ row, index }: { row: StandingRow; index: number }) {
  // แถวที่ยังไม่ได้กรอกชื่อ ปล่อยว่างไว้ทั้งแถว ไม่ต้องโชว์เลข 0 เต็มไปหมดให้รกจอ
  const filled = Boolean(row.name || row.prefix);
  const style = { ['--st-i' as string]: index } as React.CSSProperties;

  /** ตัวเลขที่เด้งหนึ่งครั้งตอนค่าเปลี่ยน — key ผูกกับค่า พอค่าเปลี่ยน element ใหม่ก็เล่นเอฟเฟกต์ */
  const num = (cls: string, value: string | number) => (
    <div className={`st-num ${cls}`}>
      <span key={String(value)} className="v">
        {value}
      </span>
    </div>
  );

  return (
    <div className={`st-row${index === 0 ? ' top' : ''}${filled ? '' : ' blank'}`} style={style}>
      <div className="st-rank">
        <span key={index} className="v">
          {filled ? index + 1 : ''}
        </span>
      </div>

      <div className="st-team">
        {/* ชื่อตัวใหญ่จาง ๆ ด้านหลัง เป็นส่วนที่ต่างกันของแต่ละโรง (ratchaburi / pattani / ...) */}
        {filled && <div className="st-watermark">{row.name || row.prefix}</div>}
        {filled && row.logo && <img className="st-logo" src={`/teams/${row.logo}`} alt="" />}
        {filled && (
          <div className="st-name">
            {row.prefix && <div className="l1">{row.prefix}</div>}
            {row.name && <FitText className="l2" text={row.name} max={26} min={15} />}
          </div>
        )}
      </div>

      {filled ? num('match', row.match) : <div className="st-num match" />}
      {filled ? num('wl', `${row.win}-${row.lose}`) : <div className="st-num wl" />}
      {filled ? num('gd', row.gd) : <div className="st-num gd" />}
      {filled ? num('pts', row.points) : <div className="st-num pts" />}
    </div>
  );
}

export default function StandingsOverlay() {
  const { state } = useHub();
  if (!state) return null;

  return (
    <Stage>
      {/* key ที่ standingsCue — คนคุมกด "เล่นอนิเมชันเข้า" ทีไร ทั้งตารางก็ mount ใหม่แล้วไหลเข้าอีกรอบ */}
      <div className="st" key={state.standingsCue}>
        {state.standings.map((row, i) => (
          <Row key={rowKey(row, i)} row={row} index={i} />
        ))}
      </div>
    </Stage>
  );
}
