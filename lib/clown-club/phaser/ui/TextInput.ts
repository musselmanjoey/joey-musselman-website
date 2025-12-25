import * as Phaser from 'phaser';

/**
 * TextInput - Reusable text input component for Phaser scenes
 *
 * Creates a styled textarea DOM element with configurable styling.
 * Usage:
 *   const input = new TextInput(scene, x, y, {
 *     width: 720,
 *     height: 100,
 *     placeholder: 'Type your answer...',
 *     maxLength: 200,
 *   });
 *   input.addToContainer(container);
 *   const value = input.getValue();
 *   input.clear();
 */

export interface TextInputConfig {
  width?: number;
  height?: number;
  placeholder?: string;
  maxLength?: number;
  fontSize?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  backgroundColor?: string;
  textColor?: string;
  id?: string;
}

const DEFAULT_CONFIG: Required<TextInputConfig> = {
  width: 720,
  height: 100,
  placeholder: 'Type your answer...',
  maxLength: 200,
  fontSize: '20px',
  borderColor: '#dc2626',
  borderWidth: 3,
  borderRadius: 16,
  padding: 16,
  backgroundColor: '#ffffff',
  textColor: '#171717',
  id: 'text-input',
};

export class TextInput {
  private scene: Phaser.Scene;
  private domElement: Phaser.GameObjects.DOMElement;
  private config: Required<TextInputConfig>;
  private textareaId: string;

  constructor(scene: Phaser.Scene, x: number, y: number, config: TextInputConfig = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.textareaId = this.config.id + '-' + Date.now();

    const html = this.createHTML();
    this.domElement = scene.add.dom(x, y).createFromHTML(html);
  }

  private createHTML(): string {
    const c = this.config;
    return `
      <textarea
        id="${this.textareaId}"
        placeholder="${c.placeholder}"
        maxlength="${c.maxLength}"
        style="
          width: ${c.width}px;
          height: ${c.height}px;
          padding: ${c.padding}px;
          font-size: ${c.fontSize};
          border-radius: ${c.borderRadius}px;
          border: ${c.borderWidth}px solid ${c.borderColor};
          background: ${c.backgroundColor};
          color: ${c.textColor};
          resize: none;
          outline: none;
          font-family: inherit;
          -webkit-appearance: none;
          box-sizing: border-box;
        "
      ></textarea>
    `;
  }

  getValue(): string {
    const textarea = document.getElementById(this.textareaId) as HTMLTextAreaElement;
    return textarea?.value.trim() || '';
  }

  setValue(value: string): void {
    const textarea = document.getElementById(this.textareaId) as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = value;
    }
  }

  clear(): void {
    this.setValue('');
  }

  focus(): void {
    const textarea = document.getElementById(this.textareaId) as HTMLTextAreaElement;
    textarea?.focus();
  }

  blur(): void {
    const textarea = document.getElementById(this.textareaId) as HTMLTextAreaElement;
    textarea?.blur();
  }

  setVisible(visible: boolean): void {
    this.domElement.setVisible(visible);
  }

  setEnabled(enabled: boolean): void {
    const textarea = document.getElementById(this.textareaId) as HTMLTextAreaElement;
    if (textarea) {
      textarea.disabled = !enabled;
    }
  }

  addToContainer(container: Phaser.GameObjects.Container): void {
    container.add(this.domElement);
  }

  getDOMElement(): Phaser.GameObjects.DOMElement {
    return this.domElement;
  }

  destroy(): void {
    this.domElement.destroy();
  }
}
