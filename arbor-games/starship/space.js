
/**
 * SPACE.JS
 * Top-down spaceship exploration.
 */
import { SeededRandom } from './utils.js';

export class SpaceEngine {
    constructor(game) {
        this.game = game;
        this.ship = { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI/2, fuel: 100 };
        this.camera = { x: 0, y: 0 };
        this.systems = []; // Clusters of planets
        this.stars = [];
        this.activePlanet = null; // Planet currently hovering
        this.input = game.input;
        
        this.ui = {
            layer: document.getElementById('ui-space'),
            vel: document.getElementById('hud-vel'),
            sector: document.getElementById('sector-name'),
            prompt: document.getElementById('landing-prompt'),
            planetName: document.getElementById('target-planet')
        };

        this.initStars();
    }

    initStars() {
        for(let i=0; i<500; i++) {
            this.stars.push({
                x: (Math.random()-0.5) * 8000,
                y: (Math.random()-0.5) * 8000,
                size: Math.random() * 2,
                alpha: Math.random()
            });
        }
    }

    generateGalaxy(lessons) {
        this.systems = [];
        // Group lessons into solar systems (3-5 planets per system)
        let chunkIndex = 0;
        const chunkSize = 4;
        
        for (let i = 0; i < lessons.length; i += chunkSize) {
            const chunk = lessons.slice(i, i + chunkSize);
            const sysX = (chunkIndex % 3) * 3000;
            const sysY = Math.floor(chunkIndex / 3) * 3000;
            
            const system = {
                name: `SYSTEM-${String.fromCharCode(65+chunkIndex)}`,
                x: sysX, y: sysY,
                planets: []
            };

            const rng = new SeededRandom(system.name);

            chunk.forEach((l, idx) => {
                const dist = 300 + (idx * 200);
                const angle = rng.range(0, Math.PI * 2);
                
                system.planets.push({
                    data: l, // Full lesson data
                    x: sysX + Math.cos(angle) * dist,
                    y: sysY + Math.sin(angle) * dist,
                    radius: rng.range(60, 100),
                    color: `hsl(${rng.range(0, 360)}, 70%, 50%)`,
                    type: rng.pick(['gas', 'terran', 'ice', 'lava']),
                    orbitSpeed: rng.range(0.0005, 0.002) * (idx%2===0?1:-1),
                    angle: angle,
                    dist: dist
                });
            });

            this.systems.push(system);
            chunkIndex++;
        }
    }

    update() {
        // Ship Physics
        const thrust = 0.2;
        const turn = 0.06;
        
        if (this.input.keys['ArrowUp'] || this.input.keys['w']) {
            this.ship.vx += Math.cos(this.ship.angle) * thrust;
            this.ship.vy += Math.sin(this.ship.angle) * thrust;
            // Particle trail
            if(Math.random()>.5) this.game.spawnParticle(this.ship.x, this.ship.y, '#f59e0b');
        }
        if (this.input.keys['ArrowLeft'] || this.input.keys['a']) this.ship.angle -= turn;
        if (this.input.keys['ArrowRight'] || this.input.keys['d']) this.ship.angle += turn;

        // Friction
        this.ship.vx *= 0.98;
        this.ship.vy *= 0.98;
        this.ship.x += this.ship.vx;
        this.ship.y += this.ship.vy;

        // Camera
        this.camera.x += (this.ship.x - this.game.width/2 - this.camera.x) * 0.1;
        this.camera.y += (this.ship.y - this.game.height/2 - this.camera.y) * 0.1;

        // Planet Interaction
        this.checkProximity();

        // Orbit logic
        this.systems.forEach(sys => {
            sys.planets.forEach(p => {
                p.angle += p.orbitSpeed;
                p.x = sys.x + Math.cos(p.angle) * p.dist;
                p.y = sys.y + Math.sin(p.angle) * p.dist;
            });
        });

        // UI Updates
        const speed = Math.sqrt(this.ship.vx**2 + this.ship.vy**2).toFixed(1);
        this.ui.vel.innerText = `${speed} m/s`;
    }

    checkProximity() {
        let nearest = null;
        let dist = Infinity;

        this.systems.forEach(sys => {
            sys.planets.forEach(p => {
                const d = Math.hypot(this.ship.x - p.x, this.ship.y - p.y);
                if (d < p.radius + 150) { // Orbit range
                    if (d < dist) { dist = d; nearest = p; }
                }
            });
        });

        if (nearest !== this.activePlanet) {
            this.activePlanet = nearest;
            if (nearest) {
                this.ui.prompt.style.display = 'block';
                this.ui.planetName.innerText = nearest.data.title;
                this.ui.sector.innerText = "ORBITAL RANGE";
            } else {
                this.ui.prompt.style.display = 'none';
                this.ui.sector.innerText = "DEEP SPACE";
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,this.game.width, this.game.height);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // Stars
        ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            if(s.x > this.camera.x && s.x < this.camera.x + this.game.width && s.y > this.camera.y && s.y < this.camera.y + this.game.height) {
                ctx.globalAlpha = s.alpha;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        // Systems
        this.systems.forEach(sys => {
            // Sun
            const sunGrad = ctx.createRadialGradient(sys.x, sys.y, 10, sys.x, sys.y, 300);
            sunGrad.addColorStop(0, '#fbbf24');
            sunGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = sunGrad;
            ctx.beginPath(); ctx.arc(sys.x, sys.y, 300, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.fillText(sys.name, sys.x, sys.y);

            // Orbit Lines
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            sys.planets.forEach(p => {
                ctx.beginPath(); ctx.arc(sys.x, sys.y, p.dist, 0, Math.PI*2); ctx.stroke();
            });

            // Planets
            sys.planets.forEach(p => {
                // Atmosphere
                ctx.shadowBlur = 20; ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;

                // Detail
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath(); ctx.arc(p.x - 10, p.y - 10, p.radius*0.8, 0, Math.PI*2); ctx.fill();

                // Checkmark if visited
                if (p.visited) {
                    ctx.fillStyle = '#22c55e';
                    ctx.font = '20px monospace';
                    ctx.fillText("✓", p.x, p.y);
                }
            });
        });

        // Ship
        ctx.translate(this.ship.x, this.ship.y);
        ctx.rotate(this.ship.angle);
        
        ctx.fillStyle = '#38bdf8'; // Cockpit
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-10, 8); ctx.lineTo(-10, -8); ctx.fill();
        ctx.fillStyle = '#cbd5e1'; // Wings
        ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-15, 15); ctx.lineTo(-5, -5); ctx.lineTo(-15, -15); ctx.fill();
        
        // Thruster
        if (this.input.keys['ArrowUp'] || this.input.keys['w']) {
            ctx.fillStyle = `rgba(245, 158, 11, ${Math.random()})`;
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-25 - Math.random()*10, 0); ctx.stroke();
        }

        ctx.restore();
    }
}
