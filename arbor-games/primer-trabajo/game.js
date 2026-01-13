

/**
 * PRIMER TRABAJO: CORP SIM (REMASTERED)
 * A Procedural Office Simulator.
 * Features: Job Interview, Stress System, Neural UI, NPCs, Coffee Mechanics.
 */

// --- 0. CONFIG & AUDIO ---
const CONFIG = {
    W: 320,
    H: 240,
    TILE: 16,
    MOVE_DELAY: 150, // Slower logical move for animation time
    ANIM_SPEED: 0.2 // Lerp speed (0.1 to 1.0)
};

class AudioSynth {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination);
    }

    play(freq, type, dur, vol = 0.1) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    }

    sfxMove() { this.play(100, 'triangle', 0.05); }
    sfxBump() { this.play(60, 'sawtooth', 0.1); }
    sfxSelect() { this.play(440, 'square', 0.1); }
    sfxType() { this.play(800 + Math.random()*200, 'sine', 0.03, 0.05); } // Typing sound
    sfxSuccess() { 
        this.play(500, 'sine', 0.1); 
        setTimeout(()=>this.play(750, 'sine', 0.2), 100); 
    }
    sfxError() { 
        this.play(150, 'sawtooth', 0.2); 
        setTimeout(()=>this.play(100, 'sawtooth', 0.2), 100); 
    }
    sfxDrink() { // Coffee sound
        this.play(300, 'sine', 0.1);
        setTimeout(()=>this.play(400, 'sine', 0.2), 100);
        setTimeout(()=>this.play(600, 'sine', 0.1), 200);
    }
    sfxBurnout() {
        this.play(100, 'sawtooth', 1.0, 0.5);
        setTimeout(()=>this.play(80, 'sawtooth', 1.0, 0.5), 200);
    }
}

// --- 1. ASSETS & GRAPHICS ---
const Palette = {
    bg: '#020617',
    text: '#22d3ee', // Cyan
    hero: '#3b82f6',
    wall: '#334155',
    floor: '#1e293b',
    desk: '#b45309',
    paper: '#f8fafc',
    phone_ring: '#ef4444',
    stress_low: '#22c55e',
    stress_med: '#facc15',
    stress_high: '#ef4444',
    coffee: '#78350f',
    plant: '#16a34a',
    machine: '#94a3b8'
};

class SpriteGen {
    static create(w, h, fn) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        fn(c.getContext('2d'), w, h);
        return c;
    }

    static get hero() {
        return this.create(16, 16, (ctx) => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(3, 14, 10, 2);
            // Body
            ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 10, 8, 5); 
            // Shirt
            ctx.fillStyle = '#f8fafc'; ctx.fillRect(4, 8, 8, 4);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(7, 8, 2, 4); // Tie
            // Head
            ctx.fillStyle = '#fca5a5'; ctx.fillRect(4, 2, 8, 7);
            // Hair
            ctx.fillStyle = Palette.hero; ctx.fillRect(4, 1, 8, 3); ctx.fillRect(3, 2, 2, 3);
        });
    }

    // Dynamic Human Generator
    static human(shirtColor, hairColor) {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(3, 14, 10, 2);
            // Generic Shirt
            ctx.fillStyle = shirtColor; ctx.fillRect(4, 8, 8, 6); 
            // Tie / Detail
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(7, 8, 2, 4);
            // Head
            ctx.fillStyle = '#fca5a5'; ctx.fillRect(4, 2, 8, 6);
            // Hair
            ctx.fillStyle = hairColor; ctx.fillRect(4, 1, 8, 3);
            ctx.fillRect(3, 2, 2, 3); // Sideburns
        });
    }

    static get recruiter() {
        return this.create(64, 64, (ctx) => {
             // Silhouette style
             ctx.fillStyle = '#1e293b';
             ctx.beginPath();
             ctx.arc(32, 24, 16, 0, Math.PI*2); // Head
             ctx.fill();
             ctx.beginPath();
             ctx.arc(32, 64, 24, Math.PI, 0); // Shoulders
             ctx.fill();
             // Eyes (Glowing)
             ctx.fillStyle = '#fff';
             ctx.fillRect(26, 22, 4, 2);
             ctx.fillRect(34, 22, 4, 2);
        });
    }

    static get tiles() {
        const c = document.createElement('canvas');
        c.width = 192; c.height = 16; // Increased width for more props
        const ctx = c.getContext('2d');
        
        // 0: Floor
        ctx.fillStyle = Palette.floor; ctx.fillRect(0,0,16,16);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(4,4,8,8);

        // 1: Wall
        ctx.fillStyle = Palette.wall; ctx.fillRect(16,0,16,16);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(16, 0, 16, 2); ctx.fillRect(16, 14, 16, 2);

        // 2: Desk
        ctx.fillStyle = Palette.floor; ctx.fillRect(32,0,16,16);
        ctx.fillStyle = Palette.desk; ctx.fillRect(34, 4, 12, 10);
        ctx.fillStyle = '#78350f'; ctx.fillRect(34, 14, 12, 2); // shadow
        ctx.fillStyle = '#fff'; ctx.fillRect(36, 6, 4, 3); // paper

        // 3: Stairs UP
        ctx.fillStyle = '#475569'; ctx.fillRect(48,0,16,16);
        for(let i=0;i<4;i++) { ctx.fillStyle='#1e293b'; ctx.fillRect(48, i*4, 16, 1); }
        ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.fillText('^', 52, 10);

        // 4: Stairs DOWN
        ctx.fillStyle = '#475569'; ctx.fillRect(64,0,16,16);
        ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.fillText('v', 68, 10);

        // 5: Phone Desk
        ctx.drawImage(c, 32, 0, 16, 16, 80, 0, 16, 16);
        ctx.fillStyle = '#333'; ctx.fillRect(88, 6, 6, 4);

        // 6: Ringing Phone
        ctx.drawImage(c, 32, 0, 16, 16, 96, 0, 16, 16);
        ctx.fillStyle = Palette.phone_ring; ctx.fillRect(88+16, 5, 6, 5);

        // 7: (Reserved for NPC layer, not map tile)
        ctx.fillStyle = Palette.floor; ctx.fillRect(112,0,16,16);

        // 8: Coffee Machine
        ctx.fillStyle = Palette.floor; ctx.fillRect(128,0,16,16);
        ctx.fillStyle = '#111'; ctx.fillRect(130, 2, 12, 12);
        ctx.fillStyle = '#555'; ctx.fillRect(132, 8, 8, 4);
        ctx.fillStyle = '#0f0'; ctx.fillRect(138, 4, 2, 2); // Power light

        // 9: Plant
        ctx.fillStyle = Palette.floor; ctx.fillRect(144, 0, 16, 16);
        ctx.fillStyle = '#78350f'; ctx.fillRect(148, 10, 8, 4); // Pot
        ctx.fillStyle = Palette.plant; 
        ctx.beginPath(); ctx.arc(152, 8, 5, 0, Math.PI*2); ctx.fill(); // Leaves

        // 10: Printer
        ctx.fillStyle = Palette.floor; ctx.fillRect(160, 0, 16, 16);
        ctx.fillStyle = Palette.machine; ctx.fillRect(162, 4, 12, 10);
        ctx.fillStyle = '#fff'; ctx.fillRect(166, 2, 4, 2); // Paper tray

        // 11: Water Cooler
        ctx.fillStyle = Palette.floor; ctx.fillRect(176, 0, 16, 16);
        ctx.fillStyle = '#fff'; ctx.fillRect(180, 8, 8, 6); // Base
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(181, 2, 6, 6); // Tank
        ctx.globalAlpha = 0.5; ctx.fillStyle='#fff'; ctx.fillRect(182, 3, 2, 2); ctx.globalAlpha=1;

        return c;
    }
}

// --- 2. INPUT SYSTEM ---
class Input {
    constructor() {
        this.keys = { UP:false, DOWN:false, LEFT:false, RIGHT:false, A:false, B:false };
        this.lastPressed = null;

        window.addEventListener('keydown', e => this.onKey(e, true));
        window.addEventListener('keyup', e => this.onKey(e, false));

        this.bindBtn('btn-up', 'UP');
        this.bindBtn('btn-down', 'DOWN');
        this.bindBtn('btn-left', 'LEFT');
        this.bindBtn('btn-right', 'RIGHT');
        this.bindBtn('btn-a', 'A');
        this.bindBtn('btn-b', 'B');
    }

    onKey(e, isDown) {
        const map = {
            'ArrowUp': 'UP', 'w': 'UP',
            'ArrowDown': 'DOWN', 's': 'DOWN',
            'ArrowLeft': 'LEFT', 'a': 'LEFT',
            'ArrowRight': 'RIGHT', 'd': 'RIGHT',
            'Enter': 'A', 'z': 'A', ' ': 'A',
            'Escape': 'B', 'x': 'B'
        };
        if(map[e.key]) {
            e.preventDefault();
            this.keys[map[e.key]] = isDown;
            if(isDown) this.lastPressed = map[e.key];
            this.updateVisuals(map[e.key], isDown);
        }
    }

    bindBtn(id, key) {
        const el = document.getElementById(id);
        if(!el) return;
        const set = (active) => {
            this.keys[key] = active;
            if(active) {
                this.lastPressed = key;
                el.classList.add('active');
                if (window.navigator.vibrate) window.navigator.vibrate(10);
            } else {
                el.classList.remove('active');
            }
        };
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
        el.addEventListener('pointerup', (e) => { e.preventDefault(); set(false); });
        el.addEventListener('pointerleave', (e) => { e.preventDefault(); set(false); });
    }

    updateVisuals(key, active) {
        const map = { 'UP':'btn-up', 'DOWN':'btn-down', 'LEFT':'btn-left', 'RIGHT':'btn-right', 'A':'btn-a', 'B':'btn-b'};
        const el = document.getElementById(map[key]);
        if(el) {
            if(active) el.classList.add('active');
            else el.classList.remove('active');
        }
    }

    consume(key) {
        if (this.keys[key]) {
            this.keys[key] = false; 
            this.updateVisuals(key, false);
            return true;
        }
        return false;
    }
}

// --- 3. WORLD GEN ---
class Building {
    constructor() {
        this.floors = [];
        this.w = 20; // REDUCED SIZE (Was 30)
        this.h = 15; // REDUCED SIZE (Was 20)
    }

    generate(deptNames) {
        this.floors = [ this.makeLobby() ];
        deptNames.forEach((n, i) => this.floors.push(this.makeOffice(i+1, n)));
    }

    makeLobby() {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1); // Walls
        this.fill(map, 1,1,this.w-2,this.h-2, 0); // Floor
        this.fill(map, 8, 4, 4, 1, 2); // Reception Desk
        
        const npcs = [];
        npcs.push({x: 10, y: 3, role: 'Receptionist', phrase: "Bienvenido a Arbor Corp.", color: '#ef4444'});

        map[2][this.w-3] = 3; // Stairs UP
        map[2][2] = 8; // Coffee
        map[this.h-3][2] = 9; // Plant
        map[this.h-3][this.w-3] = 9; // Plant

        return { z:0, name:"Lobby", map, npcs, spawns:{ up:{x:this.w-3, y:3}, down:{x:10, y:6} } };
    }

    makeOffice(z, name) {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1);
        this.fill(map, 1,1,this.w-2,this.h-2, 0);
        
        // Compact Workstations
        for(let y=3; y<this.h-3; y+=3) {
            for(let x=3; x<this.w-3; x+=3) {
                // 70% chance of desk
                if(Math.random() > 0.3) {
                    map[y][x] = 5; // Phone Desk
                    map[y][x+1] = 2; // Normal Desk
                }
            }
        }
        
        // DECOR & PROPS (Procedural Clutter)
        for(let y=2; y<this.h-2; y++) {
            for(let x=2; x<this.w-2; x++) {
                if(map[y][x] === 0 && Math.random() < 0.05) {
                    const props = [8, 9, 10, 11]; // Coffee, Plant, Printer, Water
                    map[y][x] = props[Math.floor(Math.random()*props.length)];
                }
            }
        }

        const npcs = [];
        // Spawn People (More dense now)
        const count = 3 + Math.floor(Math.random()*3);
        const shirtColors = ['#64748b', '#ef4444', '#22c55e', '#eab308', '#ec4899', '#3b82f6'];
        const hairColors = ['#000', '#78350f', '#facc15', '#fca5a5'];

        for(let i=0; i<count; i++) {
            let placed = false;
            while(!placed) {
                const rx = 2 + Math.floor(Math.random()*(this.w-4));
                const ry = 2 + Math.floor(Math.random()*(this.h-4));
                if(map[ry][rx] === 0) {
                    npcs.push({
                        x: rx, y: ry, 
                        vx: rx * CONFIG.TILE, vy: ry * CONFIG.TILE, // Visual coords
                        role: 'Worker', 
                        moveTimer: Math.random() * 100,
                        shirt: shirtColors[Math.floor(Math.random()*shirtColors.length)],
                        hair: hairColors[Math.floor(Math.random()*hairColors.length)],
                        sprite: null // Lazy load
                    });
                    placed = true;
                }
            }
        }

        map[2][this.w-3] = 3; // Up
        map[2][2] = 4; // Down
        
        return { z, name, map, npcs, spawns:{ up:{x:this.w-3, y:3}, down:{x:2, y:3} } };
    }

    blankMap() { return Array(this.h).fill().map(() => Array(this.w).fill(0)); }
    fill(map, x, y, w, h, v) { for(let iy=y; iy<y+h; iy++) for(let ix=x; ix<x+w; ix++) map[iy][ix] = v; }
}

// --- 4. GAME ENGINE ---
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.input = new Input();
        this.audio = new AudioSynth();
        
        this.sprites = {
            hero: SpriteGen.hero,
            tiles: SpriteGen.tiles,
            recruiter: SpriteGen.recruiter
        };
        // Cache human variants
        this.humanCache = {};

        this.building = new Building();
        
        // Player state with visual coordinates for smoothing
        this.player = { 
            x: 10, y: 6, z: 0, 
            vx: 10 * CONFIG.TILE, vy: 6 * CONFIG.TILE, // Visual X/Y
            lastMove: 0 
        };
        
        this.camera = { x:0, y:0 };
        
        this.data = { company: "Arbor Corp", depts: ["Sales", "HR", "Dev"] };
        this.interview = { q: "Why are you here?", opts: ["Money", "Passion"], correct: 1 };
        
        this.activeTask = null;
        this.score = 0;
        this.stress = 0; // 0 to 100
        this.maxStress = 100;
        this.msg = { text: "", timer: 0 };
        this.phrases = ["¡Sinergia!", "ASAP", "Ping me", "Circle back", "Bandwidth?", "Touch base", "Pivotar", "¿Café?"];

        this.state = 'INIT'; 
        this.frame = 0;

        this.loop = this.loop.bind(this);
        this.init();
    }

    async init() {
        this.state = 'LOADING';
        
        // Fetch Context
        let contextText = "Business Ethics";
        if(window.Arbor && window.Arbor.content) {
            try { 
                const c = await window.Arbor.content.getNext(); 
                if(c) contextText = c.text;
            } catch(e) { console.log("Offline Mode"); }
        }
        this.contextText = contextText;

        // AI Generation for World AND Interview
        if(window.Arbor && window.Arbor.ai) {
             try {
                const prompt = `
                Context: "${contextText.substring(0,400)}".
                Generate a JSON object with:
                1. "company": A fictional company name related to context.
                2. "depts": Array of 3 department names.
                3. "interview": Object with "q" (Interview question), "opts" (Array of 2 short answers), "correct" (index 0 or 1).
                JSON format only. No markdown.
                `;
                const res = await window.Arbor.ai.chat([{role:'user',content:prompt}]);
                const clean = res.text.replace(/```json/g,'').replace(/```/g,'');
                const json = JSON.parse(clean);
                
                this.data.company = json.company;
                this.data.depts = json.depts;
                this.data.interview = json.interview; // {q, opts, correct}

             } catch(e) { console.error("AI Error", e); }
        }

        this.state = 'INTERVIEW';
        this.menu = { sel: 0 };
        
        requestAnimationFrame(this.loop);
    }

    getHumanSprite(shirt, hair) {
        const key = `${shirt}-${hair}`;
        if (!this.humanCache[key]) {
            this.humanCache[key] = SpriteGen.human(shirt, hair);
        }
        return this.humanCache[key];
    }

    startGameWorld() {
        this.building.generate(this.data.depts);
        this.state = 'PLAY';
        this.stress = 0;
        this.score = 0;
        this.showMessage(`BIENVENIDO A ${this.data.company.toUpperCase()}`);
        
        // Initialize player visual pos
        this.player.vx = this.player.x * CONFIG.TILE;
        this.player.vy = this.player.y * CONFIG.TILE;

        // Start Task Loop
        if(this.taskInterval) clearInterval(this.taskInterval);
        this.taskInterval = setInterval(() => this.spawnTask(), 5000);
    }

    spawnTask() {
        if(this.state !== 'PLAY' || this.activeTask) return;
        
        // Randomly pick a floor > 0
        const floorIdx = Math.floor(Math.random() * this.data.depts.length) + 1;
        const floor = this.building.floors[floorIdx];
        
        let spots = [];
        floor.map.forEach((row, y) => row.forEach((t, x) => { if(t===5) spots.push({x,y}); }));
        
        if(spots.length > 0) {
            const spot = spots[Math.floor(Math.random()*spots.length)];
            this.activeTask = { z: floorIdx, x: spot.x, y: spot.y, type: 'PHONE', timer: 1000 };
            floor.map[spot.y][spot.x] = 6; // Ringing
            this.showMessage(`LLAMADA: ${floor.name} (Piso ${floorIdx})`);
            this.audio.sfxSelect();
        }
    }

    loop(now) {
        this.frame++;
        this.update(now);
        this.draw();
        requestAnimationFrame(this.loop);
    }

    update(now) {
        // SMOOTH MOVEMENT LERP
        if (this.state === 'PLAY') {
            const targetX = this.player.x * CONFIG.TILE;
            const targetY = this.player.y * CONFIG.TILE;
            this.player.vx += (targetX - this.player.vx) * CONFIG.ANIM_SPEED;
            this.player.vy += (targetY - this.player.vy) * CONFIG.ANIM_SPEED;

            // NPC Logic & Lerp
            const f = this.building.floors[this.player.z];
            if (f.npcs) {
                f.npcs.forEach(npc => {
                    // Initialize visuals if missing
                    if (typeof npc.vx === 'undefined') { npc.vx = npc.x * CONFIG.TILE; npc.vy = npc.y * CONFIG.TILE; }
                    
                    // Simple Wander AI
                    npc.moveTimer = (npc.moveTimer || 0) + 1;
                    if (npc.moveTimer > 100 && Math.random() < 0.02) {
                        const dirs = [{x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}];
                        const d = dirs[Math.floor(Math.random()*dirs.length)];
                        const nx = npc.x + d.x;
                        const ny = npc.y + d.y;
                        
                        // Collision check for NPCs (Walls, Desks, Player, Props)
                        if (f.map[ny] && f.map[ny][nx] === 0 && (nx !== this.player.x || ny !== this.player.y)) {
                             npc.x = nx;
                             npc.y = ny;
                        }
                        npc.moveTimer = 0;
                    }

                    // Lerp NPC
                    npc.vx += (npc.x * CONFIG.TILE - npc.vx) * 0.1;
                    npc.vy += (npc.y * CONFIG.TILE - npc.vy) * 0.1;
                });
            }
        }

        if (this.state === 'INTERVIEW') {
            if(this.input.consume('UP')) { this.menu.sel = 0; this.audio.sfxMove(); }
            if(this.input.consume('DOWN')) { this.menu.sel = 1; this.audio.sfxMove(); }
            if(this.input.consume('A')) {
                if(this.menu.sel === this.data.interview.correct) {
                    this.audio.sfxSuccess();
                    this.startGameWorld();
                } else {
                    this.audio.sfxBurnout();
                    this.state = 'GAMEOVER';
                    this.msg.text = "NO CONTRATADO";
                }
            }
        }
        else if(this.state === 'GAMEOVER') {
             if(this.input.consume('A')) {
                 window.location.reload();
             }
        }
        else if(this.state === 'PLAY') {
            // Passive Stress
            this.stress += 0.03;

            // Task Stress
            if (this.activeTask) {
                this.stress += 0.05; // Extra stress while phone ringing
            }

            // Burnout Check
            if (this.stress >= this.maxStress) {
                this.state = 'GAMEOVER';
                this.msg.text = "BURNOUT - GAME OVER";
                this.audio.sfxBurnout();
                clearInterval(this.taskInterval);
            }

            // Movement Logic
            if(now - this.player.lastMove > CONFIG.MOVE_DELAY) {
                let dx=0, dy=0;
                if(this.input.keys.UP) dy=-1;
                else if(this.input.keys.DOWN) dy=1;
                else if(this.input.keys.LEFT) dx=-1;
                else if(this.input.keys.RIGHT) dx=1;

                if(dx!==0 || dy!==0) {
                    this.movePlayer(dx, dy);
                    this.player.lastMove = now;
                }
            }

            // Interact
            if(this.input.consume('A')) {
                this.checkInteract();
            }
        }
        else if(this.state === 'MENU') {
            if(this.input.consume('UP')) { this.menu.sel = 0; this.audio.sfxMove(); }
            if(this.input.consume('DOWN')) { this.menu.sel = 1; this.audio.sfxMove(); }
            if(this.input.consume('A')) this.resolveTask();
        }

        // Camera Follow (Follow visual position not grid)
        const targetX = (this.player.vx) - (CONFIG.W / 2);
        const targetY = (this.player.vy) - (CONFIG.H / 2);
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        // Clamp Camera
        if (this.state === 'PLAY' && this.building.floors[this.player.z]) {
            const floor = this.building.floors[this.player.z];
            this.camera.x = Math.max(0, Math.min(this.camera.x, (floor.map[0].length * CONFIG.TILE) - CONFIG.W));
            this.camera.y = Math.max(0, Math.min(this.camera.y, (floor.map.length * CONFIG.TILE) - CONFIG.H));
        }
    }

    movePlayer(dx, dy) {
        const f = this.building.floors[this.player.z];
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;

        // Collision: 0=floor, 1=wall, 2=desk, 3=up, 4=down, 5/6=phone, 8=coffee
        const t = f.map[ny][nx];
        // 0=floor, 1=wall, 2=desk, 3=up, 4=down, 5/6=phone, 8=coffee, 9=plant, 10=printer, 11=water
        if (t === 1 || t === 2 || t >= 9) { // Collide with furniture/props
            this.audio.sfxBump();
            return;
        }

        // NPC Bump Interaction
        const hitNPC = f.npcs ? f.npcs.find(n => n.x === nx && n.y === ny) : null;
        if (hitNPC) {
            this.audio.sfxBump();
            const phrase = this.phrases[Math.floor(Math.random()*this.phrases.length)];
            this.showMessage(`${hitNPC.role}: "${phrase}"`);
            return; // Block movement
        }

        this.player.x = nx;
        this.player.y = ny;
        this.audio.sfxMove();

        // Stairs
        if(t === 3 && this.player.z < this.building.floors.length-1) {
            this.player.z++;
            const spawn = this.building.floors[this.player.z].spawns.down;
            this.setPlayerPos(spawn.x, spawn.y);
            this.showMessage(`Piso ${this.player.z}: ${this.building.floors[this.player.z].name}`);
        }
        else if(t === 4 && this.player.z > 0) {
            this.player.z--;
            const spawn = this.building.floors[this.player.z].spawns.up;
            this.setPlayerPos(spawn.x, spawn.y);
            this.showMessage(this.player.z===0 ? "Lobby" : `Piso ${this.player.z}`);
        }
    }

    setPlayerPos(x, y) {
        this.player.x = x; this.player.y = y;
        this.player.vx = x * CONFIG.TILE;
        this.player.vy = y * CONFIG.TILE;
    }

    checkInteract() {
        const f = this.building.floors[this.player.z];
        
        // Task
        if(this.activeTask && this.activeTask.z === this.player.z) {
            const d = Math.abs(this.player.x - this.activeTask.x) + Math.abs(this.player.y - this.activeTask.y);
            if(d <= 1) {
                this.startMinigame();
                return;
            }
        }

        // Interaction (Coffee 8, Water 11)
        const dirs = [{x:0,y:0}, {x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}];
        for(let d of dirs) {
            const tx = this.player.x + d.x;
            const ty = this.player.y + d.y;
            if (f.map[ty]) {
                const t = f.map[ty][tx];
                if (t === 8 || t === 11) {
                    this.drinkCoffee();
                    return;
                }
            }
        }
    }

    drinkCoffee() {
        this.stress = Math.max(0, this.stress - 25);
        this.showMessage("Pausa: -25% Estrés. Refrescante.");
        this.audio.sfxDrink();
        // Particle effect could go here
    }

    async startMinigame() {
        this.state = 'LOADING_TASK';
        this.audio.sfxSelect();
        
        // Default Question
        let q = { text: "El cliente exige un reembolso.", opts: ["Aprobar", "Rechazar"], correct: 0 };
        
        // AI Generate
        if(window.Arbor && window.Arbor.ai) {
            const p = `Context: ${this.contextText.substring(0,300)}. Generate simple workplace problem with 2 options (one correct). JSON: {"text":"Problem", "opts":["Good", "Bad"], "correct":0}. Language: Spanish.`;
            try {
                const res = await window.Arbor.ai.chat([{role:'user',content:p}]);
                q = JSON.parse(res.text.replace(/```json/g,'').replace(/```/g,''));
            } catch(e) {}
        }

        this.menu = { q, sel: 0 };
        this.state = 'MENU';
    }

    resolveTask() {
        if(this.menu.sel === this.menu.q.correct) {
            this.score += 100;
            this.stress = Math.max(0, this.stress - 20); // Relief
            this.showMessage("¡Resuelto! -20% Estrés");
            this.audio.sfxSuccess();
        } else {
            this.stress += 15;
            this.showMessage("Error... +15% Estrés");
            this.audio.sfxError();
        }
        
        // Clear task
        const f = this.building.floors[this.activeTask.z];
        f.map[this.activeTask.y][this.activeTask.x] = 5; // Stop ringing
        this.activeTask = null;
        this.state = 'PLAY';
    }

    showMessage(txt) {
        this.msg.text = txt;
        this.msg.timer = 180; // 3 sec
    }

    draw() {
        // Clear
        this.ctx.fillStyle = Palette.bg;
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);

        if(this.state === 'LOADING' || this.state === 'LOADING_TASK') {
            this.drawLoading();
            return;
        }

        if(this.state === 'INTERVIEW') {
            this.drawInterview();
            return;
        }

        if(this.state === 'GAMEOVER') {
            this.drawGameOver();
            return;
        }

        // Camera Transform
        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        // Draw Map
        const f = this.building.floors[this.player.z];
        const tSize = CONFIG.TILE;
        
        // Optimization
        const startX = Math.floor(this.camera.x / tSize);
        const startY = Math.floor(this.camera.y / tSize);
        const endX = startX + (CONFIG.W / tSize) + 1;
        const endY = startY + (CONFIG.H / tSize) + 1;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y>=0 && y<f.map.length && x>=0 && x<f.map[0].length) {
                    const t = f.map[y][x];
                    let spriteX = t * 16;
                    if(t === 6) {
                        spriteX = (Math.floor(this.frame / 10) % 2 === 0) ? 96 : 80;
                    }
                    this.ctx.drawImage(this.sprites.tiles, spriteX, 0, 16, 16, x*tSize, y*tSize, tSize, tSize);
                }
            }
        }

        // Draw NPCs
        if (f.npcs) {
            f.npcs.forEach(npc => {
                // Bobbing animation
                const bob = Math.sin(this.frame * 0.2) * 2;
                
                // Get or Create Sprite
                let sprite;
                if(npc.role === 'Receptionist') {
                    sprite = this.getHumanSprite('#ef4444', '#000');
                } else {
                    sprite = this.getHumanSprite(npc.shirt || '#64748b', npc.hair || '#000');
                }
                
                this.ctx.drawImage(sprite, npc.vx, npc.vy + bob);
                
                // Exclamation for Receptionist
                if(npc.role === 'Receptionist') {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '8px monospace';
                    this.ctx.fillText("!", npc.vx + 6, npc.vy - 2 + bob);
                }
            });
        }

        // Player (Use visual coords)
        this.ctx.drawImage(this.sprites.hero, this.player.vx, this.player.vy);
        
        // Task Indicator
        if(this.activeTask && this.activeTask.z === this.player.z) {
            const tx = this.activeTask.x * tSize;
            const ty = this.activeTask.y * tSize - 10 + (Math.sin(this.frame/5)*3);
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillText("!", tx+6, ty);
        }

        this.ctx.restore();

        // UI Layer
        this.drawUI();
    }

    drawUI() {
        // Top Bar
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        this.ctx.fillRect(0,0,CONFIG.W, 20);
        this.ctx.fillStyle = Palette.text;
        this.ctx.font = '10px "Chakra Petch", monospace';
        this.ctx.fillText(`PTS: ${this.score}`, 10, 14);
        
        // STRESS BAR
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(CONFIG.W/2 - 40, 6, 80, 8); // BG
        
        const stressPct = Math.min(1, this.stress / this.maxStress);
        let stressColor = Palette.stress_low;
        if(stressPct > 0.5) stressColor = Palette.stress_med;
        if(stressPct > 0.8) stressColor = Palette.stress_high;
        
        this.ctx.fillStyle = stressColor;
        this.ctx.fillRect(CONFIG.W/2 - 39, 7, 78 * stressPct, 6); // Fill
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '8px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("ESTRÉS", CONFIG.W/2, 13);
        this.ctx.textAlign = 'left';

        const flName = this.building.floors[this.player.z].name;
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = Palette.text;
        this.ctx.font = '10px "Chakra Petch", monospace';
        this.ctx.fillText(flName.toUpperCase(), CONFIG.W-10, 14);
        this.ctx.textAlign = 'left';

        // Message
        if(this.msg.timer > 0) {
            this.msg.timer--;
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, CONFIG.H-30, CONFIG.W, 30);
            this.ctx.fillStyle = '#facc15';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.msg.text, CONFIG.W/2, CONFIG.H-12);
            this.ctx.textAlign = 'left';
        }

        // Menu Overlay
        if(this.state === 'MENU') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.95)';
            this.ctx.fillRect(20, 40, CONFIG.W-40, CONFIG.H-80);
            
            this.ctx.strokeStyle = Palette.text;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(20, 40, CONFIG.W-40, CONFIG.H-80);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.fillText("PROBLEMA DETECTADO:", 30, 60);

            // Word Wrap Question
            const words = this.menu.q.text.split(' ');
            let line = "", y=80;
            words.forEach(w => {
                if(this.ctx.measureText(line+w).width > CONFIG.W-70) {
                    this.ctx.fillText(line, 30, y); line=""; y+=12;
                }
                line+=w+" ";
            });
            this.ctx.fillText(line, 30, y);

            // Options
            y+=20;
            this.menu.q.opts.forEach((o, i) => {
                this.ctx.fillStyle = (i === this.menu.sel) ? '#facc15' : '#94a3b8';
                this.ctx.fillText((i === this.menu.sel ? "> " : "  ") + o, 30, y + (i*15));
            });
        }
    }

    drawInterview() {
        // Dark room ambience
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);

        // Spotlight effect
        const grad = this.ctx.createRadialGradient(CONFIG.W/2, CONFIG.H/2, 20, CONFIG.W/2, CONFIG.H/2, 150);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#020617');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);

        // Recruiter
        this.ctx.drawImage(this.sprites.recruiter, CONFIG.W/2 - 32, 40);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px "Chakra Petch", monospace';
        this.ctx.textAlign = 'center';
        
        // Question
        this.ctx.fillText("ENTREVISTA DE TRABAJO", CONFIG.W/2, 30);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '10px monospace';
        
        const words = this.data.interview.q.split(' ');
        let line = "", y=120;
        words.forEach(w => {
            if(this.ctx.measureText(line+w).width > 200) {
                this.ctx.fillText(line, CONFIG.W/2, y); line=""; y+=12;
            }
            line+=w+" ";
        });
        this.ctx.fillText(line, CONFIG.W/2, y);

        // Options
        y += 30;
        this.data.interview.opts.forEach((o, i) => {
            this.ctx.fillStyle = (i === this.menu.sel) ? '#22d3ee' : '#475569';
            this.ctx.fillText((i === this.menu.sel ? "> " : "") + o.toUpperCase(), CONFIG.W/2, y + (i*20));
        });

        this.ctx.textAlign = 'left';
    }

    drawLoading() {
        this.ctx.fillStyle = '#020617';
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        
        // Neural Animation
        const cx = CONFIG.W/2;
        const cy = CONFIG.H/2;
        const t = this.frame * 0.05;

        this.ctx.strokeStyle = '#22d3ee';
        this.ctx.lineWidth = 1;

        // Sine waves "syncing"
        this.ctx.beginPath();
        for(let i=0; i<100; i++) {
            const angle = (i/100) * Math.PI * 2;
            const r = 40 + Math.sin(t*2 + angle*5)*5;
            this.ctx.lineTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        this.ctx.beginPath();
        for(let i=0; i<100; i++) {
            const angle = (i/100) * Math.PI * 2;
            const r = 30 + Math.sin(t*3 - angle*3)*5;
            this.ctx.lineTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.stroke();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px "Chakra Petch", monospace';
        this.ctx.textAlign = 'center';
        
        // Fading text
        const alpha = 0.5 + Math.sin(t)*0.5;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.fillText("INICIANDO SIMULACION...", cx, cy + 70);
        
        this.ctx.textAlign = 'left';
    }

    drawGameOver() {
        this.ctx.fillStyle = '#450a0a';
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = '20px "Chakra Petch"';
        this.ctx.fillText("GAME OVER", CONFIG.W/2, CONFIG.H/2 - 20);
        
        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = '#fca5a5';
        this.ctx.fillText(this.msg.text, CONFIG.W/2, CONFIG.H/2 + 10);
        
        if (Math.floor(this.frame/30) % 2 === 0) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText("PRESS A TO RESTART", CONFIG.W/2, CONFIG.H/2 + 40);
        }
        this.ctx.textAlign = 'left';
    }
}

// Start Listener
document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    new Game();
});