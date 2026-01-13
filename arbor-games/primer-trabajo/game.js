
/**
 * PRIMER TRABAJO: CORP SIM
 * A Procedural Office Simulator using Arbor Bridge.
 */

// --- 1. ASSETS & PALETTE ---
const Palette = {
    black: '#0f172a',
    white: '#f8fafc',
    skin: '#ffdab9',
    floor: '#cbd5e1',
    wall_out: '#334155',
    wall_in: '#94a3b8',
    desk: '#b45309',
    carpet: '#bfdbfe',
    phone_red: '#ef4444',
    phone_off: '#475569',
    stairs: '#64748b'
};

class SpriteGen {
    static create(w, h, drawFn) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        drawFn(ctx, w, h);
        return c;
    }

    static hero() {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(2, 13, 12, 2); // Shadow
            ctx.fillStyle = Palette.white; ctx.fillRect(4, 9, 8, 5); // Shirt
            ctx.fillStyle = '#1e293b'; ctx.fillRect(4, 14, 8, 2); // Pants
            ctx.fillStyle = Palette.skin; ctx.fillRect(4, 2, 8, 7); // Head
            ctx.fillStyle = '#3b82f6'; ctx.fillRect(4, 1, 8, 3); // Hair
            ctx.fillStyle = '#ef4444'; ctx.fillRect(6, 10, 4, 4); // Tie
        });
    }

    static npc(color) {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(2, 13, 12, 2);
            ctx.fillStyle = color || '#22c55e'; ctx.fillRect(4, 9, 8, 5);
            ctx.fillStyle = Palette.skin; ctx.fillRect(4, 2, 8, 7);
            ctx.fillStyle = '#475569'; ctx.fillRect(4, 1, 8, 3);
        });
    }

    static tiles() {
        const sheet = document.createElement('canvas');
        sheet.width = 128; sheet.height = 16;
        const ctx = sheet.getContext('2d');
        
        // 0: Floor
        ctx.fillStyle = Palette.floor; ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(2,2,12,12);

        // 1: Wall
        ctx.fillStyle = Palette.wall_out; ctx.fillRect(16, 0, 16, 16);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(18, 12, 12, 4);

        // 2: Desk (Empty)
        ctx.fillStyle = Palette.floor; ctx.fillRect(32, 0, 16, 16);
        ctx.fillStyle = Palette.desk; ctx.fillRect(33, 4, 14, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(33, 14, 14, 2);

        // 3: Stairs Up
        ctx.fillStyle = Palette.stairs; ctx.fillRect(48, 0, 16, 16);
        for(let i=0; i<4; i++) { ctx.fillStyle = '#334155'; ctx.fillRect(48, i*4, 16, 1); }

        // 4: Stairs Down
        ctx.fillStyle = Palette.stairs; ctx.fillRect(64, 0, 16, 16);
        ctx.fillStyle = '#000'; ctx.font='10px monospace'; ctx.fillText('v', 68, 12);

        // 5: Phone Desk (OFF)
        ctx.drawImage(sheet, 32, 0, 16, 16, 80, 0, 16, 16);
        ctx.fillStyle = Palette.phone_off; ctx.fillRect(84, 6, 6, 4); 

        // 6: Phone Desk (RINGING)
        ctx.drawImage(sheet, 32, 0, 16, 16, 96, 0, 16, 16);
        ctx.fillStyle = Palette.phone_red; ctx.fillRect(84+16, 5, 6, 5);
        ctx.fillStyle = '#fff'; ctx.fillRect(85+16, 6, 2, 2); // Blink light

        // 7: Plant
        ctx.fillStyle = Palette.floor; ctx.fillRect(112,0,16,16);
        ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.arc(120, 10, 6, 0, Math.PI*2); ctx.fill();
        
        return sheet;
    }
}

// --- 2. INPUT ---
const KEYS = { UP: ['ArrowUp','w'], DOWN: ['ArrowDown','s'], LEFT: ['ArrowLeft','a'], RIGHT: ['ArrowRight','d'], A: ['z','Enter',' '], B: ['x','Escape'] };

class Input {
    constructor() {
        this.keys = {}; this.pressed = {};
        window.addEventListener('keydown', e => { this.keys[e.key] = true; this.pressed[e.key] = true; });
        window.addEventListener('keyup', e => this.keys[e.key] = false);
        ['btn-up','btn-down','btn-left','btn-right','btn-a','btn-b'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                const k = id.replace('btn-','');
                const map = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',a:'Enter',b:'Escape'};
                el.addEventListener('touchstart', e => { e.preventDefault(); this.keys[map[k]] = true; this.pressed[map[k]] = true; });
                el.addEventListener('touchend', e => { e.preventDefault(); this.keys[map[k]] = false; });
            }
        });
    }
    isDown(a) { return KEYS[a].some(k => this.keys[k]); }
    isPressed(a) { const h = KEYS[a].some(k => this.pressed[k]); if(h) KEYS[a].forEach(k=>this.pressed[k]=false); return h; }
}

// --- 3. MAP GENERATOR & LOGIC ---

class Building {
    constructor() {
        this.floors = [];
        this.width = 20;
        this.height = 15;
    }

    generate(deptNames) {
        // Floor 0: Lobby
        this.floors.push(this.createLobby(0));

        // Floors 1 to X: Departments
        deptNames.forEach((dept, i) => {
            this.floors.push(this.createOffice(i + 1, dept));
        });
    }

    createLobby(z) {
        const map = this.emptyMap();
        // Walls
        this.drawRect(map, 0, 0, this.width, this.height, 1);
        this.drawRect(map, 1, 1, this.width-2, this.height-2, 0); // Floor

        // Reception Desk
        this.drawRect(map, 8, 4, 4, 2, 2);
        
        // Stairs Up (Top Right)
        map[2][this.width-3] = 3; 

        // Plants
        map[2][2] = 7; map[2][this.width-3] = 7;
        map[this.height-3][2] = 7; map[this.height-3][this.width-3] = 7;

        return { z, name: "Lobby", map, spawns: { stairsUp: {x: this.width-3, y: 3}, reception: {x: 9, y: 6} } };
    }

    createOffice(z, deptName) {
        const map = this.emptyMap();
        // Walls
        this.drawRect(map, 0, 0, this.width, this.height, 1);
        this.drawRect(map, 1, 1, this.width-2, this.height-2, 0);

        // Cubicles (2x2 grid style)
        for(let y=4; y<12; y+=4) {
            for(let x=4; x<16; x+=4) {
                map[y][x] = 5; // Desk with Phone
                map[y][x+1] = 2; // Desk
            }
        }

        // Stairs
        map[2][this.width-3] = 3; // Up
        map[2][2] = 4; // Down

        return { z, name: deptName, map, spawns: { stairsUp: {x: this.width-3, y: 3}, stairsDown: {x: 2, y: 3} } };
    }

    emptyMap() {
        let m = [];
        for(let y=0; y<this.height; y++) {
            let row = [];
            for(let x=0; x<this.width; x++) row.push(0);
            m.push(row);
        }
        return m;
    }

    drawRect(map, x, y, w, h, val) {
        for(let iy=y; iy<y+h; iy++) {
            for(let ix=x; ix<x+w; ix++) {
                if(iy >= 0 && iy < this.height && ix >= 0 && ix < this.width) map[iy][ix] = val;
            }
        }
    }
}

// --- 4. GAME ENGINE ---

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new Input();
        
        this.sprites = {
            hero: SpriteGen.hero(),
            tiles: SpriteGen.tiles(),
            npc: SpriteGen.npc('#64748b')
        };

        this.building = new Building();
        this.player = { x: 9, y: 8, z: 0, dir: 1, moving: false };
        this.camera = { x: 0, y: 0 };
        this.state = 'BOOT'; 
        
        this.companyData = { name: "Arbor Corp", depts: ["General", "Sales", "Tech"] };
        this.npcs = [];
        this.activeTask = null; // { type: 'PHONE'|'CLIENT', floor: z, x: x, y: y }
        this.score = 0;
        this.message = "";

        this.lastTime = 0;
        this.animTick = 0;

        this.bootSequence();
        requestAnimationFrame(t => this.loop(t));
    }

    async bootSequence() {
        this.state = 'LOADING';
        
        // 1. Get Context
        let context = { text: "General Business" };
        if(window.Arbor && window.Arbor.content) {
            try { context = await window.Arbor.content.getNext(); } catch(e) {}
        }
        this.currentContext = context;

        // 2. AI Gen
        if (window.Arbor && window.Arbor.ai) {
            const prompt = `
            Context: "${context.text.substring(0,400)}".
            Generate a fictional Company Name and 3 Department Names suitable for this topic.
            JSON ONLY: { "company": "Name", "depts": ["Dept 1", "Dept 2", "Dept 3"] }
            `;
            try {
                const res = await window.Arbor.ai.chat([{role:'user', content:prompt}]);
                const json = JSON.parse(res.text.replace(/```json/g,'').replace(/```/g,''));
                this.companyData = json;
            } catch(e) { console.warn("AI Gen failed, using defaults"); }
        }

        // 3. Build World
        this.building.generate(this.companyData.depts);
        
        // 4. Start
        this.state = 'ROAM';
        this.showMessage(`Welcome to ${this.companyData.company}!`);
        
        // 5. Start Event Loop (Tasks)
        setInterval(() => this.triggerRandomEvent(), 8000); // New task every 8s
    }

    triggerRandomEvent() {
        if(this.activeTask || this.state !== 'ROAM') return;

        const r = Math.random();
        if (r > 0.5) {
            // Phone Call (Usually on player's current floor or nearby)
            const targetFloor = Math.max(1, Math.floor(Math.random() * this.building.floors.length));
            // Find a desk
            const floor = this.building.floors[targetFloor];
            // Simple scan for a phone desk (tile 5)
            let phones = [];
            for(let y=0; y<floor.map.length; y++) {
                for(let x=0; x<floor.map[0].length; x++) {
                    if(floor.map[y][x] === 5) phones.push({x,y});
                }
            }
            if(phones.length > 0) {
                const p = phones[Math.floor(Math.random() * phones.length)];
                this.activeTask = { type: 'PHONE', z: targetFloor, x: p.x, y: p.y, active: true };
                // Update map data to show ringing phone
                floor.map[p.y][p.x] = 6; 
                this.showMessage(`Incoming Call! Floor ${targetFloor} - ${floor.name}`);
            }
        } else {
            // Client at Lobby
            this.activeTask = { type: 'CLIENT', z: 0, x: 9, y: 5, active: true }; // Reception
            this.npcs.push({ x: 9, y: 5, z: 0, sprite: SpriteGen.npc('#ef4444') }); // Spawn Red NPC
            this.showMessage(`Client Waiting at Lobby!`);
        }
    }

    loop(time) {
        const dt = time - this.lastTime;
        this.lastTime = time;
        this.animTick++;

        if (this.state === 'ROAM') {
            this.updatePlayer();
        } else if (this.state === 'MENU') {
            this.updateMenu();
        }

        this.updateCamera();
        this.draw();
        requestAnimationFrame(t => this.loop(t));
    }

    updatePlayer() {
        if (this.input.isPressed('A')) {
            this.checkInteraction();
            return;
        }

        // Movement with rudimentary delay
        if (this.animTick % 8 !== 0) return;

        let dx = 0, dy = 0;
        if (this.input.isDown('UP')) dy = -1;
        else if (this.input.isDown('DOWN')) dy = 1;
        else if (this.input.isDown('LEFT')) dx = -1;
        else if (this.input.isDown('RIGHT')) dx = 1;

        if (dx !== 0 || dy !== 0) {
            const floor = this.building.floors[this.player.z];
            const nx = this.player.x + dx;
            const ny = this.player.y + dy;

            // Collision
            // 0: Floor, 1: Wall, 2: Desk, 3: StairsU, 4: StairsD, 5/6: Phone, 7: Plant
            const tile = floor.map[ny][nx];
            if (tile === 0 || tile === 3 || tile === 4 || tile === 5 || tile === 6) {
                this.player.x = nx;
                this.player.y = ny;
                
                // Handle Stairs
                if (tile === 3) { // Up
                    if (this.player.z < this.building.floors.length - 1) {
                        this.player.z++;
                        const upSpawn = this.building.floors[this.player.z].spawns.stairsDown || {x:2,y:2};
                        this.player.x = upSpawn.x + 1; this.player.y = upSpawn.y;
                        this.showMessage(`Floor ${this.player.z}: ${this.building.floors[this.player.z].name}`);
                    }
                } else if (tile === 4) { // Down
                    if (this.player.z > 0) {
                        this.player.z--;
                        const downSpawn = this.building.floors[this.player.z].spawns.stairsUp;
                        this.player.x = downSpawn.x - 1; this.player.y = downSpawn.y;
                        this.showMessage(this.player.z === 0 ? "Lobby" : `Floor ${this.player.z}`);
                    }
                }
            }
        }
    }

    checkInteraction() {
        const floor = this.building.floors[this.player.z];
        
        // 1. Task Interaction
        if (this.activeTask && this.activeTask.z === this.player.z) {
            // Check distance
            const dist = Math.abs(this.activeTask.x - this.player.x) + Math.abs(this.activeTask.y - this.player.y);
            if (dist <= 1) {
                this.startTaskMinigame();
                return;
            }
        }
    }

    async startTaskMinigame() {
        this.state = 'LOADING_TASK';
        
        // Generate Question
        let q = { text: "Is the customer always right?", opts: ["Yes", "No"], correct: 0 };
        
        if (window.Arbor && window.Arbor.ai) {
            const role = this.activeTask.type === 'PHONE' ? "Phone Support" : "Front Desk";
            const prompt = `
            Context: "${this.currentContext.text.substring(0,300)}".
            Role: ${role}.
            Generate a 1-sentence problem from a client/caller related to the context, and a 2-choice question to solve it.
            JSON: { "text": "Problem description?", "opts": ["Good Answer", "Bad Answer"], "correct": 0 }
            `;
            try {
                const res = await window.Arbor.ai.chat([{role:'user',content:prompt}]);
                q = JSON.parse(res.text.replace(/```json/g,'').replace(/```/g,''));
            } catch(e) {}
        }

        this.currentTaskData = q;
        this.menuOpts = q.opts;
        this.menuSel = 0;
        this.state = 'MENU';
    }

    updateMenu() {
        if(this.input.isPressed('UP')) this.menuSel = 0;
        if(this.input.isPressed('DOWN')) this.menuSel = 1;
        if(this.input.isPressed('A')) {
            // Resolve
            if (this.menuSel === this.currentTaskData.correct) {
                this.score += 100;
                this.showMessage("Solved! Great job.");
                if(window.Arbor && window.Arbor.game) window.Arbor.game.addXP(50);
            } else {
                this.score = Math.max(0, this.score - 50);
                this.showMessage("Oops. Client unhappy.");
            }
            this.completeTask();
        }
    }

    completeTask() {
        // Cleanup map
        if (this.activeTask.type === 'PHONE') {
            this.building.floors[this.activeTask.z].map[this.activeTask.y][this.activeTask.x] = 5; // Stop ringing
        } else {
            this.npcs = this.npcs.filter(n => n.z !== 0); // Remove client
        }
        this.activeTask = null;
        this.state = 'ROAM';
    }

    updateCamera() {
        // Center player
        const targetX = (this.player.x * 16) - (160 / 2);
        const targetY = (this.player.y * 16) - (144 / 2);
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        // Clamp (assuming map size)
        const mW = this.building.width * 16;
        const mH = this.building.height * 16;
        this.camera.x = Math.max(0, Math.min(this.camera.x, mW - 160));
        this.camera.y = Math.max(0, Math.min(this.camera.y, mH - 144));
    }

    showMessage(msg) {
        this.message = msg;
        this.msgTimer = 180; // 3 seconds
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, 160, 144);

        if (this.state === 'LOADING' || this.state === 'LOADING_TASK') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.fillText("AI GENERATING...", 40, 70);
            return;
        }

        // --- DRAW WORLD ---
        if (this.state === 'ROAM') {
            this.ctx.save();
            this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
            
            const floor = this.building.floors[this.player.z];
            
            // Tiles
            for(let y=0; y<floor.map.length; y++) {
                for(let x=0; x<floor.map[0].length; x++) {
                    const t = floor.map[y][x];
                    // Sheet is 128x16. 16px tiles.
                    // 0:0, 1:16, 2:32, 3:48, 4:64, 5:80, 6:96, 7:112
                    let sx = t * 16;
                    
                    // Animation for ringing phone (6)
                    if (t === 6 && Math.floor(this.animTick / 10) % 2 === 0) {
                        sx = 80; // Blink to normal state occasionally
                    }

                    this.ctx.drawImage(this.sprites.tiles, sx, 0, 16, 16, x*16, y*16, 16, 16);
                }
            }

            // NPCs
            this.npcs.forEach(n => {
                if(n.z === this.player.z) this.ctx.drawImage(n.sprite, n.x*16, n.y*16);
            });

            // Player
            this.ctx.drawImage(this.sprites.hero, this.player.x*16, this.player.y*16);
            
            this.ctx.restore();

            // HUD
            this.ctx.fillStyle = 'rgba(15,23,42,0.8)';
            this.ctx.fillRect(0, 0, 160, 20);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '8px monospace';
            this.ctx.fillText(`Floor ${this.player.z} | Score: ${this.score}`, 4, 12);
            
            // Floating Message
            if (this.msgTimer > 0) {
                this.msgTimer--;
                this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
                this.ctx.fillRect(0, 124, 160, 20);
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(this.message, 80, 136);
                this.ctx.textAlign = 'left';
            }
        }

        // --- DRAW MENU (Task) ---
        if (this.state === 'MENU') {
            this.ctx.fillStyle = '#1e293b';
            this.ctx.fillRect(10, 10, 140, 124);
            this.ctx.strokeStyle = '#fff';
            this.ctx.strokeRect(10, 10, 140, 124);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '8px monospace';
            
            // Word wrap text
            const words = this.currentTaskData.text.split(' ');
            let line = "", y = 30;
            for(let w of words) {
                if (this.ctx.measureText(line + w).width > 120) {
                    this.ctx.fillText(line, 20, y); line = ""; y+=10;
                }
                line += w + " ";
            }
            this.ctx.fillText(line, 20, y);

            y += 20;
            this.menuOpts.forEach((o, i) => {
                this.ctx.fillStyle = (i === this.menuSel) ? '#fbbf24' : '#94a3b8';
                this.ctx.fillText((i === this.menuSel ? "> " : "  ") + o, 20, y + (i*15));
            });
        }
    }
}

// Start
window.onload = () => new Game();
