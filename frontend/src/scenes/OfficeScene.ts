import Phaser from 'phaser';
import { useOfficeStore } from '../store/useOfficeStore';
import type { UserState } from '../types/userState';
import { DEFAULT_AVATAR } from '../types/avatar';
import { AvatarSprite, AVATAR_LABEL_OFFSET_Y } from '../sprites/AvatarSprite';
import { computeFilteredIds } from '../utils/filter';
import { avatarWorldPos } from '../store/avatarPositions';
import { AREAS } from './officeAreas';
import type { AreaKey, AreaDef } from './officeAreas';
import {
  WORKSTYLE_COLOR_HEX,
  WORKSTYLE_OPTIONS,
  ASSIGN_DOT_COLOR_HEX,
  ASSIGN_DOT_OPTIONS,
} from '../constants/workStyle';

function resolveArea(user: UserState): AreaKey {
  switch (user.workStyle) {
    case 'in_meeting': {
      const hint = user.locationHint ?? '';
      if (hint.includes('梅')) return 'meeting_ume';
      if (hint.includes('松')) return 'meeting_matsu';
      return 'meeting_take';
    }
    case 'office':
      return 'desk';
    default:
      return 'away';
  }
}

// Avatar facing: back when walking away from camera (meeting rooms), front otherwise
function resolveFacing(area: AreaKey): 'front' | 'back' {
  return area === 'desk' || area === 'staff' || area === 'lounge' ? 'front' : 'back';
}

const CELL_W = 40;
const CELL_H = 44;
const AREA_PAD = 20;
const TWEEN_MS = 800;

function layoutPositions(area: AreaDef, count: number): { x: number; y: number }[] {
  const cols = Math.max(1, Math.floor((area.w - AREA_PAD * 2) / CELL_W));
  return Array.from({ length: count }, (_, i) => ({
    x: area.x + AREA_PAD + (i % cols) * CELL_W + CELL_W / 2,
    y: area.y + AREA_PAD + 20 + Math.floor(i / cols) * CELL_H,
  }));
}

export default class OfficeScene extends Phaser.Scene {
  private avatars = new Map<string, AvatarSprite>();
  private targetPos = new Map<string, { x: number; y: number }>();
  private unsubscribe!: () => void;
  private filterUnsub!: () => void;
  private layoutUnsub!: () => void;
  private floorGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'OfficeScene' });
  }

  create(): void {
    this.floorGraphics = this.add.graphics();
    this.drawFloor();
    this.drawLegend();

    this.syncAvatars(useOfficeStore.getState().users, false);

    this.unsubscribe = useOfficeStore.subscribe(
      (s) => s.users,
      (users) => {
        this.syncAvatars(users, true);
        this.applyFilterOpacity();
      },
    );

    this.filterUnsub = useOfficeStore.subscribe(
      (s) => s.filter,
      () => this.applyFilterOpacity(),
    );

    this.layoutUnsub = useOfficeStore.subscribe(
      (s) => s.layoutOverride,
      () => {
        this.drawFloor();
        this.syncAvatars(useOfficeStore.getState().users, false);
      },
    );

    this.events.once('shutdown', () => { this.unsubscribe?.(); this.filterUnsub?.(); this.layoutUnsub?.(); });
    this.events.once('destroy',  () => { this.unsubscribe?.(); this.filterUnsub?.(); this.layoutUnsub?.(); });
  }

  // ─── update (called every frame by Phaser) ───────────────────

  update(): void {
    for (const [, sprite] of this.avatars) {
      avatarWorldPos[sprite.userId] = {
        x: sprite.x,
        y: sprite.y + AVATAR_LABEL_OFFSET_Y,
        name: sprite.displayName,
        opacity: sprite.alpha,
      };
    }
  }

  // ─── floor drawing ───────────────────────────────────────────

  private getAreas(): Record<AreaKey, AreaDef> {
    const override = useOfficeStore.getState().layoutOverride;
    if (!override) return AREAS;
    const result = { ...AREAS };
    for (const [key, pos] of Object.entries(override)) {
      if (key in result) {
        result[key as AreaKey] = { ...result[key as AreaKey], ...pos };
      }
    }
    return result;
  }

  private drawFloor(): void {
    const g = this.floorGraphics;
    g.clear();
    g.fillStyle(0x080c14);
    g.fillRect(0, 0, 960, 640);

    for (const area of Object.values(this.getAreas())) {
      g.fillStyle(area.fill, 1);
      g.fillRect(area.x, area.y, area.w, area.h);
      g.lineStyle(1, area.border, 0.9);
      g.strokeRect(area.x, area.y, area.w, area.h);
    }
  }

  private drawLegend(): void {
    const g = this.add.graphics();
    const ly = 628;
    let lx = 10;
    for (const opt of WORKSTYLE_OPTIONS) {
      g.fillStyle(WORKSTYLE_COLOR_HEX[opt.value], 0.9);
      g.fillCircle(lx + 5, ly + 6, 5);
      lx += 52;
    }
    let ax = 430;
    for (const opt of ASSIGN_DOT_OPTIONS) {
      g.fillStyle(ASSIGN_DOT_COLOR_HEX[opt.value], 1);
      g.fillCircle(ax + 4, ly + 6, 4);
      ax += 48;
    }
  }

  // ─── filter opacity ──────────────────────────────────────────

  private applyFilterOpacity(): void {
    const { users, userInfos, filter } = useOfficeStore.getState();
    const filtered = computeFilteredIds(users, userInfos, filter);
    for (const [id, sprite] of this.avatars) {
      sprite.setAlpha(filtered === null || filtered.has(id) ? 1.0 : 0.15);
    }
  }

  // ─── core sync ───────────────────────────────────────────────

  private syncAvatars(users: UserState[], animate: boolean): void {
    const liveIds = new Set(users.map((u) => u.id));
    for (const [id, sprite] of this.avatars) {
      if (!liveIds.has(id)) {
        sprite.destroy();
        this.avatars.delete(id);
        this.targetPos.delete(id);
        delete avatarWorldPos[id];
      }
    }

    const areas = this.getAreas();
    const byArea = new Map<AreaKey, UserState[]>(
      (Object.keys(areas) as AreaKey[]).map((k) => [k, []]),
    );
    for (const u of users) byArea.get(resolveArea(u))!.push(u);
    for (const arr of byArea.values()) arr.sort((a, b) => a.id.localeCompare(b.id));

    for (const [key, areaUsers] of byArea) {
      if (areaUsers.length === 0) continue;
      const area = areas[key];
      const positions = layoutPositions(area, areaUsers.length);
      const facing = resolveFacing(key);

      areaUsers.forEach((user, i) => {
        const target = positions[i];
        const statusColor = WORKSTYLE_COLOR_HEX[user.workStyle];
        const assignDotColor = ASSIGN_DOT_COLOR_HEX[user.assignDot ?? 'free'];
        const cfg = user.avatarConfig ?? DEFAULT_AVATAR;

        if (!this.avatars.has(user.id)) {
          const sprite = new AvatarSprite(
            this,
            target.x,
            target.y,
            user.id,
            cfg,
            facing,
            user.displayName,
            statusColor,
            assignDotColor,
          );
          this.avatars.set(user.id, sprite);
          this.targetPos.set(user.id, target);
        } else {
          const sprite = this.avatars.get(user.id)!;
          const prev = this.targetPos.get(user.id)!;

          sprite.setStatusColor(statusColor);
          sprite.setAssignDotColor(assignDotColor);
          sprite.setFacing(facing);
          sprite.setDisplayName(user.displayName);
          sprite.updateConfig(cfg);

          const hasMoved = prev.x !== target.x || prev.y !== target.y;
          if (!hasMoved) return;

          this.targetPos.set(user.id, target);

          if (animate) {
            this.tweens.killTweensOf(sprite);
            this.tweens.add({
              targets: sprite,
              x: target.x,
              y: target.y,
              duration: TWEEN_MS,
              ease: 'Power2.easeInOut',
              onStart:    () => { sprite.startWalk(); },
              onComplete: () => { sprite.stopWalk(); },
            });
          } else {
            sprite.setPosition(target.x, target.y);
          }
        }
      });
    }
  }
}
