import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MapScene } from './scenes/MapScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#15171d',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scale: {
      // RESIZE: kanvas selalu penuhi layar (tanpa letterbox).
      // Zoom diatur per-lebar di MapScene.fitWidthZoom (640 world px selebar layar).
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight
    },
    scene: [BootScene, MapScene]
  };

  return new Phaser.Game(config);
}
