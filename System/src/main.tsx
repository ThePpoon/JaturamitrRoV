import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

import ControlApp from './control/App.tsx';
import Scoreboard from './overlay/Scoreboard.tsx';
import BanPickOverlay from './overlay/BanPick.tsx';
import LowerThird from './overlay/LowerThird.tsx';
import Sponsors from './overlay/Sponsors.tsx';
import Countdown from './overlay/Countdown.tsx';
import Standings from './overlay/Standings.tsx';
import Bracket from './overlay/Bracket.tsx';
import Schedule from './overlay/Schedule.tsx';

import './control/control.css';
import './overlay/overlay.css';

const OVERLAYS: Record<string, ComponentType> = {
  scoreboard: Scoreboard,
  banpick: BanPickOverlay,
  lowerthird: LowerThird,
  sponsors: Sponsors,
  countdown: Countdown,
  standings: Standings,
  bracket: Bracket,
  schedule: Schedule,
};

function resolve() {
  const path = location.pathname.replace(/\/+$/, '');
  const overlayMatch = path.match(/^\/overlay\/([a-z]+)$/);
  if (overlayMatch) {
    const View = OVERLAYS[overlayMatch[1]];
    if (View) {
      // browser source ใน OBS จะโปร่งใสก็ต่อเมื่อ background ของหน้าเป็น transparent จริง
      document.documentElement.classList.add('is-overlay');
      return <View />;
    }
  }
  document.documentElement.classList.add('is-control');
  return <ControlApp />;
}

createRoot(document.getElementById('root')!).render(<StrictMode>{resolve()}</StrictMode>);
