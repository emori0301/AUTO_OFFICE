import { useEffect, useMemo, useRef } from 'react';
import Phaser from 'phaser';
import LoadingScene from '../scenes/LoadingScene';
import OfficeScene from '../scenes/OfficeScene';
import { connectWs, disconnectWs, loadUserInfos, loadLayout, useOfficeStore } from '../store/useOfficeStore';
import { avatarWorldPos } from '../store/avatarPositions';
import { AREAS } from '../scenes/officeAreas';
import type { WorkStyle, DotColor } from '../types/userState';

// ─── Legend data (mirrors OfficeScene constants) ──────────────────

const WORKSTYLE_LEGEND: { ws: WorkStyle; label: string; color: string }[] = [
  { ws: 'office',        label: '出社',   color: '#22c55e' },
  { ws: 'in_meeting',    label: '会議中', color: '#ef4444' },
  { ws: 'remote',        label: '在宅',   color: '#60a5fa' },
  { ws: 'ses',           label: '客先',   color: '#fb923c' },
  { ws: 'vacation',      label: '休暇',   color: '#a855f7' },
  { ws: 'business_trip', label: '出張',   color: '#22d3ee' },
  { ws: 'early_leave',   label: '早退',   color: '#94a3b8' },
];

const ASSIGN_LEGEND: { dot: DotColor; label: string; color: string }[] = [
  { dot: 'free',    label: '空き', color: '#22c55e' },
  { dot: 'client',  label: '受託', color: '#3b82f6' },
  { dot: 'inhouse', label: '自社', color: '#f97316' },
  { dot: 'multi',   label: '複数', color: '#a855f7' },
  { dot: 'special', label: '特別', color: '#fbbf24' },
];

// AREA_LABELS is computed dynamically inside the component to react to layout changes

// Legend world positions — x spacing 52px each, starting at x=10, y=628
const WS_LEGEND_ITEMS = WORKSTYLE_LEGEND.map((item, i) => ({
  ...item,
  wx: 10 + i * 52 + 13, // text starts 13px right of dot center
  wy: 628,
}));

// Assign legend: x spacing 48px, starting at x=430+12, y=628
const DOT_LEGEND_ITEMS = ASSIGN_LEGEND.map((item, i) => ({
  ...item,
  wx: 430 + i * 48 + 12,
  wy: 628,
}));

// ─── Helpers ──────────────────────────────────────────────────────

function shorten(name: string): string {
  return name.length > 6 ? name.slice(0, 5) + '…' : name;
}

// ─── Component ────────────────────────────────────────────────────

export default function PhaserMap() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const gameRef       = useRef<Phaser.Game | null>(null);
  const avatarRefs    = useRef<Record<string, HTMLDivElement | null>>({});
  const areaRefs      = useRef<(HTMLDivElement | null)[]>([]);
  const wsLegendRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const dotLegendRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef        = useRef<number>(0);

  const users          = useOfficeStore(s => s.users);
  const layoutOverride = useOfficeStore(s => s.layoutOverride);

  const AREA_LABELS = useMemo(() => {
    const areas = layoutOverride
      ? Object.fromEntries(
          Object.entries(AREAS).map(([k, a]) => [k, { ...a, ...(layoutOverride[k] ?? {}) }]),
        )
      : AREAS;
    return Object.values(areas).map(a => ({ label: a.label, wx: a.x + 7, wy: a.y + 5 }));
  }, [layoutOverride]);

  // ─── Phaser game ─────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    connectWs();
    loadUserInfos();
    loadLayout();

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: '#080c14',
      pixelArt: true,
      scene: [LoadingScene, OfficeScene],
      parent: containerRef.current,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 640,
      },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      disconnectWs();
    };
  }, []);

  // ─── RAF: world coords → DOM transforms ──────────────────────────

  useEffect(() => {
    function tick() {
      const game      = gameRef.current;
      const container = containerRef.current;
      if (!game || !container) { rafRef.current = requestAnimationFrame(tick); return; }

      const canvasRect    = game.canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scale   = canvasRect.width / 960;
      const ox      = canvasRect.left - containerRect.left;
      const oy      = canvasRect.top  - containerRect.top;

      function worldToDOM(wx: number, wy: number): [number, number] {
        return [ox + wx * scale, oy + wy * scale];
      }

      // Avatar labels — centered (translateX -50%)
      for (const [id, pos] of Object.entries(avatarWorldPos)) {
        const el = avatarRefs.current[id];
        if (!el) continue;
        const [x, y] = worldToDOM(pos.x, pos.y);
        el.style.transform = `translate(${x}px,${y}px) translateX(-50%)`;
        el.style.opacity   = String(pos.opacity);
      }

      // Area labels — top-left aligned
      AREA_LABELS.forEach(({ wx, wy }, i) => {
        const el = areaRefs.current[i];
        if (!el) return;
        const [x, y] = worldToDOM(wx, wy);
        el.style.transform = `translate(${x}px,${y}px)`;
      });

      // Workstyle legend labels
      WS_LEGEND_ITEMS.forEach(({ wx, wy }, i) => {
        const el = wsLegendRefs.current[i];
        if (!el) return;
        const [x, y] = worldToDOM(wx, wy);
        el.style.transform = `translate(${x}px,${y}px)`;
      });

      // Assign dot legend labels
      DOT_LEGEND_ITEMS.forEach(({ wx, wy }, i) => {
        const el = dotLegendRefs.current[i];
        if (!el) return;
        const [x, y] = worldToDOM(wx, wy);
        el.style.transform = `translate(${x}px,${y}px)`;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────

  const labelBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'translate(-9999px,-9999px)',
    willChange: 'transform',
    whiteSpace: 'nowrap',
    lineHeight: 1,
  };

  const textShadow =
    '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Phaser canvas */}

      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">

        {/* Avatar name labels */}
        {users.map(u => (
          <div
            key={u.id}
            ref={el => { avatarRefs.current[u.id] = el; }}
            style={{ ...labelBase, willChange: 'transform, opacity' }}
          >
            <span style={{ fontSize: 11, color: '#e8e8e8', textShadow }}>
              {shorten(u.displayName)}
            </span>
          </div>
        ))}

        {/* Area labels */}
        {AREA_LABELS.map(({ label }, i) => (
          <div
            key={label}
            ref={el => { areaRefs.current[i] = el; }}
            style={labelBase}
          >
            <span style={{ fontSize: 12, color: '#7a9ab8', textShadow }}>
              {label}
            </span>
          </div>
        ))}

        {/* Workstyle legend labels */}
        {WS_LEGEND_ITEMS.map(({ label, ws }, i) => (
          <div
            key={ws}
            ref={el => { wsLegendRefs.current[i] = el; }}
            style={labelBase}
          >
            <span style={{ fontSize: 10, color: '#777777' }}>{label}</span>
          </div>
        ))}

        {/* Assign dot legend labels */}
        {DOT_LEGEND_ITEMS.map(({ label, dot }, i) => (
          <div
            key={dot}
            ref={el => { dotLegendRefs.current[i] = el; }}
            style={labelBase}
          >
            <span style={{ fontSize: 10, color: '#777777' }}>{label}</span>
          </div>
        ))}

      </div>
    </div>
  );
}
