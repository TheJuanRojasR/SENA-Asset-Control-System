import { useEffect, useRef } from 'react';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function DotField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && /jsdom/i.test(window.navigator.userAgent)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let rafId = null;

    const mouse = { x: -1000, y: -1000 };
    const SPACING = 28;
    const BASE_RADIUS = 1.4;
    const HOVER_RADIUS = 5;
    const INTERACTION_RADIUS = 140;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / SPACING);
      rows = Math.ceil(height / SPACING);
    };

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const onMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * SPACING + SPACING / 2;
          const y = row * SPACING + SPACING / 2;
          ctx.beginPath();
          ctx.arc(x, y, BASE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(128, 209, 159, 0.45)';
          ctx.fill();
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * SPACING + SPACING / 2;
          const y = row * SPACING + SPACING / 2;
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const factor = Math.max(0, 1 - dist / INTERACTION_RADIUS);

          const radius = BASE_RADIUS + (HOVER_RADIUS - BASE_RADIUS) * factor;
          const alpha = 0.35 + 0.55 * factor;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion()) {
      drawStatic();
    } else {
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseleave', onMouseLeave);
      draw();
    }

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />;
}
