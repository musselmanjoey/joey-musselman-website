export interface WaterDripConfig {
  frequency: number;     // How often drips spawn (ms)
  speed: number;         // Fall speed
  opacity: number;
  color: string;
  maxDrips: number;      // Max concurrent drips
  minSize: number;
  maxSize: number;
}

interface Drip {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  stretch: number;       // Vertical stretch as it falls
  active: boolean;
}

const defaultConfig: WaterDripConfig = {
  frequency: 400,
  speed: 6,
  opacity: 0.6,
  color: '#88CCDD',
  maxDrips: 8,
  minSize: 2,
  maxSize: 4,
};

export function createWaterDripEffect(
  canvas: HTMLCanvasElement,
  userConfig: Partial<WaterDripConfig> = {}
): () => void {
  const config = { ...defaultConfig, ...userConfig };
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx;

  let animationId: number;
  let drips: Drip[] = [];
  let lastSpawnTime = 0;

  function createDrip(): Drip {
    return {
      x: Math.random() * canvas.width,
      y: 0,
      size: config.minSize + Math.random() * (config.maxSize - config.minSize),
      speed: config.speed * (0.7 + Math.random() * 0.6),
      opacity: config.opacity * (0.6 + Math.random() * 0.4),
      stretch: 1,
      active: true,
    };
  }

  function update(timestamp: number) {
    // Spawn new drips
    if (timestamp - lastSpawnTime > config.frequency && drips.filter(d => d.active).length < config.maxDrips) {
      drips.push(createDrip());
      lastSpawnTime = timestamp;
    }

    // Update drips
    drips.forEach((drip) => {
      if (!drip.active) return;

      // Accelerate slightly as it falls (gravity)
      drip.speed += 0.15;
      drip.y += drip.speed;

      // Stretch the drip as it falls faster
      drip.stretch = Math.min(3, 1 + drip.speed * 0.05);

      // Deactivate when off screen
      if (drip.y > canvas.height + 20) {
        drip.active = false;
      }
    });

    // Clean up
    drips = drips.filter((drip) => drip.active);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drips.forEach((drip) => {
      if (!drip.active) return;

      ctx.save();
      ctx.translate(drip.x, drip.y);

      // Draw elongated water drop shape
      ctx.beginPath();
      ctx.ellipse(0, 0, drip.size, drip.size * drip.stretch, 0, 0, Math.PI * 2);

      // Gradient for water look
      const gradient = ctx.createRadialGradient(
        -drip.size * 0.3, -drip.size * 0.3, 0,
        0, 0, drip.size * drip.stretch
      );
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.3, config.color);
      gradient.addColorStop(1, 'rgba(100, 150, 180, 0.3)');

      ctx.fillStyle = gradient;
      ctx.globalAlpha = drip.opacity;
      ctx.fill();

      ctx.restore();
    });

    ctx.globalAlpha = 1;
  }

  function animate(timestamp: number) {
    update(timestamp);
    draw();
    animationId = requestAnimationFrame(animate);
  }

  function handleResize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  // Initialize
  handleResize();
  window.addEventListener('resize', handleResize);
  animationId = requestAnimationFrame(animate);

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
  };
}
