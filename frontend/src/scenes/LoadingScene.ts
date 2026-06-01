import Phaser from 'phaser';

const HAIR_STYLES = [
  'short', 'long', 'bob', 'ponytail', 'bun',
  'wavy', 'curly', 'straight', 'layered', 'pixie',
  'braided', 'afro', 'mohawk', 'undercut', 'fringe',
  'twintail', 'spiky', 'swept', 'loose', 'mushroom',
] as const;

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload(): void {
    const bar = this.add.graphics();
    const bg  = this.add.graphics();
    bg.fillStyle(0x111827);
    bg.fillRect(80, 290, 800, 30);
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x22c55e);
      bar.fillRect(82, 292, 796 * v, 26);
    });

    // Body sheets: 320×128, frameW=64, frameH=64, 5×2 (row0=front walk, row1=back walk)
    for (const tone of ['pale', 'medium'] as const) {
      this.load.spritesheet(`body_${tone}`, `assets/sprites/body/body_${tone}.png`,
        { frameWidth: 64, frameHeight: 64 });
    }

    // Face sheets: 160×48, frameW=16, frameH=16, 10×3
    this.load.spritesheet('face_eyes',     'assets/sprites/face/eyes.png',     { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('face_mouth',    'assets/sprites/face/mouth.png',    { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('face_eyebrows', 'assets/sprites/face/eyebrows.png', { frameWidth: 16, frameHeight: 16 });

    // Hair sheets: 128×64, frameW=64, frameH=64, 2 frames (frame0=front, frame1=back)
    for (let i = 0; i < 20; i++) {
      const pad   = String(i + 1).padStart(2, '0');
      const style = HAIR_STYLES[i];
      this.load.spritesheet(`hair_${pad}`,
        `assets/sprites/hair/hair_${pad}_${style}.png`, { frameWidth: 64, frameHeight: 64 });
    }

    // Clothing sheets: 320×128, frameW=64, frameH=64, 5×2 (same walk layout as body)
    for (let i = 1; i <= 20; i++) {
      const pad = String(i).padStart(2, '0');
      this.load.spritesheet(`top_${pad}`,    `assets/sprites/clothing/top_${pad}_style.png`,    { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet(`bottom_${pad}`, `assets/sprites/clothing/bottom_${pad}_style.png`, { frameWidth: 64, frameHeight: 64 });
    }

    // Shoes: 640×128, frameW=64, frameH=64, 10 cols × 2 rows
    this.load.spritesheet('shoes_all',       'assets/sprites/shoes/shoes_all.png',             { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('accessories_all', 'assets/sprites/accessories/accessories_all.png', { frameWidth: 64, frameHeight: 64 });
  }

  create(): void {
    // Register body walk / idle animations
    for (const tone of ['pale', 'medium'] as const) {
      this.anims.create({ key: `walk_front_${tone}`, frames: this.anims.generateFrameNumbers(`body_${tone}`, { start: 0, end: 4 }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `walk_back_${tone}`,  frames: this.anims.generateFrameNumbers(`body_${tone}`, { start: 5, end: 9 }), frameRate: 8, repeat: -1 });
      this.anims.create({ key: `idle_front_${tone}`, frames: [{ key: `body_${tone}`, frame: 0 }], frameRate: 1 });
      this.anims.create({ key: `idle_back_${tone}`,  frames: [{ key: `body_${tone}`, frame: 5 }], frameRate: 1 });
    }

    // Register clothing walk animations (top/bottom — same frame layout as body)
    for (let i = 1; i <= 20; i++) {
      const pad = String(i).padStart(2, '0');
      for (const prefix of ['top', 'bottom'] as const) {
        this.anims.create({ key: `walk_front_${prefix}_${pad}`, frames: this.anims.generateFrameNumbers(`${prefix}_${pad}`, { start: 0, end: 4 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `walk_back_${prefix}_${pad}`,  frames: this.anims.generateFrameNumbers(`${prefix}_${pad}`, { start: 5, end: 9 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `idle_front_${prefix}_${pad}`, frames: [{ key: `${prefix}_${pad}`, frame: 0 }], frameRate: 1 });
        this.anims.create({ key: `idle_back_${prefix}_${pad}`,  frames: [{ key: `${prefix}_${pad}`, frame: 5 }], frameRate: 1 });
      }
    }

    this.scene.start('OfficeScene');
  }
}
