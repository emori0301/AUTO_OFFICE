import type { UserState, WorkStyle, DotColor, UserInfo } from '../types/userState';

export interface FilterState {
  filterText: string;
  filterWorkStyles: WorkStyle[];
  filterAssignDots: DotColor[];
  filterGroupNames: string[];
}

export const EMPTY_FILTER: FilterState = {
  filterText: '',
  filterWorkStyles: [],
  filterAssignDots: [],
  filterGroupNames: [],
};

export function hasActiveFilter(f: FilterState): boolean {
  return (
    f.filterText.trim() !== '' ||
    f.filterWorkStyles.length > 0 ||
    f.filterAssignDots.length > 0 ||
    f.filterGroupNames.length > 0
  );
}

export function computeFilteredIds(
  users: UserState[],
  userInfos: UserInfo[],
  filter: FilterState,
): Set<string> | null {
  if (!hasActiveFilter(filter)) return null;

  const { filterText, filterWorkStyles, filterAssignDots, filterGroupNames } = filter;
  const infoMap = new Map(userInfos.map(u => [u.id, u]));
  const result = new Set<string>();

  for (const user of users) {
    const info = infoMap.get(user.id);
    let matches = true;

    if (filterText.trim()) {
      const text = filterText.trim().toLowerCase();
      const nameMatch = user.displayName.toLowerCase().includes(text);
      const groupMatch = info?.groups.some(g => g.groupName.toLowerCase().includes(text)) ?? false;
      if (!nameMatch && !groupMatch) matches = false;
    }

    if (matches && filterWorkStyles.length > 0) {
      if (!filterWorkStyles.includes(user.workStyle)) matches = false;
    }

    if (matches && filterAssignDots.length > 0) {
      if (!filterAssignDots.includes(user.assignDot ?? 'free')) matches = false;
    }

    if (matches && filterGroupNames.length > 0) {
      const userGroupNames = info?.groups.map(g => g.groupName) ?? [];
      if (!filterGroupNames.some(name => userGroupNames.includes(name))) matches = false;
    }

    if (matches) result.add(user.id);
  }

  return result;
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

export function toggleWorkStyle(f: FilterState, ws: WorkStyle): FilterState {
  return { ...f, filterWorkStyles: toggle(f.filterWorkStyles, ws) };
}

export function toggleAssignDot(f: FilterState, dot: DotColor): FilterState {
  return { ...f, filterAssignDots: toggle(f.filterAssignDots, dot) };
}

export function toggleGroupName(f: FilterState, name: string): FilterState {
  return { ...f, filterGroupNames: toggle(f.filterGroupNames, name) };
}
