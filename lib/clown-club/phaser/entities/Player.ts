import * as Phaser from 'phaser';
import { emotes, characters } from '../assets/AssetRegistry';

type Direction = 'down' | 'left' | 'right' | 'up';

export class Player extends Phaser.GameObjects.Container {
  private sprite?: Phaser.GameObjects.Sprite;
  private emoji?: Phaser.GameObjects.Text;
  private nameTag: Phaser.GameObjects.Text;
  private crown?: Phaser.GameObjects.Text;
  private emoteText?: Phaser.GameObjects.Text;
  private chatBubble?: Phaser.GameObjects.Container;
  private targetX?: number;
  private targetY?: number;
  private moveSpeed: number = 200;
  private spriteKey: string | null = null;
  private currentDirection: Direction = 'down';
  private isMoving: boolean = false;
  private walkBobPhase: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    character: string,
    isVIP: boolean = false
  ) {
    super(scene, x, y);

    // Look up sprite key from character type (e.g., 'penguin' -> 'penguin-blue')
    const charConfig = Object.entries(characters).find(
      ([, config]) => config.emoji === character
    );
    this.spriteKey = charConfig?.[1].spriteKey || null;

    // Crown for VIP players (above character) - positioned after we know sprite size
    if (isVIP) {
      this.crown = scene.add.text(0, -40, '👑', {
        fontSize: '24px',
      });
      this.crown.setOrigin(0.5);
    }

    // Will adjust crown position after sprite is created

    // Create sprite or fallback to emoji
    if (this.spriteKey && scene.textures.exists(this.spriteKey)) {
      this.sprite = scene.add.sprite(0, 0, this.spriteKey);
      this.sprite.setOrigin(0.5, 0.5);
      // Scale sprites to reasonable display size
      if (this.spriteKey === 'clown-spritesheet') {
        this.sprite.setScale(1.5); // 64 * 1.5 = 96px
      } else if (this.spriteKey === 'clown-white') {
        this.sprite.setScale(0.25); // 256 * 0.25 = 64px (old spritesheet)
      } else if (this.spriteKey === 'green-cap') {
        this.sprite.setScale(3); // 18 * 3 = 54px
      }
      this.sprite.play(`${this.spriteKey}-idle-down`);
    } else {
      // Fallback to emoji
      this.emoji = scene.add.text(0, 0, character || '🤡', {
        fontSize: '48px',
      });
      this.emoji.setOrigin(0.5);
    }

    // Adjust crown position for larger sprites
    if (this.crown && this.spriteKey === 'clown-spritesheet') {
      this.crown.setY(-55); // Above 96px sprite
    }

    // Name tag (positioned below sprite/emoji)
    // Adjust for scaled sprite size
    let nameTagY = 35;
    if (this.sprite) {
      if (this.spriteKey === 'clown-spritesheet') {
        nameTagY = 55; // 96px / 2 + some padding
      } else {
        nameTagY = 40;
      }
    }
    this.nameTag = scene.add.text(0, nameTagY, name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    });
    this.nameTag.setOrigin(0.5);

    // Add all elements to container
    const children: Phaser.GameObjects.GameObject[] = [];
    if (this.crown) children.push(this.crown);
    if (this.sprite) children.push(this.sprite);
    if (this.emoji) children.push(this.emoji);
    children.push(this.nameTag);
    this.add(children);

    scene.add.existing(this);

    // Set depth based on Y for proper layering
    this.setDepth(y);
  }

  moveToPoint(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  private getDirection(dx: number, dy: number): Direction {
    // Determine primary direction based on movement delta
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      return dx < 0 ? 'left' : 'right';
    } else {
      return dy < 0 ? 'up' : 'down';
    }
  }

  private playAnimation(direction: Direction, moving: boolean) {
    if (!this.sprite || !this.spriteKey) return;

    const animType = moving ? 'walk' : 'idle';
    const animKey = `${this.spriteKey}-${animType}-${direction}`;

    // Only change animation if different
    if (this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey);
    }
  }

  showEmote(emoteId: string) {
    const emoteEmoji = emotes[emoteId] || '❓';

    // Remove existing emote
    if (this.emoteText) {
      this.emoteText.destroy();
    }

    // Show emote above character
    const emoteY = this.sprite ? -50 : -50;
    this.emoteText = this.scene.add.text(0, emoteY, emoteEmoji, {
      fontSize: '32px',
    });
    this.emoteText.setOrigin(0.5);
    this.add(this.emoteText);

    // Fade out and remove
    this.scene.tweens.add({
      targets: this.emoteText,
      alpha: 0,
      y: emoteY - 30,
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
    const bubbleY = this.sprite ? -70 : -60;
    this.chatBubble = this.scene.add.container(0, bubbleY);

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
    if (this.targetX === undefined || this.targetY === undefined) {
      // Not moving - play idle animation and reset bob
      if (this.isMoving) {
        this.isMoving = false;
        this.playAnimation(this.currentDirection, false);
        if (this.sprite) this.sprite.y = 0; // Reset bob
      }
      return;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      const speed = this.moveSpeed * (delta / 1000);
      const moveX = (dx / distance) * Math.min(speed, distance);
      const moveY = (dy / distance) * Math.min(speed, distance);

      this.x += moveX;
      this.y += moveY;

      // Update direction and animation
      const newDirection = this.getDirection(dx, dy);
      if (newDirection !== this.currentDirection || !this.isMoving) {
        this.currentDirection = newDirection;
        this.isMoving = true;
        this.playAnimation(newDirection, true);
      }


      // Fallback: flip emoji for left/right (if no sprite)
      if (this.emoji) {
        if (dx < -5) {
          this.emoji.setScale(-1, 1);
        } else if (dx > 5) {
          this.emoji.setScale(1, 1);
        }
      }

      // Update depth for layering
      this.setDepth(this.y);
    } else {
      // Arrived at destination
      this.targetX = undefined;
      this.targetY = undefined;
      this.isMoving = false;
      this.playAnimation(this.currentDirection, false);
      if (this.sprite) this.sprite.y = 0; // Reset bob
    }
  }
}
