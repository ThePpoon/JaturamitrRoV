import { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  /** ข้อความตอนรอการยืนยันครั้งที่สอง */
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
  /** วินาทีที่รอก่อนยกเลิกการยืนยันเอง */
  timeout?: number;
}

/**
 * ปุ่มที่ต้องกดสองครั้งจึงทำงาน
 * ใช้กับปุ่มที่พลาดแล้วเสียหายกลางไลฟ์ (หยุดสตรีม หยุดอัด รีเซ็ตแมตช์)
 * สถานะรอยืนยันจะหายเองใน 4 วินาที เพื่อไม่ให้ค้างเป็นกับดักรอคนเผลอกด
 */
export default function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  className = 'btn',
  disabled,
  timeout = 4000,
}: Props) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const disarm = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setArmed(false);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${className}${armed ? ' confirming' : ''}`}
      onClick={() => {
        if (armed) {
          disarm();
          onConfirm();
        } else {
          setArmed(true);
          timer.current = setTimeout(disarm, timeout);
        }
      }}
      onBlur={disarm}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
