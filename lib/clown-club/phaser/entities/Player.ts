import * as Phaser from 'phaser';
import { emotes } from '../assets/AssetRegistry';

export class Player extends Phaser.GameObjects.Container {
  private emoji: Phaser.GameObjects.Text;
  private nameTag: Phaser.GameObjects.Text;
  private crown?: Phaser.GameObjects.Text;
  private emoteText?: Phaser.GameObjects.Text;
  private chatBubble?: Phaser.GameObjects.Container;
  private targetX?: number;
  private targetY?: number;
  private moveSpeed: number = 200;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    character: string,
    isVIP: boolean = false
  ) {
    super(scene, x, y);

    // Crown for VIP players (above character)
    if (isVIP) {
      this.crown = scene.add.text(0, -30, '👑', {
        fontSize: '24px',
      });
      this.crown.setOrigin(0.5);
    }

    // Character emoji (use the emoji directly, fallback to clown)
    this.emoji = scene.add.text(0, 0, character || '🤡', {
      fontSize: '48px',
    });
    this.emoji.setOrigin(0.5);

    // Name tag
    this.nameTag = scene.add.text(0, 35, name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    });
    this.nameTag.setOrigin(0.5);

    // Add all elements to container
    const children: Phaser.GameObjects.GameObject[] = [this.emoji, this.nameTag];
    if (this.crown) children.unshift(this.crown);
    this.add(children);

    scene.add.existing(this);

    // Set depth based on Y for proper layering
    this.setDepth(y);
  }

  moveToPoint(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  showEmote(emoteId: string) {
    const emoteEmoji = emotes[emoteId] || '❓';

    // Remove existing emote
    if (this.emoteText) {
      this.emoteText.destroy();
    }

    // Show emote above character
    this.emoteText = this.scene.add.text(0, -50, emoteEmoji, {
      fontSize: '32px',
    });
    this.emoteText.setOrigin(0.5);
    this.add(this.emoteText);

    // Fade out and remove
    this.scene.tweens.add({
      targets: this.emoteText,
      alpha: 0,
      y: -80,
      duration: 2000,
      onComplete: () => {
        this.emoteText?.destroy();
        this.emoteText = undefined;
      },
    });
  }

  showChatBubble(message: string) {
    // Remove existing bubble
    if (this.chatBubble) {
      this.chatBubble.destroy();
    }

    // Create bubble container
    this.chatBubble = this.scene.add.container(0, -60);

    // Bubble text
    const text = this.scene.add.text(0, 0, message, {
      fontSize: '14px',
      color: '#000000',
      wordWrap: { width: 120 },
      align: 'center',
    });
    text.setOrigin(0.5);

    // Bubble background
    const padding = 8;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(
      -text.width / 2 - padding,
      -text.height / 2 - padding,
      text.width + padding * 2,
      text.height + padding * 2,
      8
    );
    bg.lineStyle(2, 0x000000, 0.3);
    bg.strokeRoundedRect(
      -text.width / 2 - padding,
      -text.height / 2 - padding,
      text.width + padding * 2,
      text.height + padding * 2,
      8
    );

    // Bubble tail
    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(0, text.height / 2 + padding, -6, text.height / 2 + padding + 8, 6, text.height / 2 + padding + 8);

    this.chatBubble.add([bg, text]);
    this.add(this.chatBubble);

    // Fade out after 4 seconds
    this.scene.tweens.add({
      targets: this.chatBubble,
      alpha: 0,
      delay: 4000,
      duration: 500,
      onComplete: () => {
        this.chatBubble?.destroy();
        this.chatBubble = undefined;
      },
    });
  }

  update(delta: number) {
    if (this.targetX === undefined || this.targetY === undefined) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      const speed = this.moveSpeed * (delta / 1000);
      const moveX = (dx / distance) * Math.min(speed, distance);
      const moveY = (dy / distance) * Math.min(speed, distance);

      this.x += moveX;
      this.y += moveY;

      // Flip character based on direction
      if (dx < -5) {
        this.emoji.setScale(-1, 1);
      } else if (dx > 5) {
        this.emoji.setScale(1, 1);
      }

      // Update depth for layering
      this.setDepth(this.y);
    } else {
      // Arrived at destination
      this.targetX = undefined;
      this.targetY = undefined;
    }
  }
}
