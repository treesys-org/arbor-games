
/**
 * GAME.JS
 * Orchestrator
 */
import { SpaceEngine } from './space.js';
import { PlatformerEngine } from './platformer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.input = {
            keys: {},
            consume: (k) => {
                if (this.input.keys[k]) { this.input.keys[k] = false; return true; }
                return false;
            }
        };

        this.particles = [];
        this.mode = 'prologue'; // prologue, space, planet
        this.shakeTimer = 0;

        // Engines
        this.space = new SpaceEngine(this);
        this.planet = new PlatformerEngine(this);

        this.initInput();
        this.startSequence();
        
        window.addEventListener('resize', () => {
            this.width = window.innerWidth; this.height = window.innerHeight;
            this.canvas.width = this.width; this.canvas.height = this.height;
        });

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    initInput() {
        window.addEventListener('keydown', e => {
            this.input.keys[e.key] = true;
            this.input.keys[e.key.toLowerCase()] = true; // Handle Z vs z
        });
        window.addEventListener('keyup', e => {
            this.input.keys[e.key] = false;
            this.input.keys[e.key.toLowerCase()] = false;
        });
        
        // Prologue Button
        document.getElementById('btn-start').onclick = () => {
            document.getElementById('prologue-screen').classList.add('hidden');
            this.switchMode('space');
        };
    }

    async startSequence() {
        // Wait for Arbor Bridge or Timeout
        let attempts = 0;
        const check = setInterval(async () => {
            if (window.Arbor || attempts > 20) {
                clearInterval(check);
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('prologue-screen').classList.remove('hidden');
                
                // Load Content
                const list = window.Arbor ? window.Arbor.content.getList() : this.mockLessons();
                this.space.generateGalaxy(list);
            }
            attempts++;
        }, 200);
    }

    mockLessons() {
        return Array.from({length: 12}, (_, i) => ({ id: i, title: `Lesson ${i+1}: Foundations`, text: "This is a mock lesson text. Martians love knowledge." }));
    }

    switchMode(mode) {
        this.mode = mode;
        if (mode === 'space') {
            document.getElementById('ui-space').classList.remove('hidden');
            document.getElementById('ui-planet').classList.add('hidden');
        } else if (mode === 'planet') {
            document.getElementById('ui-space').classList.add('hidden');
            document.getElementById('ui-planet').classList.remove('hidden');
            this.planet.loadLevel(this.space.activePlanet);
        }
    }

    spawnParticle(x, y, color) {
        this.particles.push({x, y, color, life: 1.0, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2});
    }

    shake(amount) {
        this.shakeTimer = amount;
    }

    loop() {
        // Logic
        if (this.mode === 'space') {
            this.space.update();
            if (this.space.activePlanet && this.input.consume(' ')) {
                this.switchMode('planet');
            }
        } else if (this.mode === 'planet') {
            this.planet.update();
        }

        // Particles
        this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.05; });
        this.particles = this.particles.filter(p => p.life > 0);

        // Render
        this.ctx.save();
        
        // Screenshake
        if (this.shakeTimer > 0) {
            const mag = this.shakeTimer;
            this.ctx.translate((Math.random()-0.5)*mag, (Math.random()-0.5)*mag);
            this.shakeTimer *= 0.9;
            if(this.shakeTimer < 0.5) this.shakeTimer = 0;
        }

        if (this.mode === 'space') this.space.draw(this.ctx);
        else if (this.mode === 'planet') this.planet.draw(this.ctx);

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 3, 3);
        });
        this.ctx.globalAlpha = 1;

        this.ctx.restore();
        requestAnimationFrame(this.loop);
    }
}

new Game();
