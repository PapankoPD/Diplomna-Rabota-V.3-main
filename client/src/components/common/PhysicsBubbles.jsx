import React, { useRef, useEffect, useCallback } from 'react';

const BUBBLE_COUNT = 12;
const MOUSE_RADIUS = 120;
const MOUSE_FORCE = 0.8;
const FRICTION = 0.98;
const BOUNCE = 0.6;

const createBubble = (w, h) => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 30 + Math.random() * 80,
    vx: 0,
    vy: 0,
    opacity: 0.04 + Math.random() * 0.06,
});

export const PhysicsBubbles = () => {
    const canvasRef = useRef(null);
    const bubblesRef = useRef([]);
    const mouseRef = useRef({ x: -9999, y: -9999 });
    const rafRef = useRef(null);

    const init = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.width = canvas.parentElement.clientWidth;
        const h = canvas.height = canvas.parentElement.clientHeight;
        bubblesRef.current = Array.from({ length: BUBBLE_COUNT }, () => createBubble(w, h));
    }, []);

    useEffect(() => {
        init();

        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        };

        const handleMouseMove = (e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -9999, y: -9999 };
        };

        const handleTouchMove = (e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            mouseRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        };

        const parent = canvasRef.current?.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            parent.addEventListener('mouseleave', handleMouseLeave);
            parent.addEventListener('touchmove', handleTouchMove, { passive: true });
        }
        window.addEventListener('resize', handleResize);

        const animate = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            const mouse = mouseRef.current;

            ctx.clearRect(0, 0, w, h);

            bubblesRef.current.forEach((b) => {
                // Mouse repulsion
                const dx = b.x - mouse.x;
                const dy = b.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = MOUSE_RADIUS + b.r;

                if (dist < minDist && dist > 0) {
                    const force = (minDist - dist) / minDist * MOUSE_FORCE;
                    b.vx += (dx / dist) * force;
                    b.vy += (dy / dist) * force;
                }

                // Bubble-bubble collision
                bubblesRef.current.forEach((other) => {
                    if (other === b) return;
                    const ddx = b.x - other.x;
                    const ddy = b.y - other.y;
                    const dd = Math.sqrt(ddx * ddx + ddy * ddy);
                    const minD = b.r + other.r;
                    if (dd < minD && dd > 0) {
                        const overlap = (minD - dd) * 0.3;
                        const nx = ddx / dd;
                        const ny = ddy / dd;
                        b.vx += nx * overlap * 0.05;
                        b.vy += ny * overlap * 0.05;
                    }
                });

                // Apply friction so bubbles settle back to rest
                b.vx *= FRICTION;
                b.vy *= FRICTION;
                b.x += b.vx;
                b.y += b.vy;

                // Wall bounce
                if (b.x - b.r < 0) { b.x = b.r; b.vx *= -BOUNCE; }
                if (b.x + b.r > w) { b.x = w - b.r; b.vx *= -BOUNCE; }
                if (b.y - b.r < 0) { b.y = b.r; b.vy *= -BOUNCE; }
                if (b.y + b.r > h) { b.y = h - b.r; b.vy *= -BOUNCE; }

                // Draw
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
                ctx.fill();
            });

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', handleResize);
            if (parent) {
                parent.removeEventListener('mousemove', handleMouseMove);
                parent.removeEventListener('mouseleave', handleMouseLeave);
                parent.removeEventListener('touchmove', handleTouchMove);
            }
        };
    }, [init]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
};
