import { useState } from 'react';
import { useHub } from '../shared/useHub.ts';
import LiveTab from './tabs/Live.tsx';
import ScoreboardTab from './tabs/Scoreboard.tsx';
import BanPickTab from './tabs/BanPick.tsx';
import StandingsTab from './tabs/Standings.tsx';
import BracketTab from './tabs/Bracket.tsx';
import ScheduleTab from './tabs/Schedule.tsx';
import OverlayTab from './tabs/Overlay.tsx';

const TABS = [
  { id: 'live', label: 'ออกอากาศ' },
  { id: 'score', label: 'สกอร์บอร์ด' },
  { id: 'draft', label: 'Ban / Pick' },
  { id: 'standings', label: 'ตารางคะแนน' },
  { id: 'bracket', label: 'สายการแข่ง' },
  { id: 'schedule', label: 'ตารางแมตช์' },
  { id: 'overlay', label: 'Overlay' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ControlApp() {
  const hub = useHub();
  const [tab, setTab] = useState<TabId>('live');
  const { state, obs, connected, send, toast } = hub;

  const stats = obs?.stats ?? null;
  // เกณฑ์เดียวกับที่ทีมสตรีมใช้จริง: เกิน 1% คือต้องลด bitrate ทันที
  const droppedClass = !stats ? '' : stats.droppedPct >= 1 ? 'bad' : stats.droppedPct > 0.3 ? 'warn' : 'on';

  return (
    <div className="app">
      <header className="statusbar">
        <div className="brand">Jaturamitr ROV</div>

        <span className={`chip ${obs?.connected ? 'on' : 'bad'}`}>
          <span className="dot" />
          OBS
        </span>

        <span className={`chip ${obs?.streaming ? 'live' : ''}`}>
          <span className="dot" />
          {obs?.streaming ? <>LIVE&nbsp;<b>{obs.streamTimecode}</b></> : 'ไม่ได้ไลฟ์'}
        </span>

        <span className={`chip ${obs?.recording ? 'rec' : ''}`}>
          <span className="dot" />
          {obs?.recording ? <>REC&nbsp;<b>{obs.recordTimecode}</b></> : 'ไม่ได้อัด'}
        </span>

        {stats && (
          <>
            <span className={`chip ${droppedClass}`}>
              <span className="dot" />
              <span className="lbl">เฟรมหลุด</span>&nbsp;<b>{stats.droppedPct.toFixed(2)}%</b>
            </span>
            <span className="chip">
              <span className="lbl">bitrate</span>&nbsp;<b>{stats.kbps}</b>&nbsp;kbps
            </span>
            <span className="chip">
              <span className="lbl">CPU</span>&nbsp;<b>{stats.cpu}%</b>
            </span>
            <span className="chip">
              <span className="lbl">FPS</span>&nbsp;<b>{stats.fps}</b>
            </span>
          </>
        )}
      </header>

      {!connected && (
        <div className="banner">
          <strong>ขาดการเชื่อมต่อกับ hub server</strong>
          <span>— กำลังต่อใหม่อัตโนมัติ ตรวจว่า `npm run dev` ยังทำงานอยู่</span>
        </div>
      )}

      {connected && obs && !obs.connected && (
        <div className="banner">
          <strong>ต่อกับ OBS ไม่ได้</strong>
          <span>{obs.error}</span>
          <button className="btn" onClick={() => send({ type: 'obs', action: 'reconnect' })}>
            ลองใหม่
          </button>
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {!state ? (
          <p className="hint">กำลังโหลดข้อมูลแมตช์…</p>
        ) : tab === 'live' ? (
          <LiveTab obs={obs} send={send} />
        ) : tab === 'score' ? (
          <ScoreboardTab state={state} send={send} />
        ) : tab === 'draft' ? (
          <BanPickTab state={state} send={send} />
        ) : tab === 'standings' ? (
          <StandingsTab state={state} send={send} />
        ) : tab === 'bracket' ? (
          <BracketTab state={state} send={send} />
        ) : tab === 'schedule' ? (
          <ScheduleTab state={state} send={send} />
        ) : (
          <OverlayTab state={state} obs={obs} send={send} />
        )}
      </main>

      {toast && (
        <div className="toast" key={toast.id}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
