export interface SteamConfig {
  sourceX: number;        // X position (0-1, percentage of canvas width)
  sourceY: number;        // Y position (0-1, percentage of canvas height)
  sourceWidth: number;    // Width of emission area (pixels)
  density: number;        // Particles per batch
  frequency: number;      // Spawn frequency (ms)
  speed: number;          // Rise speed
  opacity: number;        // Starting opacity
  color: string;          // Steam color
  minSize: number;        // Starting size
  maxSize: number;        // Max size (grows as it rises)
  lifespan: number;       // How long particles live (ms)
  drift: number;          // Horizontal drift amount
  turbulence: number;     // Wispy turbulence strength
}

interface SteamParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  life: number;
  maxLife: number;
  driftOffset: number;
  driftSpeed: number;
  turbulenceOffset: number;
}

const defaultConfig: SteamConfig = {
  sourceX: 0.5,
  sourceY: 0.8,
  sourceWidth: 30,
  density: 3,
  frequency: 100,
  speed: 1.5,
  opacity: 0.4,
  color: '#FFFFFF',
  minSize: 8,
  maxSize: 40,
  lifespan: 4000,
  drift: 0.3,
  turbulence: 0.8,
};

export function createSteamEffect(
  canvas: HTMLCanvasElement,
  userConfig: Partial<SteamConfig> = {}
): () => void {
  const config = { ...defaultConfig, ...userConfig };
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx;

  let animationId: number;
  let particles: SteamParticle[] = [];
  let lastSpawnTime = 0;
  let canvasWidth = 0;
  let canvasHeight = 0;

  function createParticle(): SteamParticle {
    const sourceXPx = canvasWidth * config.sourceX;
    const sourceYPx = canvasHeight * config.sourceY;

    return {
      x: sourceXPx + (Math.random() - 0.5) * config.sourceWidth,
      y: sourceYPx,
      size: config.minSize,
      opacity: config.opacity * (0.7 + Math.random() * 0.3),
      speed: config.speed * (0.8 + Math.random() * 0.4),
      life: 0,
      maxLife: config.lifespan * (0.8 + Math.random() * 0.4),
      driftOffset: Math.random() * Math.PI * 2,
      driftSpeed: 0.02 + Math.random() * 0.02,
      turbulenceOffset: Math.random() * Math.PI * 2,
    };
  }

  function update(timestamp: number) {
    // Spawn new particles
    if (timestamp - lastSpawnTime > config.frequency) {
      for (let i = 0; i < config.density; i++) {
        particles.push(createParticle());
      }
      lastSpawnTime = timestamp;
    }

    // Update particles
    const deltaTime = 16; // Approximate frame time
    particles.forEach((p) => {
      p.life += deltaTime;

      // Rise upward
      p.y -= p.speed;

      // Horizontal drift (sine wave)
      p.driftOffset += p.driftSpeed;
      p.x += Math.sin(p.driftOffset) * config.drift;

      // Turbulence (additional wispy movement)
      p.turbulenceOffset += 0.03;
      p.x += Math.sin(p.turbulenceOffset * 2.5) * config.turbulence * 0.3;
      p.y += Math.cos(p.turbulenceOffset * 1.8) * config.turbulence * 0.1;

      // Grow as it rises
      const lifeRatio = p.life / p.maxLife;
      p.size = config.minSize + (config.maxSize - config.minSize) * lifeRatio;

      // Fade out as it rises
      p.opacity = config.opacity * (1 - lifeRatio) * (0.7 + Math.random() * 0.1);
    });

    // Remove dead particles
    particles = particles.filter((p) => p.life < p.maxLife);
  }

  function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    particles.forEach((p) => {
      if (p.opacity <= 0) return;

      // Soft gradient circle for wispy steam
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size
      );
      gradient.addColorStop(0, config.color);
      gradient.addColorStop(0.3, config.color);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  function animate(timestamp: number) {
    update(timestamp);
    draw();
    animationId = requestAnimationFrame(animate);
  }

  function handleResize() {
    const width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || window.innerWidth;
    const height = canvas.offsetHeight || canvas.parentElement?.offsetHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    canvasWidth = width;
    canvasHeight = height;
  }

  // Initialize with slight delay for layout
  requestAnimationFrame(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    animationId = requestAnimationFrame(animate);
  });

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
  };
}
