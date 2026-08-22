import { useHub } from '../shared/useHub.ts';
import { Stage } from './Stage.tsx';

export default function LowerThirdOverlay() {
  const { state } = useHub();
  if (!state) return null;

  const { visible, title, subtitle } = state.lowerThird;

  return (
    <Stage>
      {/* ปล่อยให้ element อยู่ใน DOM เสมอ แค่สลับคลาส เพื่อให้ transition เข้า-ออกทำงานทั้งสองทาง */}
      <div className={`lower-third${visible ? ' show' : ''}`}>
        <div>
          <div className="title">{title}</div>
          {subtitle && <div className="subtitle">{subtitle}</div>}
        </div>
      </div>
    </Stage>
  );
}
