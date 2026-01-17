
/**
 * GAME.JS
 * Orchestrator
 */
import { SpaceEngine } from './space.js';
import { PlatformerEngine } from './platformer.js';
import { InputManager } from './utils.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Shared Input Manager (Keyboard + Touch)
        this.input = new InputManager();

        this.particles = [];
        this.mode = 'prologue'; 
        this.shakeTimer = 0;

        // Engines
        this.space = new SpaceEngine(this);
        this.planet = new PlatformerEngine(this);

        this.initListeners();
        this.startSequence();
        
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    initListeners() {
        window.addEventListener('resize', () => {
            this.width = window.innerWidth; this.height = window.innerHeight;
            this.canvas.width = this.width; this.canvas.height = this.height;
            // Re-center joystick logic if needed
            this.space.resetJoystick();
        });

        document.getElementById('btn-start').onclick = () => {
            document.getElementById('prologue-screen').classList.add('hidden');
            this.switchMode('space');
        };

        document.getElementById('btn-respawn').onclick = () => {
            this.planet.loadLevel(this.space.activePlanet);
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
        this.input.reset(); // Clear keys to prevent stuck inputs
        
        if (mode === 'space') {
            document.getElementById('ui-space').classList.remove('hidden');
            document.getElementById('ui-planet').classList.add('hidden');
            this.space.resetJoystick();
        } else if (mode === 'planet') {
            document.getElementById('ui-space').classList.add('hidden');
            document.getElementById('ui-planet').classList.remove('hidden');
            this.planet.loadLevel(this.space.activePlanet);
        }
    }

    spawnParticle(x, y, color, speed = 1, size = 3) {
        this.particles.push({
            x, y, color, 
            life: 1.0, 
            vx: (Math.random()-0.5) * speed, 
            vy: (Math.random()-0.5) * speed,
            size: size
        });
    }

    shake(amount) {
        this.shakeTimer = amount;
    }

    loop() {
        // Update Logic
        if (this.mode === 'space') {
            this.space.update();
        } else if (this.mode === 'planet') {
            this.planet.update();
        }

        // Global Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

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
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        this.ctx.globalAlpha = 1;

        this.ctx.restore();
        requestAnimationFrame(this.loop);
    }
}

new Game();
