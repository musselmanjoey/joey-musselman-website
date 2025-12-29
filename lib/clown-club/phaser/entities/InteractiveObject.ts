import * as Phaser from 'phaser';

export class InteractiveObject extends Phaser.GameObjects.Container {
  public objectId: string;
  private emoji: Phaser.GameObjects.Text;
  private highlightCircle: Phaser.GameObjects.Arc;
  private hitWidth: number;
  private hitHeight: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    emojiChar: string,
    objectId: string,
    width: number = 60,
    height: number = 60
  ) {
    super(scene, x, y);

    this.objectId = objectId;
    this.hitWidth = width;
    this.hitHeight = height;

    // Highlight circle (hidden by default) - scale to fit object
    const radius = Math.max(width, height) / 2;
    this.highlightCircle = scene.add.circle(0, 0, radius, 0xffff00, 0.3);
    this.highlightCircle.setVisible(false);

    // Object emoji
    this.emoji = scene.add.text(0, 0, emojiChar, {
      fontSize: '48px',
    });
    this.emoji.setOrigin(0.5);

    this.add([this.highlightCircle, this.emoji]);
    scene.add.existing(this);

    // Set depth based on Y
    this.setDepth(y);

    // Make interactive with custom size
    this.setSize(width, height);
    this.setInteractive();
  }

  highlight() {
    if (!this.scene) return;

    this.highlightCircle.setVisible(true);

    // Pulse animation
    this.scene.tweens.add({
      targets: this.highlightCircle,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.highlightCircle.setScale(1);
        this.highlightCircle.setAlpha(0.3);
        this.highlightCircle.setVisible(false);
      },
    });
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.hitWidth / 2,
      this.y - this.hitHeight / 2,
      this.hitWidth,
      this.hitHeight
    );
  }
}
