import { formatClock, secondsLeft, useHub, useNow } from '../shared/useHub.ts';
import { Stage } from './Stage.tsx';

export default function CountdownOverlay() {
  const { state } = useHub();
  const now = useNow(250);
  if (!state) return null;

  const { visible, endsAt, label } = state.countdown;
  if (!visible) return null;

  const left = secondsLeft(endsAt, now) ?? 0;

  return (
    <Stage>
      <div className="countdown">
        {label && <div className="lbl">{label}</div>}
        <div className={`clock${left <= 10 ? ' low' : ''}`}>{formatClock(left)}</div>
      </div>
    </Stage>
  );
}
