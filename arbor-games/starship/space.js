


/**
 * SPACE.JS
 * Top-down spaceship exploration.
 */
import { SeededRandom, ArtGen } from './utils.js';

export class SpaceEngine {
    constructor(game) {
        this.game = game;
        this.ship = { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI/2 };
        this.camera = { x: 0, y: 0 };
        this.systems = []; 
        this.activePlanet = null; 
        this.input = game.input;
        
        // Joystick State
        this.stick = { active: false, dx: 0, dy: 0, originX: 0, originY: 0 };
        this.stickEl = document.getElementById('stick-knob');
        this.stickContainer = document.getElementById('stick-container');
        this.btnLand = document.getElementById('btn-land');

        this.ui = {
            vel: document.getElementById('hud-vel')
        };

        // Cache the background
        this.bgCanvas = ArtGen.createNebulaBackground(2000, 2000); // Fixed size tile

        this.initTouch();
    }

    initTouch() {
        const handleStart = (e) => {
            e.preventDefault();
            const touch = e.targetTouches[0];
            const rect = this.stickContainer.getBoundingClientRect();
            this.stick.originX = rect.left + rect.width / 2;
            this.stick.originY = rect.top + rect.height / 2;
            this.stick.active = true;
            this.updateStick(touch.clientX, touch.clientY);
        };

        const handleMove = (e) => {
            if (!this.stick.active) return;
            e.preventDefault();
            this.updateStick(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
        };

        const handleEnd = (e) => {
            e.preventDefault();
            this.stick.active = false;
            this.stick.dx = 0;
            this.stick.dy = 0;
            this.stickEl.style.transform = `translate(0px, 0px)`;
        };

        this.stickContainer.addEventListener('touchstart', handleStart);
        this.stickContainer.addEventListener('touchmove', handleMove);
        this.stickContainer.addEventListener('touchend', handleEnd);
        this.stickContainer.addEventListener('touchcancel', handleEnd);

        this.btnLand.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.input.setKey(' ', true); // Simulate SPACE bar
            if (this.activePlanet) this.game.switchMode('planet');
        });
        
        this.btnLand.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.input.setKey(' ', false);
        });
    }

    updateStick(x, y) {
        const maxDist = 40;
        let dx = x - this.stick.originX;
        let dy = y - this.stick.originY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        this.stick.dx = dx / maxDist; 
        this.stick.dy = dy / maxDist;
        this.stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    resetJoystick() {
        this.stick.active = false;
        this.stick.dx = 0;
        this.stick.dy = 0;
        if(this.stickEl) this.stickEl.style.transform = `translate(0px, 0px)`;
    }

    generateGalaxy(lessons) {
        this.systems = [];
        let chunkIndex = 0;
        const chunkSize = 4;
        
        for (let i = 0; i < lessons.length; i += chunkSize) {
            const chunk = lessons.slice(i, i + chunkSize);
            const sysX = (chunkIndex % 3) * 5000;
            const sysY = Math.floor(chunkIndex / 3) * 5000;
            
            const system = {
                name: `SECTOR ${String.fromCharCode(65+chunkIndex)}`,
                x: sysX, y: sysY,
                planets: []
            };

            const rng = new SeededRandom(system.name);

            chunk.forEach((l, idx) => {
                const dist = 600 + (idx * 400);
                const angle = rng.range(0, Math.PI * 2);
                const radius = rng.range(100, 180);
                const color = `hsl(${rng.range(0, 360)}, 70%, 50%)`;
                
                // Generate texture ONCE per planet
                const texture = ArtGen.createPlanetTexture(radius, color, system.name + idx);

                system.planets.push({
                    data: l, 
                    x: sysX + Math.cos(angle) * dist,
                    y: sysY + Math.sin(angle) * dist,
                    radius: radius,
                    texture: texture, // Cached Canvas
                    color: color,
                    orbitSpeed: rng.range(0.0002, 0.0008) * (idx%2===0?1:-1),
                    angle: angle,
                    dist: dist
                });
            });

            this.systems.push(system);
            chunkIndex++;
        }
    }

    update() {
        // Thrust Logic
        let thrust = 0;
        let turn = 0;

        if (this.input.keys['ArrowUp'] || this.input.keys['w']) thrust = 0.5;
        if (this.input.keys['ArrowLeft'] || this.input.keys['a']) turn = -0.05;
        if (this.input.keys['ArrowRight'] || this.input.keys['d']) turn = 0.05;

        if (this.stick.active) {
            const mag = Math.sqrt(this.stick.dx*this.stick.dx + this.stick.dy*this.stick.dy);
            if (mag > 0.2) {
                const targetAngle = Math.atan2(this.stick.dy, this.stick.dx);
                let diff = targetAngle - this.ship.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.ship.angle += diff * 0.1;
                thrust = Math.min(mag, 1.0) * 0.5;
            }
        }

        if (thrust > 0) {
            this.ship.vx += Math.cos(this.ship.angle) * thrust;
            this.ship.vy += Math.sin(this.ship.angle) * thrust;
            // Engine Trail Particles
            const bx = this.ship.x - Math.cos(this.ship.angle)*25;
            const by = this.ship.y - Math.sin(this.ship.angle)*25;
            this.game.spawnParticle(bx, by, '#3b82f6', 2, 6);
            this.game.spawnParticle(bx, by, '#fff', 2, 3);
        }

        this.ship.angle += turn;

        // Physics
        this.ship.vx *= 0.96;
        this.ship.vy *= 0.96;
        this.ship.x += this.ship.vx;
        this.ship.y += this.ship.vy;

        // Camera Follow
        this.camera.x += (this.ship.x - this.game.width/2 - this.camera.x) * 0.08;
        this.camera.y += (this.ship.y - this.game.height/2 - this.camera.y) * 0.08;

        // Planets Orbit
        this.checkProximity();
        this.systems.forEach(sys => {
            sys.planets.forEach(p => {
                p.angle += p.orbitSpeed;
                p.x = sys.x + Math.cos(p.angle) * p.dist;
                p.y = sys.y + Math.sin(p.angle) * p.dist;
            });
        });

        const speed = Math.sqrt(this.ship.vx**2 + this.ship.vy**2).toFixed(1);
        this.ui.vel.innerText = `${speed} km/s`;
    }

    checkProximity() {
        let nearest = null;
        let dist = Infinity;

        this.systems.forEach(sys => {
            sys.planets.forEach(p => {
                const d = Math.hypot(this.ship.x - p.x, this.ship.y - p.y);
                if (d < p.radius + 250) { 
                    if (d < dist) { dist = d; nearest = p; }
                }
            });
        });

        if (nearest !== this.activePlanet) {
            this.activePlanet = nearest;
        }

        if (this.activePlanet && this.input.consume(' ')) {
            this.game.switchMode('planet');
        }

        this.btnLand.style.display = this.activePlanet ? 'flex' : 'none';
        if (this.activePlanet) {
             this.btnLand.style.animation = 'pulse 1s infinite';
        }
    }

    draw(ctx) {
        // Draw Tiled Nebula Background (Parallax efficient)
        // We draw the cached canvas tiled based on camera pos
        const bgSize = 2000;
        const startX = Math.floor(this.camera.x / bgSize) * bgSize;
        const startY = Math.floor(this.camera.y / bgSize) * bgSize;

        for (let x = startX - bgSize; x < startX + bgSize*2; x += bgSize) {
            for (let y = startY - bgSize; y < startY + bgSize*2; y += bgSize) {
                ctx.drawImage(this.bgCanvas, x - this.camera.x * 0.5, y - this.camera.y * 0.5); // 0.5 parallax factor
            }
        }

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw Systems
        this.systems.forEach(sys => {
            // Sun with Glow (Reduced radius and opacity to avoid blinding)
            const sunGrad = ctx.createRadialGradient(sys.x, sys.y, 100, sys.x, sys.y, 600);
            sunGrad.addColorStop(0, 'rgba(253, 224, 71, 0.3)');
            sunGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.05)');
            sunGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = sunGrad;
            ctx.globalCompositeOperation = 'screen'; // Additive blending for light
            ctx.beginPath(); ctx.arc(sys.x, sys.y, 600, 0, Math.PI*2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            
            // Core Sun
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 50;
            ctx.beginPath(); ctx.arc(sys.x, sys.y, 80, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;

            // Sector Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 80px monospace';
            ctx.globalAlpha = 0.15;
            ctx.textAlign = 'center';
            ctx.fillText(sys.name, sys.x, sys.y);
            ctx.globalAlpha = 1;

            // Orbit Paths
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            sys.planets.forEach(p => {
                ctx.beginPath(); ctx.arc(sys.x, sys.y, p.dist, 0, Math.PI*2); ctx.stroke();
            });

            // Planets
            sys.planets.forEach(p => {
                const isActive = (p === this.activePlanet);
                
                // Draw Texture
                // Texture is radius*2 size. Draw centered.
                ctx.drawImage(p.texture, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);

                // Atmosphere Glow (Screen Blend)
                if (isActive) {
                    ctx.globalCompositeOperation = 'screen';
                    const glow = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, p.radius + 40);
                    glow.addColorStop(0, p.color);
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 40, 0, Math.PI*2); ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';

                    // Selection Ring
                    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
                    ctx.setLineDash([10, 10]);
                    const rot = Date.now() / 1000;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 30, rot, rot + Math.PI*2); ctx.stroke();
                    ctx.setLineDash([]);
                }
                
                // Shadow (Direction from System Center)
                // Calculate angle from sun
                const angToSun = Math.atan2(p.y - sys.y, p.x - sys.x);
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, angToSun - Math.PI/2, angToSun + Math.PI/2);
                ctx.fill();

                // UI Label
                if (isActive) {
                    ctx.fillStyle = '#22c55e';
                    ctx.font = 'bold 16px system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(p.data.title.toUpperCase(), p.x, p.y - p.radius - 30);
                    
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px monospace';
                    ctx.fillText("DATA FRAGMENT DETECTED", p.x, p.y - p.radius - 15);
                }
            });
        });

        this.drawShip(ctx);

        // Draw Landing Prompt near ship if active
        if (this.activePlanet) {
            ctx.save();
            ctx.translate(this.ship.x, this.ship.y);
            const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
            ctx.scale(scale, scale);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText("[SPACE] LAND", 0, -40);
            ctx.restore();
        }

        ctx.restore();
    }

    drawShip(ctx) {
        ctx.save();
        ctx.translate(this.ship.x, this.ship.y);
        ctx.rotate(this.ship.angle);
        
        // Wing Trails
        if (Math.abs(this.ship.vx) > 1) {
            ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(15, 10); ctx.lineTo(-40, 15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(15, -10); ctx.lineTo(-40, -15); ctx.stroke();
        }

        // Hull
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-12, 12);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-12, -12);
        ctx.closePath();
        ctx.fill();
        
        // Detail
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-12, -6, 4, 12);

        // Cockpit
        ctx.fillStyle = '#0ea5e9';
        ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-5, 5);
        ctx.lineTo(-5, -5);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Engine Fire
        if (this.input.keys['ArrowUp'] || this.input.keys['w'] || this.stick.active) {
            const flicker = Math.random() * 5;
            ctx.fillStyle = '#f59e0b';
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-25 - flicker, 0); ctx.lineTo(-10, 4); ctx.lineTo(-10, -4); ctx.fill();
            
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-18 - flicker, 0); ctx.lineTo(-10, 2); ctx.lineTo(-10, -2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }
}