import { useHub } from '../shared/useHub.ts';
import { FitText, Stage } from './Stage.tsx';
import type { ScheduleRow } from '../shared/protocol.ts';

/**
 * แถบตารางแมตช์ด้านซ้าย ใช้ในฉากปิดท้ายหรือฉากพักเบรก
 *
 * ต่างจาก overlay ตัวอื่นในระบบนี้ตรงที่ "วาดแผงเองทั้งหมด" ไม่ได้วางทับกราฟิกที่ออกแบบมาให้
 * เพราะจำนวนแมตช์ต่อวันไม่คงที่ ทำเป็นภาพนิ่งไว้ล่วงหน้าไม่ได้ แถวที่ไม่ใช้ต้องหายไปเองด้วย
 *
 * แถวที่ไม่ได้กรอกอะไรเลยจะไม่ถูกเรนเดอร์ และแถวที่เหลือจะเลื่อนขึ้นมาชิดกัน
 * (ใช้ flex เรียงต่อกัน ไม่ได้ fix พิกัดทีละแถว) จะได้ไม่มีช่องโหว่กลางแถบ
 */

function Row({ row }: { row: ScheduleRow }) {
  const logo = (file: string) =>
    file ? <img className="sc-logo" src={`/teams/${file}`} alt="" /> : <div className="sc-logo empty" />;

  return (
    <div className="sc-row">
      {row.label && (
        <div className="sc-label">
          <FitText className="t" text={row.label} max={20} min={12} />
        </div>
      )}

      <div className="sc-body">
        {row.kind === 'text' ? (
          <div className="sc-solo">
            <FitText className="big" text={row.text} max={44} min={20} />
            {row.time && <div className="sc-time">{row.time}</div>}
          </div>
        ) : (
          <>
            {logo(row.aLogo)}
            <div className="sc-mid">
              <div className="sc-score">{row.score}</div>
              {row.time && <div className="sc-time">{row.time}</div>}
            </div>
            {logo(row.bLogo)}
          </>
        )}
      </div>
    </div>
  );
}

/** แถวจะถูกซ่อนก็ต่อเมื่อ "ไม่มีอะไรให้แสดงเลย" — มีแค่เวลาอย่างเดียวก็ยังนับว่าใช้อยู่ */
function isUsed(row: ScheduleRow) {
  return Boolean(
    row.label || row.time || row.score || row.aLogo || row.bLogo || (row.kind === 'text' && row.text),
  );
}

export default function ScheduleOverlay() {
  const { state } = useHub();
  if (!state) return null;

  const rows = state.schedule.filter(isUsed);
  if (rows.length === 0) return null;

  return (
    <Stage>
      {/* key ที่ scheduleCue — กดปุ่มในหน้าคุมแล้วแถบไหลเข้าใหม่ทีละแถว */}
      <div className="sc" key={state.scheduleCue}>
        {rows.map((row, i) => (
          <div key={i} className="sc-slot" style={{ ['--sc-i' as string]: i } as React.CSSProperties}>
            <Row row={row} />
          </div>
        ))}
      </div>
    </Stage>
  );
}
