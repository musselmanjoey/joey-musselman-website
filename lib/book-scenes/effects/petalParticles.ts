export interface PetalConfig {
  density: number;
  speed: number;
  opacity: number;
  colors: string[];      // Array of petal colors
  size: number;
  drift: number;
  rotation: boolean;     // Whether petals rotate as they fall
}

interface Petal {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedY: number;
  speedX: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
}

const defaultConfig: PetalConfig = {
  density: 25,
  speed: 0.5,
  opacity: 0.8,
  colors: ['#FFB7C5', '#FFFFFF', '#FFF0F5'],  // Pink, white, lavender blush
  size: 6,
  drift: 1.5,
  rotation: true,
};

export function createPetalEffect(
  canvas: HTMLCanvasElement,
  userConfig: Partial<PetalConfig> = {}
): () => void {
  const config = { ...defaultConfig, ...userConfig };
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx;

  let animationId: number;
  let petals: Petal[] = [];

  function randomColor(): string {
    return config.colors[Math.floor(Math.random() * config.colors.length)];
  }

  function initPetals() {
    petals = [];
    for (let i = 0; i < config.density; i++) {
      petals.push(createPetal(true));
    }
  }

  function createPetal(randomY: boolean = false): Petal {
    return {
      x: Math.random() * canvas.width,
      y: randomY ? Math.random() * canvas.height : -20,
      size: config.size * (0.5 + Math.random() * 1),
      opacity: config.opacity * (0.5 + Math.random() * 0.5),
      speedY: config.speed * (0.3 + Math.random() * 0.7),
      speedX: (Math.random() - 0.5) * config.drift,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      color: randomColor(),
    };
  }

  function update() {
    petals.forEach((p) => {
      // Gentle floating motion with wobble
      p.wobbleOffset += p.wobbleSpeed;
      p.x += p.speedX + Math.sin(p.wobbleOffset) * 0.8;
      p.y += p.speedY + Math.cos(p.wobbleOffset) * 0.3;

      if (config.rotation) {
        p.rotation += p.rotationSpeed;
      }

      // Reset petal when it goes off screen
      if (p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
        Object.assign(p, createPetal(false));
        p.y = -20;
      }
    });
  }

  function drawPetal(p: Petal) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;

    // Draw an oval petal shape
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // Add subtle highlight
    ctx.beginPath();
    ctx.ellipse(-p.size * 0.1, -p.size * 0.2, p.size * 0.2, p.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach(drawPetal);
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
    initPetals();
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
