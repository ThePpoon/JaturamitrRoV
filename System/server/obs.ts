import OBSWebSocket from 'obs-websocket-js';
import type { ObsAction, ObsStatus, SceneItem } from './protocol.ts';

const RECONNECT_MS = 2000;
const POLL_MS = 1000;

function emptyStatus(): ObsStatus {
  return {
    connected: false,
    error: null,
    scenes: [],
    currentScene: null,
    studioMode: false,
    previewScene: null,
    streaming: false,
    recording: false,
    recordPaused: false,
    streamTimecode: '00:00:00',
    recordTimecode: '00:00:00',
    stats: null,
    currentSceneItems: [],
  };
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

export class ObsManager {
  private obs = new OBSWebSocket();
  private status = emptyStatus();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastBytes = 0;
  private lastBytesAt = 0;
  private stopped = false;

  constructor(
    private url: string,
    private password: string,
    private onChange: (status: ObsStatus) => void,
  ) {
    this.wireEvents();
  }

  getStatus() {
    return this.status;
  }

  private emit() {
    this.onChange(this.status);
  }

  private wireEvents() {
    this.obs.on('ConnectionClosed', () => {
      if (this.status.connected) console.warn('[obs] การเชื่อมต่อหลุด');
      this.status = { ...emptyStatus(), error: 'ไม่ได้เชื่อมต่อกับ OBS' };
      this.emit();
      this.scheduleReconnect();
    });

    // เหตุการณ์จาก OBS โดยตรง ทำให้ปุ่มบนหน้าคุมตรงกับความจริงเสมอ
    // แม้จะมีคนไปกดที่หน้าต่าง OBS หรือใช้ hotkey ก็ตาม
    this.obs.on('CurrentProgramSceneChanged', ({ sceneName }) => {
      this.status.currentScene = sceneName;
      this.emit();
      void this.refreshSceneItems();
    });
    this.obs.on('CurrentPreviewSceneChanged', ({ sceneName }) => {
      this.status.previewScene = sceneName;
      this.emit();
    });
    this.obs.on('StudioModeStateChanged', ({ studioModeEnabled }) => {
      this.status.studioMode = studioModeEnabled;
      this.emit();
    });
    this.obs.on('SceneListChanged', () => void this.refreshScenes());
    this.obs.on('SceneItemEnableStateChanged', () => void this.refreshSceneItems());
    this.obs.on('StreamStateChanged', ({ outputActive }) => {
      this.status.streaming = outputActive;
      if (!outputActive) this.status.streamTimecode = '00:00:00';
      this.emit();
    });
    this.obs.on('RecordStateChanged', ({ outputActive }) => {
      this.status.recording = outputActive;
      if (!outputActive) this.status.recordTimecode = '00:00:00';
      this.emit();
    });
  }

  async start() {
    this.stopped = false;
    await this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    void this.obs.disconnect();
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_MS);
  }

  private async connect() {
    if (this.stopped) return;
    try {
      await this.obs.connect(this.url, this.password || undefined);
      this.status.connected = true;
      this.status.error = null;
      console.log('[obs] เชื่อมต่อกับ OBS แล้ว: ' + this.url);
      await this.refreshAll();
      this.startPolling();
      this.emit();
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      this.status.connected = false;
      this.status.error = /auth/i.test(message)
        ? 'รหัสผ่าน obs-websocket ไม่ถูกต้อง'
        : 'ยังต่อกับ OBS ไม่ได้ เปิด OBS และเปิด WebSocket Server หรือยัง?';
      this.emit();
      this.scheduleReconnect();
    }
  }

  private startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => void this.poll(), POLL_MS);
  }

  private async poll() {
    if (!this.status.connected) return;
    try {
      const stats = await this.obs.call('GetStats');
      const stream = await this.obs.call('GetStreamStatus');
      const record = await this.obs.call('GetRecordStatus');

      // OBS ไม่ได้ให้ bitrate ตรง ๆ คำนวณจากผลต่างของ outputBytes ต่อช่วงเวลาแทน
      const now = Date.now();
      let kbps = 0;
      if (stream.outputActive && this.lastBytesAt && stream.outputBytes >= this.lastBytes) {
        const seconds = (now - this.lastBytesAt) / 1000;
        if (seconds > 0) {
          kbps = Math.round(((stream.outputBytes - this.lastBytes) * 8) / 1000 / seconds);
        }
      }
      this.lastBytes = stream.outputActive ? stream.outputBytes : 0;
      this.lastBytesAt = now;

      this.status.streaming = stream.outputActive;
      this.status.streamTimecode = String(stream.outputTimecode ?? '00:00:00').split('.')[0];
      this.status.recording = record.outputActive;
      this.status.recordPaused = record.outputPaused;
      this.status.recordTimecode = String(record.outputTimecode ?? '00:00:00').split('.')[0];
      this.status.stats = {
        cpu: Math.round(stats.cpuUsage * 10) / 10,
        fps: Math.round(stats.activeFps),
        droppedPct: pct(stream.outputSkippedFrames, stream.outputTotalFrames),
        encodeSkippedPct: pct(stats.outputSkippedFrames, stats.outputTotalFrames),
        kbps,
      };
      this.emit();
    } catch {
      // ปล่อยผ่าน ถ้าการเชื่อมต่อหลุดจริง ConnectionClosed จะจัดการเอง
    }
  }

  private async refreshAll() {
    await this.refreshScenes();
    await this.refreshSceneItems();
    try {
      const studio = await this.obs.call('GetStudioModeEnabled');
      this.status.studioMode = studio.studioModeEnabled;
    } catch {
      this.status.studioMode = false;
    }
  }

  private async refreshScenes() {
    try {
      const res = await this.obs.call('GetSceneList');
      // OBS ส่งฉากมาจากล่างขึ้นบน กลับลำดับให้ตรงกับที่เห็นในหน้าต่าง OBS
      this.status.scenes = res.scenes
        .map((s) => String((s as unknown as { sceneName: string }).sceneName))
        .reverse();
      this.status.currentScene = res.currentProgramSceneName ?? null;
      this.status.previewScene = res.currentPreviewSceneName ?? null;
      this.emit();
    } catch (err) {
      console.error('[obs] ดึงรายชื่อฉากไม่สำเร็จ:', (err as Error).message);
    }
  }

  private async refreshSceneItems() {
    const scene = this.status.currentScene;
    if (!scene) {
      this.status.currentSceneItems = [];
      return;
    }
    try {
      const res = await this.obs.call('GetSceneItemList', { sceneName: scene });
      this.status.currentSceneItems = res.sceneItems
        .map((raw): SceneItem => {
          const i = raw as unknown as {
            sceneItemId: number;
            sourceName: string;
            sceneItemEnabled: boolean;
          };
          return { id: Number(i.sceneItemId), name: String(i.sourceName), enabled: Boolean(i.sceneItemEnabled) };
        })
        .reverse();
      this.emit();
    } catch {
      this.status.currentSceneItems = [];
    }
  }

  /** สั่งงาน OBS คืน error message ถ้าล้มเหลว เพื่อให้หน้าคุมแสดง toast ได้ */
  async dispatch(msg: ObsAction): Promise<string | null> {
    if (!this.status.connected && msg.action !== 'reconnect') {
      return 'ยังไม่ได้เชื่อมต่อกับ OBS';
    }
    try {
      switch (msg.action) {
        case 'setScene':
          await this.obs.call('SetCurrentProgramScene', { sceneName: msg.scene });
          break;
        case 'setPreviewScene':
          await this.obs.call('SetCurrentPreviewScene', { sceneName: msg.scene });
          break;
        case 'transition':
          await this.obs.call('TriggerStudioModeTransition');
          break;
        case 'startStream':
          await this.obs.call('StartStream');
          break;
        case 'stopStream':
          await this.obs.call('StopStream');
          break;
        case 'startRecord':
          await this.obs.call('StartRecord');
          break;
        case 'stopRecord':
          await this.obs.call('StopRecord');
          break;
        case 'saveReplay':
          await this.obs.call('SaveReplayBuffer');
          break;
        case 'setItemEnabled':
          await this.obs.call('SetSceneItemEnabled', {
            sceneName: msg.scene,
            sceneItemId: msg.itemId,
            sceneItemEnabled: msg.enabled,
          });
          break;
        case 'reconnect':
          await this.obs.disconnect().catch(() => {});
          await this.connect();
          break;
      }
      return null;
    } catch (err) {
      return (err as Error).message ?? 'สั่งงาน OBS ไม่สำเร็จ';
    }
  }
}
