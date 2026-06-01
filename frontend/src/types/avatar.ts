export type AvatarConfig = {
  skinTone:    'pale' | 'medium';
  eyeType:     number;  // 1–10
  mouthType:   number;  // 1–10
  eyebrowType: number;  // 1–10
  hairStyle:   number;  // 1–20
  hairColor:   string;  // HEX
  topId:       number;  // 1–20
  bottomId:    number;  // 1–20
  shoeId:      number;  // 1–10
  accessory1:  number | null;
  accessory2:  number | null;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skinTone: 'medium',
  eyeType: 1,
  mouthType: 1,
  eyebrowType: 1,
  hairStyle: 1,
  hairColor: '#3D2817',
  topId: 1,
  bottomId: 1,
  shoeId: 1,
  accessory1: null,
  accessory2: null,
};
