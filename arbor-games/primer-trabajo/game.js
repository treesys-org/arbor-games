
/**
 * PRIMER TRABAJO: CORP SIM (REMASTERED)
 * A Procedural Office Simulator.
 * Features: 320x240 Res, Sound Engine, Robust Input, Smooth Movement.
 */

// --- 0. CONFIG & AUDIO ---
const CONFIG = {
    W: 320,
    H: 240,
    TILE: 16,
    MOVE_DELAY: 120 // ms between moves
};

class AudioSynth {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination);
    }

    play(freq, type, dur) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    }

    sfxMove() { this.play(100, 'triangle', 0.05); }
    sfxBump() { this.play(60, 'sawtooth', 0.1); }
    sfxSelect() { this.play(440, 'square', 0.1); }
    sfxSuccess() { 
        this.play(500, 'sine', 0.1); 
        setTimeout(()=>this.play(750, 'sine', 0.2), 100); 
    }
    sfxError() { 
        this.play(150, 'sawtooth', 0.2); 
        setTimeout(()=>this.play(100, 'sawtooth', 0.2), 100); 
    }
}

// --- 1. ASSETS & GRAPHICS ---
const Palette = {
    bg: '#020617',
    text: '#22d3ee', // Cyan
    hero: '#3b82f6',
    wall: '#334155',
    floor: '#1e293b',
    floor_light: '#334155',
    desk: '#b45309',
    paper: '#f8fafc',
    phone_ring: '#ef4444'
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

    static get tiles() {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 16;
        const ctx = c.getContext('2d');
        
        // 0: Floor (Checkerboard subtle)
        ctx.fillStyle = Palette.floor; ctx.fillRect(0,0,16,16);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(4,4,8,8);

        // 1: Wall (Brick style)
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

        // 7: NPC (Generic)
        ctx.fillStyle = Palette.floor; ctx.fillRect(112,0,16,16);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(115, 14, 10, 2);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(116, 8, 8, 6); // Shirt
        ctx.fillStyle = '#fca5a5'; ctx.fillRect(116, 2, 8, 6); // Head

        return c;
    }
}

// --- 2. ROBUST INPUT SYSTEM ---
class Input {
    constructor() {
        this.keys = { UP:false, DOWN:false, LEFT:false, RIGHT:false, A:false, B:false };
        this.lastPressed = null;

        // Keyboard
        window.addEventListener('keydown', e => this.onKey(e, true));
        window.addEventListener('keyup', e => this.onKey(e, false));

        // Touch/Mouse (Pointer Events)
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
        // Map keyboard presses to on-screen button visuals
        const map = { 'UP':'btn-up', 'DOWN':'btn-down', 'LEFT':'btn-left', 'RIGHT':'btn-right', 'A':'btn-a', 'B':'btn-b'};
        const el = document.getElementById(map[key]);
        if(el) {
            if(active) el.classList.add('active');
            else el.classList.remove('active');
        }
    }

    consume(key) {
        if (this.keys[key]) {
            this.keys[key] = false; // Simple consume logic for menus
            this.updateVisuals(key, false);
            return true;
        }
        return false;
    }
}

// --- 3. WORLD GEN & LOGIC ---
class Building {
    constructor() {
        this.floors = [];
        this.w = 30; // Bigger floors
        this.h = 20; 
    }

    generate(deptNames) {
        this.floors = [ this.makeLobby() ];
        deptNames.forEach((n, i) => this.floors.push(this.makeOffice(i+1, n)));
    }

    makeLobby() {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1); // Walls
        this.fill(map, 1,1,this.w-2,this.h-2, 0); // Floor
        
        // Reception
        this.fill(map, 10, 6, 6, 1, 2); // Desk
        map[5][12] = 7; // Receptionist NPC
        
        // Stairs
        map[3][this.w-4] = 3; 

        return { z:0, name:"Lobby", map, spawns:{ up:{x:this.w-4, y:4}, down:{x:12, y:8} } };
    }

    makeOffice(z, name) {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1);
        this.fill(map, 1,1,this.w-2,this.h-2, 0);
        
        // Workstations
        for(let y=4; y<this.h-4; y+=4) {
            for(let x=4; x<this.w-4; x+=3) {
                map[y][x] = 5; // Phone Desk
                map[y][x+1] = 2; // Normal Desk
            }
        }
        
        // Stairs
        map[3][this.w-4] = 3; // Up
        map[3][4] = 4; // Down

        return { z, name, map, spawns:{ up:{x:this.w-4, y:4}, down:{x:4, y:4} } };
    }

    blankMap() {
        return Array(this.h).fill().map(() => Array(this.w).fill(0));
    }
    fill(map, x, y, w, h, v) {
        for(let iy=y; iy<y+h; iy++) for(let ix=x; ix<x+w; ix++) map[iy][ix] = v;
    }
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
            tiles: SpriteGen.tiles
        };

        this.building = new Building();
        this.player = { x: 12, y: 8, z: 0, lastMove: 0 };
        this.camera = { x:0, y:0 };
        
        this.data = { company: "Arbor Corp", depts: ["Sales", "HR", "Dev"] };
        this.activeTask = null;
        this.score = 0;
        this.msg = { text: "", timer: 0 };

        this.state = 'INIT'; // INIT, PLAY, DIALOG, MENU
        this.frame = 0;

        this.loop = this.loop.bind(this);
        this.init();
    }

    async init() {
        this.state = 'LOADING';
        this.drawLoading();

        // 1. Fetch Context
        let contextText = "Business Ethics";
        if(window.Arbor && window.Arbor.content) {
            try { 
                const c = await window.Arbor.content.getNext(); 
                if(c) contextText = c.text;
            } catch(e) { console.log("Offline Mode"); }
        }
        this.contextText = contextText;

        // 2. AI Gen (Mock or Real)
        // In a real scenario we fetch depts. For now we use defaults for speed/stability
        // unless AI is present.
        if(window.Arbor && window.Arbor.ai) {
             try {
                const p = `Context: ${contextText.substring(0,200)}. Create JSON: {"company":"Name", "depts":["Dept1", "Dept2", "Dept3"]}`;
                const res = await window.Arbor.ai.chat([{role:'user',content:p}]);
                const json = JSON.parse(res.text.replace(/```json/g,'').replace(/```/g,''));
                this.data = json;
             } catch(e) {}
        }

        this.building.generate(this.data.depts);
        
        this.state = 'PLAY';
        this.showMessage(`Welcome to ${this.data.company}`);
        
        // Start Task Loop
        setInterval(() => this.spawnTask(), 6000);
        
        requestAnimationFrame(this.loop);
    }

    spawnTask() {
        if(this.state !== 'PLAY' || this.activeTask) return;
        
        // Randomly pick a floor > 0
        const floorIdx = Math.floor(Math.random() * this.data.depts.length) + 1;
        const floor = this.building.floors[floorIdx];
        
        // Find phone
        let spots = [];
        floor.map.forEach((row, y) => row.forEach((t, x) => { if(t===5) spots.push({x,y}); }));
        
        if(spots.length > 0) {
            const spot = spots[Math.floor(Math.random()*spots.length)];
            this.activeTask = { z: floorIdx, x: spot.x, y: spot.y, type: 'PHONE' };
            floor.map[spot.y][spot.x] = 6; // Ringing
            this.showMessage(`CALL: ${floor.name} (Flr ${floorIdx})`);
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
        if(this.state === 'PLAY') {
            // Movement
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

        // Camera Follow
        const targetX = (this.player.x * CONFIG.TILE) - (CONFIG.W / 2);
        const targetY = (this.player.y * CONFIG.TILE) - (CONFIG.H / 2);
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        // Clamp Camera
        const floor = this.building.floors[this.player.z];
        this.camera.x = Math.max(0, Math.min(this.camera.x, (floor.map[0].length * CONFIG.TILE) - CONFIG.W));
        this.camera.y = Math.max(0, Math.min(this.camera.y, (floor.map.length * CONFIG.TILE) - CONFIG.H));
    }

    movePlayer(dx, dy) {
        const f = this.building.floors[this.player.z];
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;

        // Collision: 0=floor, 1=wall, 2=desk, 3=up, 4=down, 5/6=phone
        const t = f.map[ny][nx];
        
        // Solid blocks: 1, 2
        if (t === 1 || t === 2) {
            this.audio.sfxBump();
            return;
        }

        this.player.x = nx;
        this.player.y = ny;
        this.audio.sfxMove();

        // Stairs
        if(t === 3 && this.player.z < this.building.floors.length-1) {
            this.player.z++;
            const spawn = this.building.floors[this.player.z].spawns.down;
            this.player.x = spawn.x; this.player.y = spawn.y;
            this.showMessage(`Floor ${this.player.z}: ${this.building.floors[this.player.z].name}`);
        }
        else if(t === 4 && this.player.z > 0) {
            this.player.z--;
            const spawn = this.building.floors[this.player.z].spawns.up;
            this.player.x = spawn.x; this.player.y = spawn.y;
            this.showMessage(this.player.z===0 ? "Lobby" : `Floor ${this.player.z}`);
        }
    }

    checkInteract() {
        if(this.activeTask && this.activeTask.z === this.player.z) {
            const d = Math.abs(this.player.x - this.activeTask.x) + Math.abs(this.player.y - this.activeTask.y);
            if(d <= 1) {
                this.startMinigame();
            }
        }
    }

    async startMinigame() {
        this.state = 'LOADING_TASK';
        this.audio.sfxSelect();
        
        // Default Question
        let q = { text: "The client is asking for a refund.", opts: ["Grant it", "Deny it"], correct: 0 };
        
        // AI Generate
        if(window.Arbor && window.Arbor.ai) {
            const p = `Context: ${this.contextText.substring(0,300)}. Generate simple workplace problem with 2 options (one correct). JSON: {"text":"Problem", "opts":["Good", "Bad"], "correct":0}`;
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
            this.showMessage("Solved! +100pts");
            this.audio.sfxSuccess();
        } else {
            this.showMessage("Bad Call... -50pts");
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

        // Camera Transform
        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        // Draw Map
        const f = this.building.floors[this.player.z];
        const tSize = CONFIG.TILE;
        
        // Optimization: Only draw visible
        const startX = Math.floor(this.camera.x / tSize);
        const startY = Math.floor(this.camera.y / tSize);
        const endX = startX + (CONFIG.W / tSize) + 1;
        const endY = startY + (CONFIG.H / tSize) + 1;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y>=0 && y<f.map.length && x>=0 && x<f.map[0].length) {
                    const t = f.map[y][x];
                    
                    // Animate ringing phone
                    let spriteX = t * 16;
                    if(t === 6) {
                        spriteX = (Math.floor(this.frame / 10) % 2 === 0) ? 96 : 80;
                    }

                    this.ctx.drawImage(this.sprites.tiles, spriteX, 0, 16, 16, x*tSize, y*tSize, tSize, tSize);
                }
            }
        }

        // Player
        this.ctx.drawImage(this.sprites.hero, this.player.x*tSize, this.player.y*tSize);
        
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
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 14);
        const flName = this.building.floors[this.player.z].name;
        this.ctx.textAlign = 'right';
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
            this.ctx.fillStyle = 'rgba(0,0,0,0.9)';
            this.ctx.fillRect(20, 40, CONFIG.W-40, CONFIG.H-80);
            
            this.ctx.strokeStyle = Palette.text;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(20, 40, CONFIG.W-40, CONFIG.H-80);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.fillText("INCOMING QUERY:", 30, 60);

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

    drawLoading() {
        this.ctx.fillStyle = Palette.bg;
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        this.ctx.fillStyle = Palette.text;
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("BOOTING SYSTEM...", CONFIG.W/2, CONFIG.H/2);
        
        // Simple spinner
        const t = Date.now() / 100;
        const x = CONFIG.W/2 + Math.cos(t)*20;
        const y = CONFIG.H/2 + 20 + Math.sin(t)*20;
        this.ctx.fillRect(x, y, 4, 4);
        this.ctx.textAlign = 'left';
    }
}

// Start
window.onload = () => new Game();
