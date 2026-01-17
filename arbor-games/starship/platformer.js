

/**
 * PLATFORMER.JS
 * Side-scrolling planetary exploration mode.
 */
import { SeededRandom, rectIntersect, Sprites } from './utils.js';

export class PlatformerEngine {
    constructor(game) {
        this.game = game;
        this.player = { 
            x: 100, y: 0, w: 32, h: 48, 
            vx: 0, vy: 0, 
            grounded: false, 
            health: 100, maxHealth: 100,
            ammo: 0,
            facing: 1,
            animFrame: 0,
            state: 'idle' 
        };
        this.camera = { x: 0, y: 0 };
        this.zoom = 2.0; 
        
        this.tiles = [];
        this.npcs = [];
        this.enemies = [];
        this.projectiles = [];
        this.shipObj = null; 

        this.levelWidth = 0;
        this.tileSize = 48; 
        this.gravity = 0.8;
        this.friction = 0.85;
        this.speed = 1.5;
        this.jumpForce = -18;
        
        this.ui = {
            layer: document.getElementById('ui-planet'),
            dialogueBox: document.getElementById('dialogue-box'),
            dialogueText: document.getElementById('dialogue-text'),
            dialogueSpeaker: document.getElementById('dialogue-speaker'),
            healthFill: document.getElementById('health-fill'),
            ammoDisplay: document.getElementById('ammo-display'),
            deathScreen: document.getElementById('death-screen'),
            btnInteract: document.getElementById('btn-interact')
        };
        
        this.isLoading = false;
        this.bindTouchControls();

        this.dialogueQueue = [];
        this.activeDialogue = null;
        this.interactingNPC = null;
        
        // Default theme to prevent render errors before load
        this.theme = { ground: '#334155', sky: '#0f172a', bgMount: '#1e293b' };
    }

    bindTouchControls() {
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.input.keys[key] = true; el.style.opacity = '1'; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.game.input.keys[key] = false; el.style.opacity = '0.6'; });
        };
        bind('btn-left', 'ArrowLeft');
        bind('btn-right', 'ArrowRight');
        bind('btn-jump', 'ArrowUp'); 
        bind('btn-shoot', 'z');
        bind('btn-interact', 'ArrowUp'); 
    }

    loadLevel(planet) {
        this.ui.layer.classList.remove('hidden');
        this.ui.deathScreen.classList.add('hidden');
        this.planet = planet;
        this.isLoading = true; // BLOCK PHYSICS & RENDER
        
        // Setup Theme
        this.theme = {
            ground: planet.color,
            sky: '#0f172a',
            bgMount: '#1e293b'
        };
        
        // Async Data Fetch
        if (window.Arbor && window.Arbor.content) {
            window.Arbor.content.getAt(planet.data.index).then(data => {
                this.generateWorld(data);
            }).catch(e => {
                console.warn("Arbor Content Load Error", e);
                this.generateWorld({ title: planet.data.title, text: "Signal lost. Data fragments corrupted." });
            });
        } else {
            // Mock loading delay for visual feel
            setTimeout(() => {
                this.generateWorld({ title: planet.data.title, text: "Simulation Mode. No data uplink." });
            }, 1000);
        }
    }

    generateWorld(data) {
        const rng = new SeededRandom(data.title);
        
        // Process Text
        const cleanText = (data.text || "").replace(/<[^>]*>/g, '');
        const sentences = cleanText.split('. ').filter(s => s.length > 10);
        
        this.tiles = [];
        this.npcs = [];
        this.enemies = [];
        this.projectiles = [];
        this.levelWidth = 4000;
        
        const groundY = 12; 
        let height = groundY;
        let scholarCount = 0;

        // Generate Terrain & Entities
        for (let x = 0; x < this.levelWidth / this.tileSize; x++) {
            if(rng.next() > 0.6 && x > 5) height += rng.pick([-1, 0, 1]); 
            height = Math.max(8, Math.min(16, height));

            // Surface & Dirt
            for (let y = height; y < 20; y++) {
                const type = y === height ? 'surface' : 'deep';
                let deco = 0;
                if (type === 'surface' && rng.next() > 0.5) deco = rng.pick([1, 2]); // 1=grass, 2=rock
                
                this.tiles.push({ 
                    x: x*this.tileSize, y: y*this.tileSize, 
                    w: this.tileSize, h: this.tileSize, 
                    type: type,
                    deco: deco
                });
            }

            // Platforms
            if (x > 8 && x < (this.levelWidth/this.tileSize)-5 && rng.next() > 0.85) {
                const py = height - rng.range(3, 5);
                this.tiles.push({ x: x*this.tileSize, y: py*this.tileSize, w: this.tileSize, h: this.tileSize, type: 'plat' });
            }

            // Entities
            if (x > 8 && rng.next() > 0.85) {
                if (rng.next() > 0.5) {
                    // Scholar NPC - Assign text from lesson immediately
                    const text = sentences[scholarCount % sentences.length] || "Searching for data...";
                    this.npcs.push({ 
                        x: x*this.tileSize, y: (height-1)*this.tileSize - 48, w: 32, h: 48, 
                        text: text,
                        type: 'scholar' 
                    });
                    scholarCount++;
                } else {
                    this.enemies.push({
                        x: x*this.tileSize, y: (height-2)*this.tileSize, w: 32, h: 32,
                        vx: rng.pick([-2, 2]), vy: 0, type: 'blob'
                    });
                }
            }
        }

        // Setup End Object
        const endX = this.levelWidth - 300;
        this.npcs.push({ x: endX, y: height*this.tileSize - 64, w: 32, h: 64, text: "Data Secured. Launching...", type: 'elder' });
        this.tiles.push({ x: endX - 50, y: height*this.tileSize, w: 200, h: this.tileSize, type: 'surface' });

        this.shipObj = { 
            x: 50, 
            y: (groundY * this.tileSize) - 64 + 10, 
            w: 64, h: 64 
        };

        // Reset Player Physics
        this.player.x = 150; 
        this.player.y = (groundY * this.tileSize) - 100;
        this.player.vx = 0; 
        this.player.vy = 0; 
        this.player.health = 100;
        this.player.ammo = 0; 
        this.player.state = 'idle';
        this.player.grounded = false;
        
        // Force Camera Snap
        this.camera.x = this.player.x - (this.game.width / this.zoom / 2);
        this.camera.y = Math.min(this.player.y - (this.game.height / this.zoom / 2), 300);

        this.updateHUD();
        this.isLoading = false; // UNBLOCK
    }

    update() {
        if (this.isLoading) return; // SKIP LOGIC WHILE LOADING

        if (this.player.health <= 0) return;

        if (this.activeDialogue) {
            if (this.game.input.consume('ArrowUp') || this.game.input.consume(' ') || this.game.input.consume('Enter')) {
                this.activeDialogue = null;
                this.ui.dialogueBox.style.display = 'none';
                
                if (this.interactingNPC && this.interactingNPC.type === 'elder') {
                    this.game.switchMode('space');
                    if(window.Arbor && window.Arbor.game) window.Arbor.game.addXP(100);
                }
            }
            return; 
        }

        if (this.game.input.keys['ArrowLeft']) {
            this.player.vx -= this.speed;
            this.player.facing = -1;
            this.player.state = 'run';
            if (this.player.grounded && Math.random() > 0.8) this.game.spawnParticle(this.player.x + 16, this.player.y + 48, this.theme.ground, 1, 3);
        }
        else if (this.game.input.keys['ArrowRight']) {
            this.player.vx += this.speed;
            this.player.facing = 1;
            this.player.state = 'run';
            if (this.player.grounded && Math.random() > 0.8) this.game.spawnParticle(this.player.x + 16, this.player.y + 48, this.theme.ground, 1, 3);
        } else {
            this.player.state = 'idle';
        }

        if ((this.game.input.keys['ArrowUp'] || this.game.input.keys[' ']) && this.player.grounded) {
            this.player.vy = this.jumpForce;
            this.player.grounded = false;
            this.game.spawnParticle(this.player.x + 16, this.player.y + 48, '#fff', 3);
        }

        this.player.vx *= this.friction;
        this.player.vy += this.gravity;
        
        if(this.player.vy > 15) this.player.vy = 15;

        this.player.x += this.player.vx;
        this.checkCol(true);
        
        this.player.y += this.player.vy;
        this.player.grounded = false;
        this.checkCol(false);

        if (!this.player.grounded) this.player.state = 'jump';
        this.player.animFrame++;

        if (this.game.input.consume('z')) this.shoot();

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.life--;
            if (p.life <= 0) { this.projectiles.splice(i, 1); continue; }
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (rectIntersect({x: p.x, y: p.y, w: p.w, h: p.h}, e)) {
                    this.enemies.splice(j, 1);
                    this.projectiles.splice(i, 1);
                    this.game.spawnParticle(e.x, e.y, '#ef4444', 4, 6);
                    break;
                }
            }
        }

        const targetCamX = this.player.x - (this.game.width / this.zoom / 2);
        const targetCamY = this.player.y - (this.game.height / this.zoom / 2);
        
        // Y Clamping (Don't look underground)
        const clampedTargetY = Math.min(targetCamY, 300);

        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.y += (clampedTargetY - this.camera.y) * 0.1;

        let nearby = null;
        let isShip = false;

        this.npcs.forEach(n => {
            if (Math.abs(this.player.x - n.x) < 60 && Math.abs(this.player.y - n.y) < 60) nearby = n;
        });

        if (this.shipObj && Math.abs(this.player.x - this.shipObj.x) < 80 && Math.abs(this.player.y - this.shipObj.y) < 80) {
            nearby = { type: 'ship' };
            isShip = true;
        }

        this.ui.btnInteract.style.display = nearby ? 'flex' : 'none';
        
        if (nearby && (this.game.input.consume('ArrowUp'))) {
            if (isShip) {
                this.game.switchMode('space');
            } else {
                this.interactingNPC = nearby;
                if (nearby.type === 'scholar') {
                    this.player.ammo += 5;
                    this.updateHUD();
                }
                this.showDialogue(nearby.type.toUpperCase(), nearby.text);
            }
        }
        
        if (this.player.y > 2000) this.damage(100);
    }

    shoot() {
        if (this.player.ammo > 0) {
            this.player.ammo--;
            this.updateHUD();
            this.projectiles.push({
                x: this.player.x + (this.player.facing === 1 ? 32 : -10),
                y: this.player.y + 24,
                w: 12, h: 6,
                vx: this.player.facing * 15,
                life: 60,
                color: '#facc15'
            });
            this.player.vx -= this.player.facing * 3; 
        }
    }

    damage(amount) {
        this.player.health -= amount;
        this.updateHUD();
        this.game.shake(20);
        if (this.player.health <= 0) this.ui.deathScreen.classList.remove('hidden');
    }

    updateHUD() {
        this.ui.healthFill.style.width = `${Math.max(0, this.player.health)}%`;
        this.ui.ammoDisplay.innerText = `AMMO: ${this.player.ammo}`;
    }

    checkCol(isX) {
        for(let t of this.tiles) {
            if (Math.abs(t.x - this.player.x) > 100 || Math.abs(t.y - this.player.y) > 100) continue;
            if (rectIntersect(this.player, t)) {
                if (isX) {
                    if (this.player.vx > 0) this.player.x = t.x - this.player.w;
                    else if (this.player.vx < 0) this.player.x = t.x + t.w;
                    this.player.vx = 0;
                } else {
                    if (this.player.vy > 0) { 
                        this.player.y = t.y - this.player.h;
                        this.player.grounded = true;
                    } else if (this.player.vy < 0) {
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
    }

    drawParallax(ctx) {
        // Sky
        const grad = ctx.createLinearGradient(0, 0, 0, this.game.height);
        grad.addColorStop(0, this.theme.sky);
        grad.addColorStop(1, this.theme.bgMount);
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,this.game.width, this.game.height);
        
        // Stars in BG
        ctx.fillStyle = '#fff';
        for(let i=0; i<50; i++) {
             const px = (i * 123456) % this.game.width;
             const py = (i * 654321) % (this.game.height/2);
             ctx.globalAlpha = 0.5;
             ctx.beginPath(); ctx.arc(px, py, 1, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Distant Mountains (Move slow)
        const mountOffset = this.camera.x * 0.1; // Parallax Factor 0.1
        ctx.fillStyle = '#0f172a'; // Very dark blue
        ctx.beginPath();
        ctx.moveTo(0, this.game.height);
        for(let x=0; x<this.game.width + 50; x+=50) {
            const h = Math.abs(Math.sin((x + mountOffset) * 0.01)) * 100 + 100;
            ctx.lineTo(x, this.game.height - h);
        }
        ctx.lineTo(this.game.width, this.game.height);
        ctx.fill();

        // Near Hills (Move medium)
        const hillOffset = this.camera.x * 0.3; 
        ctx.fillStyle = this.theme.ground + '33'; // Semi-transparent planet color
        ctx.beginPath();
        ctx.moveTo(0, this.game.height);
        for(let x=0; x<=this.game.width + 50; x+=50) {
            const h = Math.abs(Math.sin((x + hillOffset) * 0.005)) * 50 + 50;
            ctx.lineTo(x, this.game.height - h);
        }
        ctx.lineTo(this.game.width, this.game.height);
        ctx.fill();
    }

    draw(ctx) {
        // DRAW LOADING SCREEN IF LOADING
        if (this.isLoading) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0,0,this.game.width, this.game.height);
            
            // Atmospheric Glow
            const grad = ctx.createRadialGradient(this.game.width/2, this.game.height/2, 50, this.game.width/2, this.game.height/2, 400);
            grad.addColorStop(0, this.theme.ground);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,this.game.width, this.game.height);

            // Text
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px "Orbitron", monospace';
            
            const dots = ".".repeat(Math.floor(Date.now() / 500) % 4);
            ctx.fillText("ENTERING ATMOSPHERE" + dots, this.game.width/2, this.game.height/2 - 20);
            
            ctx.font = '16px monospace';
            ctx.fillStyle = '#86efac';
            ctx.fillText("GENERATING TERRAIN...", this.game.width/2, this.game.height/2 + 20);
            
            // Loading Bar
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(this.game.width/2 - 100, this.game.height/2 + 50, 200, 10);
            ctx.fillStyle = '#fff';
            
            // Infinite progress bar animation
            const progress = (Date.now() % 1000) / 1000;
            ctx.fillRect(this.game.width/2 - 98 + (progress * 196), this.game.height/2 + 52, 40, 6);
            
            ctx.restore();
            return;
        }

        // NORMAL DRAW
        // Draw Parallax Backgrounds
        this.drawParallax(ctx);

        ctx.save();
        
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        // Tiles
        this.tiles.forEach(t => {
            if (t.x + t.w < this.camera.x || t.x > this.camera.x + (this.game.width/this.zoom)) return;
            
            // Texture with border
            ctx.fillStyle = t.type === 'surface' ? this.theme.ground : '#0f172a';
            ctx.fillRect(t.x, t.y, t.w, t.h);
            
            // "Highlight" top
            if(t.type === 'surface') {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(t.x, t.y, t.w, 4);
                
                // Grass Decoration
                if(t.deco === 1) {
                    ctx.fillStyle = this.theme.ground;
                    ctx.beginPath(); ctx.moveTo(t.x+10, t.y); ctx.lineTo(t.x+12, t.y-6); ctx.lineTo(t.x+14, t.y); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(t.x+20, t.y); ctx.lineTo(t.x+24, t.y-8); ctx.lineTo(t.x+28, t.y); ctx.fill();
                }
            }
            
            // Grid line
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.strokeRect(t.x, t.y, t.w, t.h);
        });

        // Ship
        if (this.shipObj) {
            Sprites.drawShipLanded(ctx, this.shipObj.x, this.shipObj.y);
            
            if (Math.abs(this.player.x - this.shipObj.x) < 80) {
                 ctx.font = '8px monospace';
                 ctx.fillStyle = '#fff';
                 ctx.textAlign = 'center';
                 ctx.fillText("TAKEOFF [UP]", this.shipObj.x + 32, this.shipObj.y - 10);
            }
        }

        // NPCs
        this.npcs.forEach(n => {
            Sprites.drawAlien(ctx, n.x, n.y, n.type === 'elder' ? '#facc15' : '#22c55e', n.h, this.player.animFrame);
            if (Math.abs(this.player.x - n.x) < 80) {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.moveTo(n.x+16, n.y-10); ctx.lineTo(n.x+24, n.y-20); ctx.lineTo(n.x+8, n.y-20); ctx.fill();
            }
        });

        // Enemies
        this.enemies.forEach(e => {
            const bounce = Math.abs(Math.sin(this.player.animFrame * 0.2)) * 5;
            Sprites.drawBlob(ctx, e.x, e.y - bounce, '#ef4444');
        });

        // Projectiles
        ctx.fillStyle = '#facc15';
        this.projectiles.forEach(p => {
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 10;
        });
        ctx.shadowBlur = 0;

        // Player
        Sprites.drawAstronaut(ctx, this.player.x, this.player.y, this.player.facing, this.player.state, this.player.animFrame);

        ctx.restore();
        
        // Atmosphere Overlay
        const grad = ctx.createLinearGradient(0, 0, 0, this.game.height);
        grad.addColorStop(0, this.theme.ground + '33');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0,0,this.game.width, this.game.height);
        ctx.globalCompositeOperation = 'source-over';
    }
}
