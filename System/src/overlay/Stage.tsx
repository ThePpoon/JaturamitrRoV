import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Team } from '../shared/protocol.ts';

interface StageProps {
  width?: number;
  height?: number;
  children: React.ReactNode;
}

/**
 * เวทีขนาดคงที่ที่ย่อ/ขยายตามหน้าต่าง
 * ใน OBS จะตั้ง browser source เท่ากับขนาดจริงอยู่แล้ว (scale = 1)
 * แต่ตอนเปิดดูในเบราว์เซอร์เพื่อตรวจงาน จะเห็นสัดส่วนตรงกับที่ออกอากาศจริง
 */
export function Stage({ width = 1920, height = 1080, children }: StageProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [width, height]);

  return (
    <div className="stage" style={{ width, height, transform: `scale(${scale})` }}>
      {children}
    </div>
  );
}

/**
 * ข้อความที่ย่อขนาดตัวอักษรลงเองจนพอดีกรอบ
 *
 * ชื่อโรงเรียนไทยยาวกว่าชื่อทีมอีสปอร์ตทั่วไปมาก ("โรงเรียนเบญจมราชูทิศ" = 20 ตัวอักษร)
 * ถ้าปล่อยให้ตัดท้ายด้วย ellipsis คนดูจะอ่านไม่ครบ การย่อขนาดลงอ่านง่ายกว่าเสมอ
 */
export function FitText({
  text,
  max,
  min,
  className,
}: {
  text: string;
  max: number;
  min: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      const box = el?.parentElement;
      if (!el || !box) return;
      let size = max;
      el.style.fontSize = `${size}px`;
      while (size > min && el.scrollWidth > box.clientWidth) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    // ฟอนต์โหลดจาก Google Fonts แบบ async — ต้องวัดใหม่หลังฟอนต์จริงมาถึง
    // ไม่งั้นจะวัดจากฟอนต์สำรองแล้วได้ขนาดผิด
    document.fonts?.ready.then(fit).catch(() => {});
  }, [text, max, min]);

  return (
    <div ref={ref} className={className}>
      {text}
    </div>
  );
}

/** โลโก้ทีม — ถ้ายังไม่มีไฟล์โลโก้จะแสดงชื่อย่อบนพื้นสีทีมแทน ใช้งานได้ตั้งแต่วันแรก */
export function Crest({ team, className = 'crest' }: { team: Team; className?: string }) {
  return (
    <div className={className} style={{ ['--crest' as string]: team.color }}>
      {team.logo ? <img src={`/teams/${team.logo}`} alt="" /> : (team.short || team.name.slice(0, 3))}
    </div>
  );
}
