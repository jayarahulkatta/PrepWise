import { useRef, useEffect } from "react";

/**
 * ParticleCanvas — Full-screen animated particle network background.
 *
 * - Purple particles float slowly and bounce off edges
 * - Nearby particles are connected with lines
 * - Particles repel from mouse cursor within 200px radius
 * - Lines near the cursor turn white
 * - Canvas background is pure black (#000)
 * - Cleans up all listeners and animation frames on unmount
 */
export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];

    const mouse = {
      x: null,
      y: null,
      radius: 200,
    };

    // ─── Event handlers ──────────────────────────────────────────────────────
    const handleMouseMove = (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("resize", handleResize);

    // ─── Set initial size ────────────────────────────────────────────────────
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // ─── Particle class ──────────────────────────────────────────────────────
    class Particle {
      constructor(x, y, directionX, directionY, size, color) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      update() {
        // Bounce off edges
        if (this.x > canvas.width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        // Mouse repulsion
        if (mouse.x !== null && mouse.y !== null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius + this.size) {
            const fx = dx / distance;
            const fy = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= fx * force * 5;
            this.y -= fy * force * 5;
          }
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    // ─── Initialize particles ────────────────────────────────────────────────
    function init() {
      particles = [];
      let n = (canvas.height * canvas.width) / 9000;
      for (let i = 0; i < n; i++) {
        let size = Math.random() * 2 + 1;
        let x = Math.random() * (canvas.width - size * 4) + size * 2;
        let y = Math.random() * (canvas.height - size * 4) + size * 2;
        let dx = Math.random() * 0.4 - 0.2;
        let dy = Math.random() * 0.4 - 0.2;
        particles.push(
          new Particle(x, y, dx, dy, size, "rgba(191, 128, 255, 0.8)")
        );
      }
    }

    // ─── Connect nearby particles ────────────────────────────────────────────
    function connect() {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          let dist =
            (particles[a].x - particles[b].x) ** 2 +
            (particles[a].y - particles[b].y) ** 2;
          if (dist < (canvas.width / 7) * (canvas.height / 7)) {
            let opacity = 1 - dist / 20000;
            let dx = particles[a].x - mouse.x;
            let dy = particles[a].y - mouse.y;
            let mouseDist = Math.sqrt(dx * dx + dy * dy);
            ctx.strokeStyle =
              mouse.x && mouseDist < mouse.radius
                ? `rgba(255,255,255,${opacity})`
                : `rgba(200,150,255,${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    }

    // ─── Animation loop ──────────────────────────────────────────────────────
    function animate() {
      animationId = requestAnimationFrame(animate);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      connect();
    }

    init();
    animate();

    // ─── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        display: "block",
      }}
    />
  );
}
