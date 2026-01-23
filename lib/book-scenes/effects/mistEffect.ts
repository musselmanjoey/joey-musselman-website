export interface MistConfig {
  density: number;        // Number of mist wisps
  speed: number;          // Horizontal drift speed
  opacity: number;        // Base opacity
  color: string;          // Mist color
  minSize: number;        // Min wisp size
  maxSize: number;        // Max wisp size
  layers: number;         // Number of depth layers (parallax effect)
}

interface MistWisp {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  layer: number;          // Depth layer (0 = back, higher = front)
}

const defaultConfig: MistConfig = {
  density: 15,
  speed: 0.3,
  opacity: 0.15,
  color: '#FFFFFF',
  minSize: 100,
  maxSize: 300,
  layers: 3,
};

export function createMistEffect(
  canvas: HTMLCanvasElement,
  userConfig: Partial<MistConfig> = {}
): () => void {
  const config = { ...defaultConfig, ...userConfig };
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx;

  let animationId: number;
  let wisps: MistWisp[] = [];

  function createWisp(randomX: boolean = true): MistWisp {
    const layer = Math.floor(Math.random() * config.layers);
    const layerScale = 0.5 + (layer / config.layers) * 0.5; // Back layers smaller/slower

    return {
      x: randomX ? Math.random() * canvas.width : -config.maxSize,
      y: canvas.height * 0.3 + Math.random() * canvas.height * 0.6, // Middle to bottom
      size: (config.minSize + Math.random() * (config.maxSize - config.minSize)) * layerScale,
      opacity: config.opacity * (0.5 + Math.random() * 0.5) * layerScale,
      speed: config.speed * (0.5 + Math.random() * 0.5) * layerScale,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.005 + Math.random() * 0.01,
      layer,
    };
  }

  function initWisps() {
    wisps = [];
    for (let i = 0; i < config.density; i++) {
      wisps.push(createWisp(true));
    }
    // Sort by layer so back layers render first
    wisps.sort((a, b) => a.layer - b.layer);
  }

  function update() {
    wisps.forEach((wisp) => {
      // Slow horizontal drift with gentle wobble
      wisp.wobbleOffset += wisp.wobbleSpeed;
      wisp.x += wisp.speed;
      wisp.y += Math.sin(wisp.wobbleOffset) * 0.2;

      // Reset when off screen
      if (wisp.x > canvas.width + wisp.size) {
        Object.assign(wisp, createWisp(false));
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    wisps.forEach((wisp) => {
      // Draw soft gradient circle for misty effect
      const gradient = ctx.createRadialGradient(
        wisp.x, wisp.y, 0,
        wisp.x, wisp.y, wisp.size
      );
      gradient.addColorStop(0, config.color);
      gradient.addColorStop(0.4, config.color);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, wisp.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = wisp.opacity;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  function animate() {
    update();
    draw();
    animationId = requestAnimationFrame(animate);
  }

  function handleResize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    initWisps();
  }

  // Initialize
  handleResize();
  window.addEventListener('resize', handleResize);
  animate();

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
  };
}
