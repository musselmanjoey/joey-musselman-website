import * as Phaser from 'phaser';
import { emotes, characters } from '../assets/AssetRegistry';

type Direction = 'down' | 'left' | 'right' | 'up';

// Map direction to crown texture key
const CROWN_TEXTURES: Record<Direction, string> = {
  down: 'crown-front',
  up: 'crown-back',
  left: 'crown-side',
  right: 'crown-side',
};

export class RemotePlayer extends Phaser.GameObjects.Container {
  private sprite?: Phaser.GameObjects.Sprite;
  private emoji?: Phaser.GameObjects.Text;
  private nameTag: Phaser.GameObjects.Text;
  private crown?: Phaser.GameObjects.Image;
  private emoteText?: Phaser.GameObjects.Text;
  private chatBubble?: Phaser.GameObjects.Container;
  private targetX: number;
  private targetY: number;
  private moveSpeed: number = 200;
  private spriteKey: string | null = null;
  private currentDirection: Direction = 'down';
  private isMoving: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    character: string,
    isVIP: boolean = false
  ) {
    super(scene, x, y);

    this.targetX = x;
    this.targetY = y;

    // Character can be either:
    // - A sprite key directly (e.g., 'clown-white', 'clown-blue')
    // - An emoji for legacy support (e.g., '🤡')
    if (character.startsWith('clown-') || character === 'penguin-blue' || character === 'green-cap') {
      // Direct sprite key
      this.spriteKey = character;
    } else {
      // Legacy: look up sprite key from emoji
      const charConfig = Object.entries(characters).find(
        ([, config]) => config.emoji === character
      );
      this.spriteKey = charConfig?.[1].spriteKey || null;
    }

    // Crown only for Colin
    if (name === 'Colin' && scene.textures.exists('crown-front')) {
      this.crown = scene.add.image(0, -35, 'crown-front');
      this.crown.setOrigin(0.5, 0.5);
      this.crown.setScale(0.48);
    }

    // Create sprite or fallback to emoji
    if (this.spriteKey && scene.textures.exists(this.spriteKey)) {
      this.sprite = scene.add.sprite(0, 0, this.spriteKey);
      this.sprite.setOrigin(0.5, 0.5);
      // Scale sprites to reasonable display size
      if (this.spriteKey?.startsWith('clown-')) {
        this.sprite.setScale(0.4); // 256 * 0.4 = ~100px (all clown color variants)
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

    // Crown Y is already set correctly above

    // Name tag
    let nameTagY = 35;
    if (this.sprite) {
      if (this.spriteKey?.startsWith('clown-')) {
        nameTagY = 58;
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

    const children: Phaser.GameObjects.GameObject[] = [];
    if (this.sprite) children.push(this.sprite);
    if (this.emoji) children.push(this.emoji);
    if (this.crown) children.push(this.crown);
    children.push(this.nameTag);
    this.add(children);

    scene.add.existing(this);
    this.setDepth(y);
  }

  private getDirection(dx: number, dy: number): Direction {
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

    if (this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey);
    }

    // Update crown texture based on direction
    this.updateCrownDirection(direction);
  }

  private updateCrownDirection(direction: Direction) {
    if (!this.crown) return;

    const textureKey = CROWN_TEXTURES[direction];
    if (this.crown.texture.key !== textureKey) {
      this.crown.setTexture(textureKey);
    }

    // Crown positioning values
    const baseY = -35;
    const sideOffsetX = 7;
    const sideOffsetY = 3;

    if (direction === 'left') {
      this.crown.setX(sideOffsetX);
      this.crown.setY(baseY + sideOffsetY);
      this.crown.setFlipX(true);
    } else if (direction === 'right') {
      this.crown.setX(-sideOffsetX);
      this.crown.setY(baseY + sideOffsetY);
      this.crown.setFlipX(false);
    } else {
      this.crown.setX(0);
      this.crown.setY(baseY);
      this.crown.setFlipX(false);
    }
  }

  moveToPoint(x: number, y: number) {
    const dx = x - this.targetX;
    const dy = y - this.targetY;

    // Update direction based on movement
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this.currentDirection = this.getDirection(dx, dy);
      this.isMoving = true;
      this.playAnimation(this.currentDirection, true);
    }

    // Fallback: flip emoji for left/right
    if (this.emoji) {
      if (dx < -5) {
        this.emoji.setScale(-1, 1);
      } else if (dx > 5) {
        this.emoji.setScale(1, 1);
      }
    }

    this.targetX = x;
    this.targetY = y;
  }

  showEmote(emoteId: string) {
    const emoteEmoji = emotes[emoteId] || '❓';

    if (this.emoteText) {
      this.emoteText.destroy();
    }

    const emoteY = this.sprite ? -50 : -50;
    this.emoteText = this.scene.add.text(0, emoteY, emoteEmoji, {
      fontSize: '32px',
    });
    this.emoteText.setOrigin(0.5);
    this.add(this.emoteText);

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
    if (this.chatBubble) {
      this.chatBubble.destroy();
    }

    const bubbleY = this.sprite ? -70 : -60;
    this.chatBubble = this.scene.add.container(0, bubbleY);

    const text = this.scene.add.text(0, 0, message, {
      fontSize: '14px',
      color: '#000000',
      wordWrap: { width: 120 },
      align: 'center',
    });
    text.setOrigin(0.5);

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

    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(0, text.height / 2 + padding, -6, text.height / 2 + padding + 8, 6, text.height / 2 + padding + 8);

    this.chatBubble.add([bg, text]);
    this.add(this.chatBubble);

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
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Move at constant speed (same as local Player)
    if (distance > 5) {
      const speed = this.moveSpeed * (delta / 1000);
      const moveX = (dx / distance) * Math.min(speed, distance);
      const moveY = (dy / distance) * Math.min(speed, distance);

      this.x += moveX;
      this.y += moveY;
    } else {
      this.x = this.targetX;
      this.y = this.targetY;

      // Stopped moving - play idle
      if (this.isMoving) {
        this.isMoving = false;
        this.playAnimation(this.currentDirection, false);
      }
    }

    // Update depth for layering
    this.setDepth(this.y);
  }
}
