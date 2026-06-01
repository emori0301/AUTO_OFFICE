import type { WorkStyle, DotColor } from '../types/userState';

export type WorkStyleOption = {
  value:    WorkStyle;
  label:    string;
  colorCss: string;
  bgCss:    string;
};

export type DotColorOption = {
  value: DotColor;
  label: string;
  bgCss: string;
};

export const WORKSTYLE_OPTIONS: WorkStyleOption[] = [
  { value: 'office',        label: '出社',     colorCss: 'text-green-400',  bgCss: 'bg-green-600' },
  { value: 'in_meeting',    label: '会議中',   colorCss: 'text-red-400',    bgCss: 'bg-red-600' },
  { value: 'remote',        label: '在宅',     colorCss: 'text-blue-400',   bgCss: 'bg-blue-600' },
  { value: 'ses',           label: '客先常駐', colorCss: 'text-orange-400', bgCss: 'bg-orange-600' },
  { value: 'vacation',      label: '休暇',     colorCss: 'text-purple-400', bgCss: 'bg-purple-600' },
  { value: 'business_trip', label: '出張',     colorCss: 'text-cyan-400',   bgCss: 'bg-cyan-600' },
  { value: 'early_leave',   label: '早退',     colorCss: 'text-slate-400',  bgCss: 'bg-slate-600' },
];

export const MANUAL_WORKSTYLE_OPTIONS: WorkStyleOption[] =
  WORKSTYLE_OPTIONS.filter(o => o.value !== 'in_meeting');

export const ASSIGN_DOT_OPTIONS: DotColorOption[] = [
  { value: 'free',    label: '空き',   bgCss: 'bg-green-500' },
  { value: 'client',  label: '受託',   bgCss: 'bg-blue-500' },
  { value: 'inhouse', label: '自社',   bgCss: 'bg-orange-500' },
  { value: 'multi',   label: '複数',   bgCss: 'bg-purple-500' },
  { value: 'special', label: '特別',   bgCss: 'bg-yellow-500' },
];

export const WORKSTYLE_LABEL = Object.fromEntries(
  WORKSTYLE_OPTIONS.map(o => [o.value, o.label]),
) as Record<WorkStyle, string>;

export const WORKSTYLE_COLOR_CSS = Object.fromEntries(
  WORKSTYLE_OPTIONS.map(o => [o.value, o.colorCss]),
) as Record<WorkStyle, string>;

// Hex colors for Phaser canvas
export const WORKSTYLE_COLOR_HEX: Record<WorkStyle, number> = {
  office:        0x22c55e,
  in_meeting:    0xef4444,
  remote:        0x60a5fa,
  ses:           0xfb923c,
  vacation:      0xa855f7,
  business_trip: 0x22d3ee,
  early_leave:   0x94a3b8,
};

export const ASSIGN_DOT_LABEL = Object.fromEntries(
  ASSIGN_DOT_OPTIONS.map(o => [o.value, o.label]),
) as Record<DotColor, string>;

export const ASSIGN_DOT_COLOR_HEX: Record<DotColor, number> = {
  free:    0x22c55e,
  client:  0x3b82f6,
  inhouse: 0xf97316,
  multi:   0xa855f7,
  special: 0xfbbf24,
};
