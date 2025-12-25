import * as Phaser from 'phaser';

/**
 * TimerDisplay - Jackbox-style prominent timer display
 *
 * Creates a HERO timer element that changes color based on urgency.
 * Usage:
 *   const timer = new TimerDisplay(scene, 400, 70);
 *   timer.update(45); // Update with seconds remaining
 *   timer.setVisible(true);
 */

export interface TimerDisplayConfig {
  radius?: number;
  fontSize?: string;
  backgroundColor?: number;
  warningColor?: number;
  dangerColor?: number;
  textColor?: string;
  warningThreshold?: number; // Seconds at which to show warning color
  dangerThreshold?: number;  // Seconds at which to show danger color
}

const DEFAULT_CONFIG: Required<TimerDisplayConfig> = {
  radius: 50,
  fontSize: '36px',
  backgroundColor: 0x1f2937, // Dark gray
  warningColor: 0xfbbf24,    // Gold
  dangerColor: 0xef4444,     // Red
  textColor: '#ffffff',
  warningThreshold: 30,
  dangerThreshold: 10,
};

export class TimerDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Arc;
  private text: Phaser.GameObjects.Text;
  private config: Required<TimerDisplayConfig>;
  private currentSeconds: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: TimerDisplayConfig = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.container = scene.add.container(x, y);

    this.background = scene.add.circle(0, 0, this.config.radius, this.config.backgroundColor);

    this.text = scene.add.text(0, 0, '', {
      fontSize: this.config.fontSize,
      color: this.config.textColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container.add([this.background, this.text]);
    this.container.setVisible(false);
  }

  update(seconds: number): void {
    this.currentSeconds = seconds;
    this.text.setText(seconds.toString());
    this.container.setVisible(true);

    // Update color based on urgency
    if (seconds <= this.config.dangerThreshold && seconds > 0) {
      this.background.setFillStyle(this.config.dangerColor);
      // Pulse animation for urgency
      this.scene.tweens.add({
        targets: this.container,
        scale: { from: 1, to: 1.1 },
        duration: 150,
        yoyo: true,
      });
    } else if (seconds <= this.config.warningThreshold) {
      this.background.setFillStyle(this.config.warningColor);
    } else {
      this.background.setFillStyle(this.config.backgroundColor);
    }
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  addToContainer(parent: Phaser.GameObjects.Container): void {
    parent.add(this.container);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy();
  }
}
