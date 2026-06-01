import type { AvatarConfig } from './avatar';

export type WorkStyle =
  | 'office'
  | 'in_meeting'
  | 'remote'
  | 'ses'
  | 'vacation'
  | 'business_trip'
  | 'early_leave';

export type DotColor = 'free' | 'client' | 'inhouse' | 'multi' | 'special';

export type UserState = {
  id: string;
  displayName: string;
  email: string;
  workStyle: WorkStyle;
  locationHint?: string;
  deskX: number | null;
  deskY: number | null;
  floorId: string | null;
  branchId: string;
  avatarConfig?: AvatarConfig | null;
  assignDot?: DotColor;
};

export type UserInfo = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  role: string;
  branchId: string;
  branchName: string;
  points: number;
  groups: { groupId: string; groupName: string; category: string }[];
};
