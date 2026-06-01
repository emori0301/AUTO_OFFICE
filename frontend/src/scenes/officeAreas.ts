export type AreaKey =
  | 'desk'
  | 'meeting_take'
  | 'meeting_ume'
  | 'meeting_matsu'
  | 'staff'
  | 'lounge'
  | 'away';

export interface AreaDef {
  x: number; y: number; w: number; h: number;
  label: string; fill: number; border: number;
}

export const AREAS: Record<AreaKey, AreaDef> = {
  desk:          { x: 8,   y: 8,   w: 554, h: 296, label: '執務室',       fill: 0x0f2040, border: 0x3366cc },
  meeting_take:  { x: 570, y: 8,   w: 382, h: 180, label: '会議室（竹）', fill: 0x0f2a1a, border: 0x33cc66 },
  meeting_ume:   { x: 570, y: 196, w: 188, h: 180, label: '会議室（梅）', fill: 0x0f2a1a, border: 0x33cc66 },
  meeting_matsu: { x: 766, y: 196, w: 186, h: 180, label: '会議室（松）', fill: 0x0f2a1a, border: 0x33cc66 },
  staff:         { x: 8,   y: 312, w: 268, h: 306, label: '職員室',       fill: 0x2a1a0f, border: 0xcc9933 },
  lounge:        { x: 284, y: 312, w: 278, h: 306, label: '休憩室',       fill: 0x0f2a2a, border: 0x33cccc },
  away:          { x: 570, y: 384, w: 382, h: 234, label: '不在',         fill: 0x1a1a1a, border: 0x555555 },
};
