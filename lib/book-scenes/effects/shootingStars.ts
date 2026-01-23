export interface ShootingStarConfig {
  frequency: number;       // How often new stars spawn (ms)
  speed: number;           // Base speed
  trailLength: number;     // Length of the trail
  starColor: string;       // Main star color
  trailColor: string;      // Trail color
  glowColor: string;       // Glow effect color
  maxStars: number;        // Max concurrent stars
  minSize: number;
  maxSize: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  opacity: number;
  trail: { x: number; y: number; opacity: number }[];
  active: boolean;
  maxY: number;
  fadingOut: boolean;
}

const defaultConfig: ShootingStarConfig = {
  frequency: 800,
  speed: 8,
  trailLength: 20,
  starColor: '#FFFFFF',
  trailColor: '#E6E6FA',
  glowColor: '#B8A9E8',
  maxStars: 5,
  minSize: 2,
  maxSize: 4,
};

export function createShootingStarEffect(
  canvas: HTMLCanvasElement,
  userConfig: Partial<ShootingStarConfig> = {}
): () => void {
  const config = { ...defaultConfig, ...userConfig };
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return () => {};
  const ctx = maybeCtx;

  let animationId: number;
  let stars: Star[] = [];
  let lastSpawnTime = 0;

  function createStar(): Star {
    // Stars only in top 1/3 of screen (sky area)
    const skyHeight = canvas.height * 0.33;

    // All stars travel RIGHT to LEFT (matching the image)
    // Start from right side of screen
    const x = canvas.width * 0.5 + Math.random() * canvas.width * 0.5;
    const y = Math.random() * skyHeight * 0.5;

    // Angle: traveling left and down at ~35 degrees below horizontal
    // In canvas: y increases downward, so we need angle where cos<0 (left) and sin>0 (down)
    // That's 90-180 degrees. For 35° below horizontal going left: 180 - 35 = 145 degrees
    const baseAngle = (145 * Math.PI / 180); // 145 degrees
    const angle = baseAngle + (Math.random() - 0.5) * 0.15; // Small variation

    return {
      x,
      y,
      size: config.minSize + Math.random() * (config.maxSize - config.minSize),
      speed: config.speed * (0.7 + Math.random() * 0.6),
      angle,
      opacity: 0.8 + Math.random() * 0.2,
      trail: [],
      active: true,
      maxY: skyHeight,
      fadingOut: false,
    };
  }

  function update(timestamp: number) {
    // Spawn new stars
    if (timestamp - lastSpawnTime > config.frequency && stars.filter(s => s.active).length < config.maxStars) {
      stars.push(createStar());
      lastSpawnTime = timestamp;
    }

    // Update all stars (including fading ones)
    stars.forEach((star) => {
      if (star.active) {
        // Add current position to trail
        star.trail.unshift({ x: star.x, y: star.y, opacity: star.opacity });

        // Trim trail to max length
        if (star.trail.length > config.trailLength) {
          star.trail.pop();
        }

        // Move star
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;

        // Deactivate if off screen or past sky boundary
        if (star.x < -50 || star.x > canvas.width + 50 || star.y > star.maxY) {
          star.active = false;
          star.fadingOut = true;
        }
      }

      // Handle fading out (runs for inactive stars)
      if (star.fadingOut && star.trail.length > 0) {
        // Remove 2 trail points per frame for fast fade (~0.2s)
        star.trail.pop();
        star.trail.pop();
      }

      // Update trail opacity
      star.trail.forEach((point, i) => {
        point.opacity = star.opacity * (1 - i / config.trailLength);
      });
    });

    // Clean up fully faded stars
    stars = stars.filter((star) => star.active || star.trail.length > 0);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach((star) => {
      // Draw trail (only points within sky boundary)
      star.trail.forEach((point, i) => {
        if (point.y > star.maxY) return;

        const trailSize = star.size * (1 - i / config.trailLength * 0.7);
        const alpha = point.opacity * 0.6;

        ctx.beginPath();
        ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
        ctx.fillStyle = config.trailColor;
        ctx.globalAlpha = alpha;
        ctx.fill();
      });

      if (star.active) {
        // Draw glow
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 4
        );
        gradient.addColorStop(0, config.glowColor);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = star.opacity * 0.4;
        ctx.fill();

        // Draw star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = config.starColor;
        ctx.globalAlpha = star.opacity;
        ctx.fill();
      }
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
