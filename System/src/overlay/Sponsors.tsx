import { useEffect, useMemo, useState } from 'react';
import { Stage } from './Stage.tsx';

const PER_SLIDE = 3;
const INTERVAL_MS = 7000;

/**
 * แถบโลโก้สปอนเซอร์ อ่านไฟล์จาก public/sponsors/ อัตโนมัติ
 * เพิ่ม/ลบโลโก้ได้โดยแค่วางไฟล์แล้วรีเฟรช browser source ไม่ต้องแก้โค้ด
 */
export default function SponsorsOverlay() {
  const [files, setFiles] = useState<string[]>([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    fetch('/api/assets/sponsors')
      .then((r) => r.json())
      .then((f: string[]) => setFiles(f))
      .catch(() => setFiles([]));
  }, []);

  const slides = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < files.length; i += PER_SLIDE) out.push(files.slice(i, i + PER_SLIDE));
    return out;
  }, [files]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <Stage width={1920} height={200}>
      <div className="sponsor-strip">
        {slides.map((group, i) => (
          <div key={i} className={`sponsor-slot${i === slide ? ' show' : ''}`}>
            {group.map((f) => (
              <img key={f} src={`/sponsors/${f}`} alt="" />
            ))}
          </div>
        ))}
      </div>
    </Stage>
  );
}
