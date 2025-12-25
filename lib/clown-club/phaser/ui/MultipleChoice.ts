import * as Phaser from 'phaser';

/**
 * MultipleChoice - Reusable multiple choice component for Phaser scenes
 *
 * Creates a set of tappable option buttons optimized for mobile.
 * Supports single and multi-select modes.
 *
 * Usage:
 *   const mc = new MultipleChoice(scene, 0, 0, {
 *     options: [
 *       { id: 'a', text: 'Option A' },
 *       { id: 'b', text: 'Option B' },
 *     ],
 *     onSelect: (optionId) => console.log('Selected:', optionId),
 *   });
 *   mc.addToContainer(container);
 */

export interface ChoiceOption {
  id: string;
  text: string;
}

export interface MultipleChoiceConfig {
  options: ChoiceOption[];
  onSelect: (optionId: string) => void;
  width?: number;
  height?: number;
  spacing?: number;
  fontSize?: string;
  backgroundColor?: number;
  selectedColor?: number;
  borderColor?: number;
  borderWidth?: number;
  textColor?: string;
  selectedTextColor?: string;
  showLabels?: boolean; // Show A, B, C, D labels
  multiSelect?: boolean;
  disabled?: boolean;
}

const DEFAULT_CONFIG = {
  width: 700,
  height: 60,
  spacing: 12,
  fontSize: '20px',
  backgroundColor: 0xf3f4f6,
  selectedColor: 0x22c55e,
  borderColor: 0xe5e7eb,
  borderWidth: 3,
  textColor: '#171717',
  selectedTextColor: '#ffffff',
  showLabels: true,
  multiSelect: false,
  disabled: false,
};

export class MultipleChoice {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: Required<MultipleChoiceConfig>;
  private optionContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private optionBackgrounds: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private optionTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private selectedIds: Set<string> = new Set();

  constructor(scene: Phaser.Scene, x: number, y: number, config: MultipleChoiceConfig) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<MultipleChoiceConfig>;
    this.container = scene.add.container(x, y);
    this.createOptions();
  }

  private createOptions(): void {
    const { options, width, height, spacing, showLabels, fontSize, textColor, backgroundColor, borderColor, borderWidth } = this.config;

    options.forEach((option, index) => {
      const y = index * (height + spacing);
      const optContainer = this.scene.add.container(0, y);

      // Background
      const bg = this.scene.add.rectangle(0, 0, width, height, backgroundColor);
      bg.setStrokeStyle(borderWidth, borderColor);
      bg.setInteractive({ useHandCursor: true });

      // Label (A, B, C, D)
      let displayText = option.text;
      if (showLabels) {
        const label = String.fromCharCode(65 + index); // A, B, C, D...
        displayText = `${label}. ${option.text}`;
      }

      const text = this.scene.add.text(0, 0, displayText, {
        fontSize,
        color: textColor,
        fontStyle: 'bold',
        wordWrap: { width: width - 40 },
        align: 'center',
      }).setOrigin(0.5);

      optContainer.add([bg, text]);
      this.container.add(optContainer);

      this.optionContainers.set(option.id, optContainer);
      this.optionBackgrounds.set(option.id, bg);
      this.optionTexts.set(option.id, text);

      // Event handlers
      bg.on('pointerover', () => {
        if (!this.config.disabled && !this.selectedIds.has(option.id)) {
          bg.setStrokeStyle(borderWidth + 1, 0xdc2626);
        }
      });

      bg.on('pointerout', () => {
        if (!this.config.disabled && !this.selectedIds.has(option.id)) {
          bg.setStrokeStyle(borderWidth, borderColor);
        }
      });

      bg.on('pointerdown', () => {
        if (this.config.disabled) return;
        this.selectOption(option.id);
      });
    });
  }

  private selectOption(optionId: string): void {
    const bg = this.optionBackgrounds.get(optionId);
    const text = this.optionTexts.get(optionId);

    if (!bg || !text) return;

    if (this.config.multiSelect) {
      // Toggle selection
      if (this.selectedIds.has(optionId)) {
        this.selectedIds.delete(optionId);
        bg.setFillStyle(this.config.backgroundColor);
        text.setColor(this.config.textColor);
      } else {
        this.selectedIds.add(optionId);
        bg.setFillStyle(this.config.selectedColor);
        text.setColor(this.config.selectedTextColor);
      }
    } else {
      // Single select - deselect others first
      this.selectedIds.forEach(id => {
        const prevBg = this.optionBackgrounds.get(id);
        const prevText = this.optionTexts.get(id);
        if (prevBg) prevBg.setFillStyle(this.config.backgroundColor);
        if (prevText) prevText.setColor(this.config.textColor);
      });
      this.selectedIds.clear();

      this.selectedIds.add(optionId);
      bg.setFillStyle(this.config.selectedColor);
      text.setColor(this.config.selectedTextColor);

      // Animate selection
      this.scene.tweens.add({
        targets: bg,
        scaleX: 0.98,
        scaleY: 0.98,
        duration: 100,
        yoyo: true,
      });
    }

    this.config.onSelect(optionId);
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  getSelectedId(): string | null {
    return this.selectedIds.size > 0 ? Array.from(this.selectedIds)[0] : null;
  }

  setDisabled(disabled: boolean): void {
    this.config.disabled = disabled;
    this.optionBackgrounds.forEach((bg) => {
      if (disabled) {
        bg.disableInteractive();
        bg.setAlpha(0.6);
      } else {
        bg.setInteractive({ useHandCursor: true });
        bg.setAlpha(1);
      }
    });
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

  reset(): void {
    this.selectedIds.clear();
    this.optionBackgrounds.forEach((bg) => {
      bg.setFillStyle(this.config.backgroundColor);
    });
    this.optionTexts.forEach((text) => {
      text.setColor(this.config.textColor);
    });
  }

  highlightCorrect(correctId: string): void {
    const bg = this.optionBackgrounds.get(correctId);
    if (bg) {
      bg.setFillStyle(0x22c55e); // Green
      this.scene.tweens.add({
        targets: bg,
        alpha: { from: 1, to: 0.7 },
        duration: 300,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  highlightWrong(wrongId: string): void {
    const bg = this.optionBackgrounds.get(wrongId);
    if (bg) {
      bg.setFillStyle(0xef4444); // Red
      this.scene.tweens.add({
        targets: bg,
        alpha: { from: 1, to: 0.7 },
        duration: 300,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
