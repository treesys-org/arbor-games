
/**
 * PLATFORMER.JS
 * Side-scrolling planetary exploration mode.
 */
import { SeededRandom, rectIntersect, Sprites } from './utils.js';

export class PlatformerEngine {
    constructor(game) {
        this.game = game;
        this.player = { 
            x: 100, y: 0, w: 24, h: 32, 
            vx: 0, vy: 0, 
            grounded: false, 
            health: 100, maxHealth: 100,
            ammo: 0,
            facing: 1 // 1 = right, -1 = left
        };
        this.camera = { x: 0, y: 0 };
        this.tiles = [];
        this.npcs = [];
        this.enemies = [];
        this.projectiles = [];
        this.levelWidth = 0;
        this.tileSize = 32;
        this.gravity = 0.5;
        this.lessonData = null;
        this.ui = {
            layer: document.getElementById('ui-planet'),
            dialogueBox: document.getElementById('dialogue-box'),
            dialogueText: document.getElementById('dialogue-text'),
            dialogueSpeaker: document.getElementById('dialogue-speaker'),
            healthFill: document.getElementById('health-fill'),
            ammoDisplay: document.getElementById('ammo-display'),
            deathScreen: document.getElementById('death-screen')
        };
        
        this.sprites = {
            hero: Sprites.astronaut('#fff'),
            martian: Sprites.alien('#22c55e'),
            elder: Sprites.alien('#facc15'),
            enemy: Sprites.enemy()
        };

        this.dialogueQueue = [];
        this.activeDialogue = null;
    }

    // Generate Level based on planet data
    async loadLevel(planet) {
        this.ui.layer.classList.remove('hidden');
        this.ui.deathScreen.classList.add('hidden');
        this.planet = planet;
        
        // Reset Player State
        this.player.x = 100; this.player.y = 0; 
        this.player.vx = 0; this.player.vy = 0; 
        this.player.health = 100;
        this.player.ammo = 0; 
        this.projectiles = [];
        this.updateHUD();
        
        // Fetch lesson text
        try {
            const data = await window.Arbor.content.getAt(planet.data.index);
            // Split text into chunks for NPCs
            const sentences = data.text.replace(/<[^>]*>/g, '').split('. ').filter(s => s.length > 10);
            this.lessonData = { title: data.title, chunks: sentences };
        } catch(e) {
            this.lessonData = { title: "Unknown", chunks: ["Data corrupted.", "Survive."] };
        }

        // Generate Terrain
        const rng = new SeededRandom(planet.data.title);
        this.tiles = [];
        this.npcs = [];
        this.enemies = [];
        this.levelWidth = 3000;
        
        const groundY = 15; // In tiles
        let height = groundY;
        
        for (let x = 0; x < this.levelWidth / this.tileSize; x++) {
            // Perlin-ish height
            if(rng.next() > 0.7) height += rng.pick([-1, 0, 1]);
            height = Math.max(10, Math.min(20, height)); // Clamp

            // Floor
            for (let y = height; y < 25; y++) {
                this.tiles.push({ x: x*this.tileSize, y: y*this.tileSize, w: this.tileSize, h: this.tileSize, type: 'ground' });
            }

            // Platforms
            if (x > 5 && x < (this.levelWidth/this.tileSize)-5 && rng.next() > 0.8) {
                const py = height - rng.range(3, 5);
                this.tiles.push({ x: x*this.tileSize, y: py*this.tileSize, w: this.tileSize, h: this.tileSize, type: 'plat' });
            }

            // Populate
            if (x > 10 && rng.next() > 0.9) {
                // Determine NPC vs Enemy
                if (rng.next() > 0.4) {
                    const chunk = this.lessonData.chunks[this.npcs.length % this.lessonData.chunks.length] || "Beware the Swarm.";
                    this.npcs.push({ 
                        x: x*this.tileSize, y: (height-1)*this.tileSize - 24, w: 24, h: 24, 
                        text: chunk, 
                        type: 'scholar' 
                    });
                } else {
                    this.enemies.push({
                        x: x*this.tileSize, y: (height-3)*this.tileSize, w: 24, h: 24,
                        vx: rng.pick([-2, 2]), vy: 0, type: 'blob'
                    });
                }
            }
        }

        // Elder at end
        this.npcs.push({
            x: this.levelWidth - 200, y: 0, w: 24, h: 24, 
            text: "Knowledge Acquired. Establishing Uplink...",
            type: 'elder'
        });
        // Ensure floor under elder
        const endX = Math.floor((this.levelWidth - 200)/this.tileSize);
        this.tiles.push({ x: endX*this.tileSize, y: (height)*this.tileSize, w: this.tileSize*3, h: this.tileSize, type: 'ground' });
        this.npcs[this.npcs.length-1].y = (height-1)*this.tileSize - 24;
    }

    update() {
        if (this.player.health <= 0) {
            if (this.game.input.consume('r')) this.loadLevel(this.planet);
            return;
        }

        // Dialogue Handling
        if (this.activeDialogue) {
            if (this.game.input.consume(' ')) {
                this.activeDialogue = null;
                this.ui.dialogueBox.style.display = 'none';
                
                // If it was Elder, level complete
                if (this.interactingNPC && this.interactingNPC.type === 'elder') {
                    this.planet.visited = true;
                    this.game.switchMode('space');
                    if(window.Arbor && window.Arbor.game) window.Arbor.game.addXP(100);
                }
            }
            return; // Pause game during dialogue
        }

        // Input & Physics
        if (this.game.input.keys['ArrowLeft'] || this.game.input.keys['a']) {
            this.player.vx -= 1;
            this.player.facing = -1;
        }
        if (this.game.input.keys['ArrowRight'] || this.game.input.keys['d']) {
            this.player.vx += 1;
            this.player.facing = 1;
        }
        if ((this.game.input.keys['ArrowUp'] || this.game.input.keys['w'] || this.game.input.keys[' ']) && this.player.grounded) {
            this.player.vy = -12;
            this.player.grounded = false;
        }

        // Shooting
        if (this.game.input.consume('z')) {
            this.shoot();
        }

        this.player.vy += this.gravity;
        this.player.vx *= 0.8; // Friction

        // Move X
        this.player.x += this.player.vx;
        this.checkCol(true);
        
        // Move Y
        this.player.y += this.player.vy;
        this.player.grounded = false;
        this.checkCol(false);

        // Bounds
        if (this.player.y > 1000) this.damage(20); 
        if (this.player.x < 0) this.player.x = 0;

        // Camera
        this.camera.x += (this.player.x - this.game.width/3 - this.camera.x) * 0.1;
        this.camera.y += (this.player.y - this.game.height/2 - this.camera.y) * 0.1;

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.life--;
            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Projectile vs Enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (rectIntersect({x: p.x, y: p.y, w: p.w, h: p.h}, e)) {
                    // Kill Enemy
                    this.enemies.splice(j, 1);
                    this.projectiles.splice(i, 1);
                    this.game.spawnParticle(e.x, e.y, '#ef4444');
                    this.game.spawnParticle(e.x, e.y, '#fff');
                    break;
                }
            }
        }

        // Enemies
        this.enemies.forEach(e => {
            e.x += e.vx;
            // Simple bounce AI
            if(Math.random()<0.01) e.vx *= -1;
            
            // Collision with Player
            if (rectIntersect(this.player, e)) {
                this.damage(10);
                e.x += (e.x > this.player.x ? 20 : -20); // Knockback enemy
                this.player.vx += (e.x > this.player.x ? -10 : 10); // Knockback player
            }
        });

        // NPCs
        let nearby = null;
        this.npcs.forEach(n => {
            if (Math.abs(this.player.x - n.x) < 50 && Math.abs(this.player.y - n.y) < 50) {
                nearby = n;
            }
        });

        if (nearby && this.game.input.consume('ArrowUp')) {
            this.interactingNPC = nearby;
            
            // Reload Ammo if Scholar
            if (nearby.type === 'scholar') {
                this.player.ammo += 5;
                this.updateHUD();
                this.game.spawnParticle(this.player.x, this.player.y, '#facc15');
            }

            this.showDialogue(nearby.type.toUpperCase(), nearby.text);
        }
    }

    shoot() {
        if (this.player.ammo > 0) {
            this.player.ammo--;
            this.updateHUD();
            this.projectiles.push({
                x: this.player.x + (this.player.facing === 1 ? 24 : -10),
                y: this.player.y + 16,
                w: 10, h: 4,
                vx: this.player.facing * 12,
                life: 60,
                color: '#facc15'
            });
            // Recoil
            this.player.vx -= this.player.facing * 2;
        } else {
            // Dry fire
            this.game.spawnParticle(this.player.x, this.player.y, '#555');
        }
    }

    damage(amount) {
        this.player.health -= amount;
        this.updateHUD();
        this.game.shake(10);
        if (this.player.health <= 0) {
            this.ui.deathScreen.classList.remove('hidden');
        }
    }

    updateHUD() {
        this.ui.healthFill.style.width = `${this.player.health}%`;
        this.ui.ammoDisplay.innerText = `DATA AMMO: ${this.player.ammo}`;
    }

    checkCol(isX) {
        for(let t of this.tiles) {
            if (Math.abs(t.x - this.player.x) > 50 || Math.abs(t.y - this.player.y) > 50) continue;

            if (rectIntersect(this.player, t)) {
                if (isX) {
                    if (this.player.vx > 0) this.player.x = t.x - this.player.w;
                    else if (this.player.vx < 0) this.player.x = t.x + t.w;
                    this.player.vx = 0;
                } else {
                    if (this.player.vy > 0) { // Landing
                        this.player.y = t.y - this.player.h;
                        this.player.grounded = true;
                    } else if (this.player.vy < 0) { // Hitting head
                        this.player.y = t.y + t.h;
                    }
                    this.player.vy = 0;
                }
            }
        }
    }

    showDialogue(speaker, text) {
        this.activeDialogue = text;
        this.ui.dialogueBox.style.display = 'block';
        this.ui.dialogueSpeaker.innerText = speaker;
        this.ui.dialogueText.innerText = text;
        
        if (speaker === 'SCHOLAR') {
            this.ui.dialogueText.innerHTML += " <br><span style='color:#facc15'>[+5 AMMO]</span>";
        }
    }

    draw(ctx) {
        // Sky
        const grad = ctx.createLinearGradient(0, 0, 0, this.game.height);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,this.game.width, this.game.height);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // Tiles
        ctx.fillStyle = this.planet.data.color || '#475569';
        this.tiles.forEach(t => {
            if (t.x + t.w < this.camera.x || t.x > this.camera.x + this.game.width) return;
            ctx.fillRect(t.x, t.y, t.w, t.h);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(t.x+2, t.y+2, t.w-4, t.h-4);
            ctx.fillStyle = this.planet.data.color || '#475569';
        });

        // NPCs
        this.npcs.forEach(n => {
            ctx.drawImage(n.type === 'elder' ? this.sprites.elder : this.sprites.martian, n.x, n.y);
            if (Math.abs(this.player.x - n.x) < 50) {
                ctx.fillStyle = '#fff'; ctx.font = '10px monospace';
                const label = n.type === 'scholar' ? "[UP] RELOAD" : "[UP] TALK";
                ctx.fillText(label, n.x - 10, n.y - 10);
            }
        });

        // Enemies
        this.enemies.forEach(e => ctx.drawImage(this.sprites.enemy, e.x, e.y));

        // Projectiles
        ctx.fillStyle = '#facc15';
        this.projectiles.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

        // Player
        ctx.save();
        ctx.translate(this.player.x + this.player.w/2, this.player.y + this.player.h/2);
        ctx.scale(this.player.facing, 1);
        ctx.drawImage(this.sprites.hero, -this.player.w/2, -this.player.h/2);
        ctx.restore();

        ctx.restore();
    }
}
