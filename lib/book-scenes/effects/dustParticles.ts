export interface DustConfig {
  density: number;
  speed: number;
  opacity: number;
  color: string;
  size: number;
  drift: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedY: number;
  speedX: number;
  wobbleOffset: number;
  wobbleSpeed: number;
}

const defaultConfig: DustConfig = {
  density: 40,
  speed: 0.3,
  opacity: 0.6,
  color: '#FFE4B5',
  size: 3,
  drift: 0.5,
};

export function createDustEffect(
  canvas: HTMLCanvasElement,
  userConfig: Partial<DustConfig> = {}
): () => void {
  const config = { ...defaultConfig, ...userConfig };
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx; // TypeScript now knows this is non-null

  let animationId: number;
  let particles: Particle[] = [];

  function initParticles() {
    particles = [];
    for (let i = 0; i < config.density; i++) {
      particles.push(createParticle(true));
    }
  }

  function createParticle(randomY: boolean = false): Particle {
    return {
      x: Math.random() * canvas.width,
      y: randomY ? Math.random() * canvas.height : -10,
      size: config.size * (0.5 + Math.random() * 1),
      opacity: config.opacity * (0.3 + Math.random() * 0.7),
      speedY: config.speed * (0.2 + Math.random() * 0.8),
      speedX: (Math.random() - 0.5) * config.drift,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.02,
    };
  }

  function update() {
    particles.forEach((p) => {
      // Gentle downward drift with wobble
      p.wobbleOffset += p.wobbleSpeed;
      p.x += p.speedX + Math.sin(p.wobbleOffset) * 0.3;
      p.y += p.speedY;

      // Reset particle when it goes off screen
      if (p.y > canvas.height + 10 || p.x < -10 || p.x > canvas.width + 10) {
        Object.assign(p, createParticle(false));
        p.y = -10;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = config.color;
      ctx.globalAlpha = p.opacity;
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
    initParticles();
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
