// Mutable shared state written by OfficeScene.update() and read by PhaserMap via RAF.
// Not a React state — intentionally mutable for per-frame updates without re-renders.

export type AvatarPosEntry = {
  x: number;       // world-space X of the name label center
  y: number;       // world-space Y of the name label top
  name: string;
  opacity: number;
};

export const avatarWorldPos: Record<string, AvatarPosEntry> = {};
