
/**
 * PLATFORMER.JS
 * Side-scrolling planetary exploration mode.
 */
import { SeededRandom, rectIntersect, Sprites } from './utils.js';

// Helper to handle alpha on different color formats (Hex vs HSL)
function withAlpha(color, hexAlpha) {
    if (!color) return '#000000' + hexAlpha;
    if (color.startsWith('#')) {
        // Ensure we don't double append if it already has alpha
        return color.length > 7 ? color : color + hexAlpha;
    }
    if (color.startsWith('hsl(')) {
        const val = parseInt(hexAlpha, 16) / 255;
        return color.replace('hsl', 'hsla').replace(')', `, ${val.toFixed(2)})`);
    }
    return color;
}

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
        this.props = []; // Decoration objects like Huts
        this.projectiles = [];
        this.shipObj = null; 

        this.levelWidth = 0;
        this.tileSize = 48; 
        
        // PHYSICS TUNING - Adjusted for tighter control
        this.gravity = 0.8;
        this.friction = 0.5; // Much stronger friction to stop sliding immediately
        this.speed = 1.5;     // Acceleration
        this.maxSpeed = 8.0;  // Cap to prevent teleporting
        this.jumpForce = -16;
        
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
        this.pendingLaunch = false; // Confirmation flag
        
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
        this.pendingLaunch = false;
        
        // Setup Theme
        this.theme = {
            ground: planet.color || '#334155',
            sky: '#0f172a',
            bgMount: '#1e293b'
        };
        
        // Safety timeout
        const safetyTimer = setTimeout(() => {
            if(this.isLoading) {
                console.warn("Level load timed out, forcing generation.");
                this.generateWorld({ title: planet.data.title, text: "Data Uplink Failed. Simulation Mode." });
            }
        }, 5000);

        // Async Data Fetch with STORY GENERATION
        if (window.Arbor && window.Arbor.content) {
            const idx = planet.data.index !== undefined ? planet.data.index : 0;
            
            // We fetch the lesson, but we ALSO ask the AI for a story context
            window.Arbor.content.getAt(idx).then(async (lessonData) => {
                
                let storyContext = null;
                try {
                     // Generar historia profunda
                     const prompt = `
                        Context: Planet "${lessonData.title}". Lesson Text: "${(lessonData.text || "").substring(0, 200)}".
                        Task: Create a dramatic RPG dialogue for a Martian Elder.
                        Scenario: The planet is infested by "Shadow Blobs" that stole the Knowledge Crystals.
                        Output JSON: { "elder_greeting": "Help us! [Dramatic description of infestation]. Use the text content to explain why this knowledge is vital." }
                     `;
                     storyContext = await window.Arbor.ai.askJSON(prompt);
                } catch(e) { console.log("AI Story failed, using fallback"); }

                clearTimeout(safetyTimer);
                this.generateWorld(lessonData, storyContext);

            }).catch(e => {
                console.warn("Arbor Content Load Error", e);
                clearTimeout(safetyTimer);
                this.generateWorld({ title: planet.data.title, text: "Signal lost. Data fragments corrupted." });
            });
        } else {
            // Mock loading
            setTimeout(() => {
                clearTimeout(safetyTimer);
                this.generateWorld({ title: planet.data.title, text: "Simulation Mode. No data uplink." });
            }, 1000);
        }
    }

    generateWorld(data, storyContext) {
        try {
            const rng = new SeededRandom(data.title);
            
            // Process Text
            const cleanText = (data.text || "").replace(/<[^>]*>/g, '');
            const sentences = cleanText.split('. ').filter(s => s.length > 10);
            
            this.tiles = [];
            this.npcs = [];
            this.enemies = [];
            this.props = [];
            this.projectiles = [];
            this.activeDialogue = null;
            this.ui.dialogueBox.style.display = 'none';
            this.levelWidth = 4000;
            
            const groundY = 12; 
            let height = groundY;
            let scholarCount = 0;

            // Generate Terrain & Entities
            for (let x = 0; x < this.levelWidth / this.tileSize; x++) {
                // Smooth terrain generation
                if(x > 10 && x < (this.levelWidth/this.tileSize)-10) {
                    if(rng.next() > 0.7) height += rng.pick([-1, 0, 1]); 
                }
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

                const surfaceY = height * this.tileSize;

                // Platforms
                if (x > 15 && x < (this.levelWidth/this.tileSize)-10 && rng.next() > 0.85) {
                    const py = height - rng.range(3, 5);
                    this.tiles.push({ x: x*this.tileSize, y: py*this.tileSize, w: this.tileSize, h: this.tileSize, type: 'plat' });
                }

                // Entities & Structures
                if (x > 15 && x < (this.levelWidth/this.tileSize)-10) {
                    const roll = rng.next();
                    
                    // HUT & NPC (Friendly Village)
                    if (roll > 0.92) {
                        // Hut Background
                        this.props.push({
                            x: x * this.tileSize - 20, 
                            y: surfaceY - 80,
                            type: 'hut',
                            w: 100, h: 80
                        });

                        // Scholar NPC
                        const text = sentences[scholarCount % sentences.length] || "Analyzing infestation patterns...";
                        this.npcs.push({ 
                            x: x*this.tileSize + 20, y: surfaceY - 48, w: 32, h: 48, 
                            text: text,
                            type: 'scholar' 
                        });
                        scholarCount++;
                    } 
                    // ENEMIES (Infestation)
                    else if (roll < 0.15) { 
                        this.enemies.push({
                            x: x*this.tileSize, y: surfaceY - 32, w: 32, h: 32,
                            vx: 0, vy: 0, 
                            type: 'blob',
                            aggro: false,
                            startX: x*this.tileSize
                        });
                    }
                }
            }

            // START: Ship
            this.shipObj = { 
                x: 100, 
                y: (groundY * this.tileSize) - 64 + 10, 
                w: 64, h: 64 
            };

            // START: Elder (Quest Giver)
            const elderText = storyContext ? storyContext.elder_greeting : "Traveler! Our world is overrun. These shadows feed on ignorance. Destroy them and reclaim the Data Fragments!";
            this.npcs.push({ 
                x: 250, 
                y: (groundY * this.tileSize) - 64, 
                w: 32, h: 64, 
                text: elderText, 
                type: 'elder' 
            });
            
            // First Hut for Elder
            this.props.push({ x: 220, y: (groundY * this.tileSize) - 80, type: 'hut', w: 100, h: 80 });

            // END: Exit Beacon
            const endX = this.levelWidth - 300;
            this.props.push({ x: endX, y: (height * this.tileSize) - 100, type: 'beacon', w: 40, h: 100 });
            this.npcs.push({ 
                x: endX + 50, 
                y: height*this.tileSize - 48, 
                w: 32, h: 48, 
                text: "Sector Cleared. Launching...", 
                type: 'beacon_npc' // Invisible trigger
            });

            // Reset Player Physics
            this.player.x = 100; 
            this.player.y = (groundY * this.tileSize) - 200; 
            this.player.vx = 0; 
            this.player.vy = 0; 
            this.player.health = 100;
            this.player.ammo = 10; // Give ammo start
            this.player.state = 'idle';
            this.player.grounded = false;
            
            this.updateHUD();
            this.isLoading = false; 
        } catch(e) {
            console.error("Critical World Gen Error", e);
            this.isLoading = false; 
        }
    }

    update() {
        if (this.isLoading) return; 

        if (this.player.health <= 0) return;

        // DIALOGUE HANDLING
        if (this.activeDialogue) {
            if (this.game.input.consume('ArrowUp') || this.game.input.consume(' ') || this.game.input.consume('Enter')) {
                this.activeDialogue = null;
                this.ui.dialogueBox.style.display = 'none';
                
                // EXECUTE LAUNCH IF CONFIRMED
                if (this.pendingLaunch) {
                    this.game.switchMode('space');
                    if(window.Arbor && window.Arbor.game) window.Arbor.game.addXP(200);
                    this.pendingLaunch = false;
                }
            }
            return; 
        }

        // --- PLAYER PHYSICS MOVEMENT REVISED ---
        const pressingLeft = this.game.input.keys['ArrowLeft'];
        const pressingRight = this.game.input.keys['ArrowRight'];

        if (pressingLeft) {
            this.player.vx -= this.speed;
            this.player.facing = -1;
            this.player.state = 'run';
        } else if (pressingRight) {
            this.player.vx += this.speed;
            this.player.facing = 1;
            this.player.state = 'run';
        } else {
            this.player.state = 'idle';
            // SNAP TO ZERO: Remove slippery feeling
            this.player.vx *= this.friction; 
            if (Math.abs(this.player.vx) < 0.5) this.player.vx = 0;
        }

        // Clamp Speed (Prevent Teleporting)
        this.player.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.player.vx));

        // Jump
        if ((this.game.input.keys['ArrowUp'] || this.game.input.keys[' ']) && this.player.grounded) {
            this.player.vy = this.jumpForce;
            this.player.grounded = false;
            this.game.spawnParticle(this.player.x + 16, this.player.y + 48, '#fff', 3);
        }

        // Apply Physics (Y Axis only here, X handled with custom friction above)
        this.player.vy += this.gravity; 
        
        // Terminal Velocity for falling
        if(this.player.vy > 18) this.player.vy = 18;

        // X Movement & Collision
        this.player.x += this.player.vx;
        this.checkCol(true);
        
        // Y Movement & Collision
        this.player.y += this.player.vy;
        this.player.grounded = false;
        this.checkCol(false);

        if (!this.player.grounded) this.player.state = 'jump';
        this.player.animFrame++;

        // Shooting
        if (this.game.input.consume('z')) this.shoot();

        // Projectile Update
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.life--;
            if (p.life <= 0) { this.projectiles.splice(i, 1); continue; }
            
            // Hit Enemy
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (rectIntersect({x: p.x, y: p.y, w: p.w, h: p.h}, e)) {
                    this.enemies.splice(j, 1);
                    this.projectiles.splice(i, 1);
                    this.game.spawnParticle(e.x, e.y, '#ef4444', 6, 8);
                    this.game.shake(5);
                    break;
                }
            }
        }

        // --- ENEMY AI (AGGRESSIVE) ---
        this.enemies.forEach(e => {
            const dist = this.player.x - e.x;
            const distY = this.player.y - e.y;
            const range = 400; // Aggro range

            // Chase Logic
            if (Math.abs(dist) < range) {
                e.aggro = true;
                const dir = Math.sign(dist);
                e.vx += dir * 0.2; // Accelerate towards player
                e.vx = Math.max(-4, Math.min(4, e.vx)); // Cap speed

                // Jump if wall or player is above
                if (e.grounded && (Math.random() < 0.02 || (distY < -50 && Math.random() < 0.05))) {
                    e.vy = -12;
                    e.grounded = false;
                }
            } else {
                e.vx *= 0.9; // Slow down if lost
            }

            // Gravity & Move
            e.vy += this.gravity;
            e.x += e.vx;
            // Simple X Collision
            this.tiles.forEach(t => {
                if(rectIntersect(e, t)) {
                    e.x -= e.vx; e.vx *= -0.5; // Bounce off wall
                }
            });

            e.y += e.vy;
            e.grounded = false;
            // Simple Y Collision
            this.tiles.forEach(t => {
                if(rectIntersect(e, t)) {
                    if(e.vy > 0) { e.y = t.y - e.h; e.grounded = true; }
                    e.vy = 0;
                }
            });

            // Hit Player
            if (rectIntersect(e, this.player)) {
                this.damage(10);
                // Knockback
                this.player.vx = Math.sign(this.player.x - e.x) * 10;
                this.player.vy = -5;
                e.vx *= -1;
            }
        });

        // Camera Logic
        const targetCamX = this.player.x - (this.game.width / this.zoom / 2);
        const targetCamY = this.player.y - (this.game.height / this.zoom / 2);
        const clampedTargetY = Math.min(targetCamY, 300); // Don't look too deep underground

        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.y += (clampedTargetY - this.camera.y) * 0.1;

        // Interaction Check
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
                // CONFIRMATION FOR LAUNCH
                this.pendingLaunch = true;
                this.showDialogue("SHIP COMPUTER", "Orbit synchronization ready. Confirm launch sequence? [PRESS JUMP]");
            } else if (nearby.type === 'beacon_npc') {
                 // CONFIRMATION FOR BEACON
                this.pendingLaunch = true;
                this.showDialogue("BEACON", "Extraction signal locked. Leave planet? [PRESS JUMP]");
            } else {
                this.interactingNPC = nearby;
                if (nearby.type === 'scholar') {
                    this.player.ammo += 10;
                    this.game.spawnParticle(nearby.x, nearby.y, '#facc15', 5, 5);
                    this.updateHUD();
                }
                // Determine text based on type
                let text = nearby.text;
                let speaker = nearby.type.toUpperCase();
                this.showDialogue(speaker, text);
            }
        }
        
        // Fall Death
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
            // Optimization
            if (Math.abs(t.x - this.player.x) > 200 || Math.abs(t.y - this.player.y) > 200) continue;
            
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
        const grad = ctx.createLinearGradient(0, 0, 0, this.game.height);
        grad.addColorStop(0, withAlpha(this.theme.sky, 'FF'));
        grad.addColorStop(1, withAlpha(this.theme.bgMount, 'FF'));
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,this.game.width, this.game.height);
        
        ctx.fillStyle = '#fff';
        for(let i=0; i<30; i++) {
             const px = (i * 91283) % this.game.width;
             const py = (i * 38127) % (this.game.height/2);
             ctx.globalAlpha = 0.5;
             ctx.beginPath(); ctx.arc(px, py, 1, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        const mountOffset = this.camera.x * 0.1; 
        ctx.fillStyle = '#0f172a'; 
        ctx.beginPath();
        ctx.moveTo(0, this.game.height);
        for(let x=0; x<this.game.width + 50; x+=50) {
            const h = Math.abs(Math.sin((x + mountOffset) * 0.01)) * 100 + 100;
            ctx.lineTo(x, this.game.height - h);
        }
        ctx.lineTo(this.game.width, this.game.height);
        ctx.fill();
    }

    draw(ctx) {
        if (this.isLoading) {
            // Draw Loading
            ctx.fillStyle = '#000'; ctx.fillRect(0,0,this.game.width, this.game.height);
            ctx.fillStyle = '#fff'; ctx.font = '20px monospace'; ctx.textAlign = 'center';
            ctx.fillText("DESCENDING TO SURFACE...", this.game.width/2, this.game.height/2);
            return;
        }

        this.drawParallax(ctx);

        ctx.save();
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        // Props (Background Layer - Huts)
        this.props.forEach(p => {
            if (p.type === 'hut') Sprites.drawHut(ctx, p.x, p.y, p.w, p.h, this.theme.ground);
            if (p.type === 'beacon') {
                ctx.fillStyle = '#94a3b8'; ctx.fillRect(p.x+10, p.y, 20, p.h);
                ctx.fillStyle = '#22c55e'; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(p.x+20, p.y, 10, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
            }
        });

        // Tiles
        this.tiles.forEach(t => {
            if (t.x + t.w < this.camera.x || t.x > this.camera.x + (this.game.width/this.zoom)) return;
            ctx.fillStyle = t.type === 'surface' ? this.theme.ground : '#0f172a';
            ctx.fillRect(t.x, t.y, t.w, t.h);
            if(t.type === 'surface') {
                ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(t.x, t.y, t.w, 4);
                if(t.deco === 1) {
                    ctx.fillStyle = this.theme.ground;
                    ctx.beginPath(); ctx.moveTo(t.x+10, t.y); ctx.lineTo(t.x+12, t.y-6); ctx.lineTo(t.x+14, t.y); ctx.fill();
                }
            }
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.strokeRect(t.x, t.y, t.w, t.h);
        });

        // Ship
        if (this.shipObj) {
            Sprites.drawShipLanded(ctx, this.shipObj.x, this.shipObj.y);
            if (Math.abs(this.player.x - this.shipObj.x) < 80) {
                 ctx.font = '8px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
                 ctx.fillText("TAKEOFF [UP]", this.shipObj.x + 32, this.shipObj.y - 10);
            }
        }

        // NPCs
        this.npcs.forEach(n => {
            if (n.type === 'beacon_npc') return;
            Sprites.drawAlien(ctx, n.x, n.y, n.type === 'elder' ? '#facc15' : '#22c55e', n.h, this.player.animFrame);
            if (Math.abs(this.player.x - n.x) < 80) {
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(n.x+16, n.y-10); ctx.lineTo(n.x+24, n.y-20); ctx.lineTo(n.x+8, n.y-20); ctx.fill();
            }
        });

        // Enemies
        this.enemies.forEach(e => {
            const bounce = Math.abs(Math.sin(this.player.animFrame * 0.4)) * 5; // Faster bounce
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
        
        // Atmosphere
        const grad = ctx.createLinearGradient(0, 0, 0, this.game.height);
        grad.addColorStop(0, withAlpha(this.theme.ground, '33'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0,0,this.game.width, this.game.height);
        ctx.globalCompositeOperation = 'source-over';
    }
}
