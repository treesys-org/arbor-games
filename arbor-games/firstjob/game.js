

/**
 * FIRST JOB: CORP SIM (REMASTERED v3.2)
 * Features: Smartphone Calls, Cafeteria Shop, Elevator UI.
 */

// --- 0. CONFIG & AUDIO ---
const CONFIG = {
    W: 320,
    H: 240,
    TILE: 16,
    MOVE_DELAY: 150,
    ANIM_SPEED: 0.2
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
    sfxPhone() { 
        this.play(600, 'square', 0.1, 0.1); 
        setTimeout(() => this.play(800, 'square', 0.1, 0.1), 100);
    }
    sfxSuccess() { 
        this.play(500, 'sine', 0.1); 
        setTimeout(()=>this.play(750, 'sine', 0.2), 100); 
    }
    sfxError() { 
        this.play(150, 'sawtooth', 0.2); 
        setTimeout(()=>this.play(100, 'sawtooth', 0.2), 100); 
    }
    sfxCash() {
        this.play(1200, 'sine', 0.05, 0.1);
        setTimeout(()=>this.play(1500, 'sine', 0.1, 0.1), 50);
    }
    sfxEat() {
        this.play(200, 'sawtooth', 0.1);
        setTimeout(()=>this.play(250, 'sawtooth', 0.1), 100);
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
    floor_cafe: '#4a044e', // Checkered look color logic handled in draw
    desk: '#b45309',
    stress_low: '#22c55e',
    stress_med: '#facc15',
    stress_high: '#ef4444',
    phone_bg: '#1e293b',
    phone_screen: '#0f172a'
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
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(3, 14, 10, 2);
            ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 10, 8, 5); 
            ctx.fillStyle = '#f8fafc'; ctx.fillRect(4, 8, 8, 4);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(7, 8, 2, 4); 
            ctx.fillStyle = '#fca5a5'; ctx.fillRect(4, 2, 8, 7);
            ctx.fillStyle = Palette.hero; ctx.fillRect(4, 1, 8, 3); ctx.fillRect(3, 2, 2, 3);
        });
    }

    static human(shirtColor, hairColor, isVendor = false) {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(3, 14, 10, 2);
            ctx.fillStyle = shirtColor; ctx.fillRect(4, 8, 8, 6); 
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(7, 8, 2, 4);
            ctx.fillStyle = '#fca5a5'; ctx.fillRect(4, 2, 8, 6);
            ctx.fillStyle = hairColor; ctx.fillRect(4, 1, 8, 3);
            if (isVendor) {
                // Apron
                ctx.fillStyle = '#fff'; ctx.fillRect(5, 9, 6, 5);
                // Hat
                ctx.fillStyle = '#fff'; ctx.fillRect(4, 0, 8, 2);
            }
            ctx.fillRect(3, 2, 2, 3); 
        });
    }

    // High Res Face for Video Call
    static get recruiterFace() {
        return this.create(64, 64, (ctx) => {
             // Skin
             ctx.fillStyle = '#eab308'; 
             ctx.fillRect(16, 10, 32, 40);
             // Suit
             ctx.fillStyle = '#1e293b'; ctx.fillRect(10, 50, 44, 14);
             ctx.fillStyle = '#fff'; ctx.fillRect(28, 50, 8, 14);
             ctx.fillStyle = '#ef4444'; ctx.fillRect(30, 50, 4, 10);
             // Hair
             ctx.fillStyle = '#475569'; ctx.fillRect(14, 6, 36, 10); ctx.fillRect(12, 10, 4, 12);
             // Eyes
             ctx.fillStyle = '#000'; ctx.fillRect(20, 24, 6, 4); ctx.fillRect(38, 24, 6, 4);
             // Glasses
             ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
             ctx.strokeRect(18, 22, 10, 8); ctx.strokeRect(36, 22, 10, 8);
             ctx.beginPath(); ctx.moveTo(28, 26); ctx.lineTo(36, 26); ctx.stroke();
             // Mouth
             ctx.fillRect(24, 40, 16, 2);
        });
    }

    static get tiles() {
        const c = document.createElement('canvas');
        c.width = 192; c.height = 16; 
        const ctx = c.getContext('2d');
        
        // 0: Floor Office
        ctx.fillStyle = Palette.floor; ctx.fillRect(0,0,16,16);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(4,4,8,8);

        // 1: Wall
        ctx.fillStyle = Palette.wall; ctx.fillRect(16,0,16,16);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(16, 0, 16, 2); ctx.fillRect(16, 14, 16, 2);

        // 2: Desk (Empty)
        ctx.fillStyle = Palette.floor; ctx.fillRect(32,0,16,16);
        ctx.fillStyle = Palette.desk; ctx.fillRect(34, 4, 12, 10);
        ctx.fillStyle = '#78350f'; ctx.fillRect(34, 14, 12, 2); 
        ctx.fillStyle = '#fff'; ctx.fillRect(36, 6, 4, 3); 

        // 3: Stairs UP
        ctx.fillStyle = '#475569'; ctx.fillRect(48,0,16,16);
        for(let i=0;i<4;i++) { ctx.fillStyle='#1e293b'; ctx.fillRect(48, i*4, 16, 1); }
        ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.fillText('^', 52, 10);

        // 4: Stairs DOWN
        ctx.fillStyle = '#475569'; ctx.fillRect(64,0,16,16);
        ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.fillText('v', 68, 10);

        // 5: Phone Desk (Normal)
        ctx.drawImage(c, 32, 0, 16, 16, 80, 0, 16, 16);
        ctx.fillStyle = '#333'; ctx.fillRect(88, 6, 6, 4);

        // 6: Floor Cafeteria
        ctx.fillStyle = '#fff'; ctx.fillRect(96, 0, 16, 16);
        ctx.fillStyle = '#fca5a5'; ctx.fillRect(96,0,8,8); ctx.fillRect(104,8,8,8);

        // 7: NPC Marker (Logic only)

        // 8: Food Counter
        ctx.fillStyle = Palette.floor; ctx.fillRect(128,0,16,16);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(128, 4, 16, 12);
        ctx.fillStyle = '#fff'; ctx.fillRect(128, 4, 16, 2); // Counter top

        // 9: Plant
        ctx.fillStyle = Palette.floor; ctx.fillRect(144, 0, 16, 16);
        ctx.fillStyle = '#78350f'; ctx.fillRect(148, 10, 8, 4); 
        ctx.fillStyle = Palette.plant; 
        ctx.beginPath(); ctx.arc(152, 8, 5, 0, Math.PI*2); ctx.fill(); 

        // 10: Printer
        ctx.fillStyle = Palette.floor; ctx.fillRect(160, 0, 16, 16);
        ctx.fillStyle = Palette.machine; ctx.fillRect(162, 4, 12, 10);
        ctx.fillStyle = '#fff'; ctx.fillRect(166, 2, 4, 2); 

        // 11: Cafe Table
        ctx.fillStyle = '#fff'; ctx.fillRect(176, 0, 16, 16);
        ctx.fillStyle = '#fca5a5'; ctx.fillRect(176,0,8,8); ctx.fillRect(184,8,8,8);
        ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(184, 8, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(184, 8, 4, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1;

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
        if (document.activeElement.tagName === 'INPUT') {
            if (e.key === 'Enter' && isDown) {
                 const btn = document.getElementById('btn-submit-task');
                 if (btn) btn.click();
            }
            return; 
        }

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
        this.w = 20; 
        this.h = 15; 
    }

    generate(deptNames) {
        // Floor 0: Lobby
        this.floors.push(this.makeLobby());
        
        // Floor 1: Cafeteria (Fixed)
        this.floors.push(this.makeCafeteria(1, "COMEDOR"));

        // Floors 2+: Offices
        deptNames.forEach((n, i) => this.floors.push(this.makeOffice(i+2, n)));
    }

    makeLobby() {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1); 
        this.fill(map, 1,1,this.w-2,this.h-2, 0); 
        this.fill(map, 8, 4, 4, 1, 2); // Reception Desk
        
        const npcs = [];
        npcs.push({x: 10, y: 3, role: 'Receptionist', phrase: "Bienvenido a Arbor Corp.", color: '#ef4444'});

        map[2][this.w-3] = 3; // Stairs UP
        map[this.h-3][2] = 9; // Plant
        map[this.h-3][this.w-3] = 9; // Plant

        return { z:0, name:"LOBBY", map, npcs, spawns:{ up:{x:this.w-3, y:3}, down:{x:10, y:6} } };
    }

    makeCafeteria(z, name) {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1);
        this.fill(map, 1,1,this.w-2,this.h-2, 6); // Checker floor
        
        // Counter
        this.fill(map, 8, 4, 6, 1, 8); 

        // Tables
        for(let y=7; y<this.h-3; y+=3) {
            for(let x=4; x<this.w-4; x+=3) {
                 map[y][x] = 11; 
            }
        }
        
        const npcs = [];
        // Vendor
        npcs.push({
            x: 11, y: 3, 
            role: 'Vendor', 
            phrase: "¿Algo de comer?", 
            isVendor: true,
            color: '#ec4899', 
            hair: '#facc15'
        });

        // Some people eating
        for(let i=0; i<3; i++) {
             npcs.push({
                x: 4 + (i*4), y: 8,
                role: 'Eating',
                shirt: '#64748b', hair:'#000',
                moveTimer: 0
             });
        }

        map[2][this.w-3] = 3; // Up
        map[2][2] = 4; // Down
        
        return { z, name, map, npcs, spawns:{ up:{x:this.w-3, y:3}, down:{x:2, y:3} } };
    }

    makeOffice(z, name) {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1);
        this.fill(map, 1,1,this.w-2,this.h-2, 0);
        
        for(let y=3; y<this.h-3; y+=3) {
            for(let x=3; x<this.w-3; x+=3) {
                if(Math.random() > 0.3) {
                    map[y][x] = 5; 
                    map[y][x+1] = 2; 
                }
            }
        }
        
        for(let y=2; y<this.h-2; y++) {
            for(let x=2; x<this.w-2; x++) {
                if(map[y][x] === 0 && Math.random() < 0.05) {
                    const props = [9, 10]; 
                    map[y][x] = props[Math.floor(Math.random()*props.length)];
                }
            }
        }

        const npcs = [];
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
                        id: `npc_${z}_${i}`,
                        x: rx, y: ry, 
                        vx: rx * CONFIG.TILE, vy: ry * CONFIG.TILE, 
                        role: 'Worker', 
                        moveTimer: Math.random() * 100,
                        shirt: shirtColors[Math.floor(Math.random()*shirtColors.length)],
                        hair: hairColors[Math.floor(Math.random()*hairColors.length)],
                        sprite: null,
                        task: null 
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
        this.paused = false;
        
        this.sprites = {
            hero: SpriteGen.hero,
            tiles: SpriteGen.tiles,
            recruiter: SpriteGen.recruiterFace
        };
        this.humanCache = {};

        this.building = new Building();
        
        this.player = { 
            x: 10, y: 6, z: 0, 
            vx: 10 * CONFIG.TILE, vy: 6 * CONFIG.TILE, 
            lastMove: 0 
        };
        
        this.camera = { x:0, y:0 };
        
        this.data = { company: "Arbor Corp", depts: ["Sales", "HR", "Dev"] };
        this.interviewQuestions = [
            { q: "Describe yourself.", keywords: ["work", "passionate", "motivated"] },
            { q: "What is your flaw?", keywords: ["perfectionist", "hard", "focus"] }
        ];
        this.interviewRound = 0;
        this.interviewScore = 0;
        
        // --- NEW FEATURES STATES ---
        this.phone = { active: false, ringing: false, timer: 0, caller: "", floorName: "", targetNPC: null, msg: "" };
        this.shop = { active: false, items: [
            {n: "Café", cost: 40, stress: -20},
            {n: "Sandwich", cost: 80, stress: -50},
            {n: "Energía", cost: 120, stress: -30, speed: true}
        ], selected: 0 };
        this.speedBoost = 0;
        
        this.score = 0;
        this.money = 0;
        this.tasksSolved = 0; 
        this.stress = 0; 
        this.maxStress = 100;
        this.msg = { text: "", timer: 0 };
        
        this.username = "Candidate";
        if (window.Arbor && window.Arbor.user) this.username = window.Arbor.user.username;

        // DOM Elements
        this.els = {
            taskOverlay: document.getElementById('task-input-layer'),
            taskHeader: document.getElementById('term-header'),
            taskPrompt: document.getElementById('task-prompt-text'),
            taskInput: document.getElementById('task-answer-input'),
            taskSubmit: document.getElementById('btn-submit-task'),
            pauseBtn: document.getElementById('btn-pause')
        };
        
        this.els.taskSubmit.addEventListener('click', () => this.resolveInputSubmission());
        this.els.pauseBtn.addEventListener('click', () => this.togglePause());

        this.state = 'INIT'; 
        this.frame = 0;

        this.loop = this.loop.bind(this);
        this.init();
    }

    async init() {
        this.state = 'CONNECTING_CALL';
        requestAnimationFrame(this.loop);
        
        let contextText = "Corporate Office Work";
        if(window.Arbor && window.Arbor.content) {
            try { 
                const c = await window.Arbor.content.getNext(); 
                if(c) contextText = c.text;
            } catch(e) { console.log("Offline Mode"); }
        }
        this.contextText = contextText;

        if(window.Arbor && window.Arbor.ai) {
             try {
                const prompt = `
                Context: "${contextText.substring(0,800)}".
                Generate JSON:
                { "company": "Company Name", "depts": ["Dept1", "Dept2", "Dept3"], "interview": [{"q":"Question?", "keywords":["k1"]}] }
                `;
                const res = await window.Arbor.ai.chat([{role:'user',content:prompt}]);
                const clean = res.text.replace(/```json/g,'').replace(/```/g,'');
                const json = JSON.parse(clean);
                
                this.data.company = json.company;
                this.data.depts = json.depts;
                if (json.interview) this.interviewQuestions = json.interview;

             } catch(e) { console.error("AI Error", e); }
        }

        setTimeout(() => {
            this.interviewRound = 0;
            this.interviewScore = 0;
            this.state = 'INTERVIEW_INPUT';
            this.prepareInterviewUI();
        }, 2500);
    }

    getHumanSprite(shirt, hair, isVendor) {
        const key = `${shirt}-${hair}-${isVendor}`;
        if (!this.humanCache[key]) {
            this.humanCache[key] = SpriteGen.human(shirt, hair, isVendor);
        }
        return this.humanCache[key];
    }

    prepareInterviewUI() {
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskHeader.innerText = `CALL: RECRUITER [${this.interviewRound+1}/${this.interviewQuestions.length}]`;
        this.els.taskPrompt.innerText = ""; 
        this.els.taskInput.placeholder = "ANSWER HERE...";
        this.els.taskInput.value = '';
        this.els.taskInput.focus();
        this.els.taskPrompt.style.display = 'none'; 
    }

    togglePause() { this.paused = !this.paused; }

    resolveInputSubmission() {
        const val = this.els.taskInput.value.trim().toLowerCase();
        if (this.state === 'INTERVIEW_INPUT') this.resolveInterview(val);
        else if (this.state === 'TYPING_TASK') this.resolveGameTask(val);
    }

    resolveInterview(val) {
        const q = this.interviewQuestions[this.interviewRound];
        const hit = q.keywords.some(k => val.includes(k.toLowerCase()));
        this.lastInterviewFeedback = hit || val.length > 4 ? `Recruiter: "Impressive."` : `Recruiter: "Hmm..."`;
        if(hit || val.length > 4) { this.interviewScore++; this.audio.sfxSuccess(); } else this.audio.sfxError();

        this.state = 'INTERVIEW_FEEDBACK';
        this.els.taskOverlay.style.display = 'none'; 

        setTimeout(() => {
            this.interviewRound++;
            if (this.interviewRound >= this.interviewQuestions.length) {
                this.showRecruiterVerdict();
            } else {
                this.state = 'INTERVIEW_INPUT';
                this.prepareInterviewUI();
            }
        }, 2000);
    }

    showRecruiterVerdict() {
        this.state = 'INTERVIEW_RESULT';
        const passed = this.interviewScore >= Math.floor(this.interviewQuestions.length * 0.6);
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskHeader.innerText = "CALL ENDED";
        this.els.taskInput.style.display = 'none';
        this.els.taskPrompt.style.display = 'block';
        this.els.taskSubmit.textContent = "CONTINUE";
        
        if (passed) {
            this.money += 200;
            this.els.taskPrompt.innerText = `HIRED!\nWelcome to ${this.data.company}.\n(+$200 Signing Bonus)`;
            this.els.taskSubmit.onclick = () => {
                this.resetInputUI();
                this.startGameWorld();
            };
        } else {
            this.els.taskPrompt.innerText = `REJECTED.\nTry again.`;
            this.els.taskSubmit.onclick = () => window.location.reload();
        }
    }

    resetInputUI() {
        this.els.taskOverlay.style.display = 'none';
        this.els.taskInput.style.display = 'block';
        this.els.taskPrompt.style.display = 'block';
        this.els.taskSubmit.textContent = "EXECUTE";
        this.els.taskSubmit.onclick = () => this.resolveInputSubmission(); 
    }

    startGameWorld() {
        this.building.generate(this.data.depts);
        this.state = 'PLAY';
        this.stress = 0;
        this.score = 0;
        this.showMessage(`BIENVENIDO A ${this.data.company.toUpperCase()}`);
        this.player.vx = this.player.x * CONFIG.TILE;
        this.player.vy = this.player.y * CONFIG.TILE;
        
        // Slower task generation
        if(this.taskInterval) clearInterval(this.taskInterval);
        this.taskInterval = setInterval(() => this.triggerPhoneCall(), 8000);
    }

    triggerPhoneCall() {
        if(this.state !== 'PLAY' || this.phone.targetNPC || this.paused || this.shop.active) return;
        
        // Find a random worker in offices (skip Lobby & Cafe)
        const officeFloors = this.building.floors.slice(2);
        if (officeFloors.length === 0) return;
        
        const floorIdx = Math.floor(Math.random() * officeFloors.length) + 2; // +2 offset
        const floor = this.building.floors[floorIdx];
        
        if(floor.npcs && floor.npcs.length > 0) {
            const npc = floor.npcs[Math.floor(Math.random()*floor.npcs.length)];
            
            this.phone.targetNPC = npc;
            this.phone.active = false;
            this.phone.ringing = true;
            this.phone.caller = npc.role;
            this.phone.floorName = floor.name;
            this.phone.floorZ = floorIdx;
            
            // Generate message
            const taskTypes = ["Ayuda con la impresora", "Bug crítico", "Cliente enojado", "Falta café"];
            const taskName = taskTypes[Math.floor(Math.random()*taskTypes.length)];
            this.phone.msg = `Ven a ${floor.name} (Piso ${floorIdx}). ${taskName}.`;
            
            npc.task = { type: 'TICKET' };
            this.audio.sfxPhone();
        }
    }

    loop(now) {
        this.frame++;
        if (!this.paused) this.update(now);
        this.draw();
        requestAnimationFrame(this.loop);
    }

    update(now) {
        if (this.state === 'PLAY') {
            
            // --- MOVEMENT ---
            const targetX = this.player.x * CONFIG.TILE;
            const targetY = this.player.y * CONFIG.TILE;
            this.player.vx += (targetX - this.player.vx) * CONFIG.ANIM_SPEED;
            this.player.vy += (targetY - this.player.vy) * CONFIG.ANIM_SPEED;

            // --- NPC UPDATES ---
            const f = this.building.floors[this.player.z];
            if (f.npcs) {
                f.npcs.forEach(npc => {
                    if (typeof npc.vx === 'undefined') { npc.vx = npc.x * CONFIG.TILE; npc.vy = npc.y * CONFIG.TILE; }
                    
                    if (npc.task || npc.isVendor || npc.role === 'Receptionist') {
                        // Stationary
                        npc.vx = (npc.x * CONFIG.TILE);
                        npc.vy = (npc.y * CONFIG.TILE);
                    } else {
                        // Wander
                        npc.moveTimer++;
                        if (npc.moveTimer > 150 && Math.random() < 0.02) {
                            const dirs = [{x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}];
                            const d = dirs[Math.floor(Math.random()*dirs.length)];
                            const nx = npc.x + d.x;
                            const ny = npc.y + d.y;
                            if (f.map[ny] && f.map[ny][nx] !== 1 && (nx !== this.player.x || ny !== this.player.y)) {
                                 npc.x = nx; npc.y = ny;
                            }
                            npc.moveTimer = 0;
                        }
                        npc.vx += (npc.x * CONFIG.TILE - npc.vx) * 0.1;
                        npc.vy += (npc.y * CONFIG.TILE - npc.vy) * 0.1;
                    }
                });
            }
            
            // --- STRESS & STATUS ---
            if (!this.shop.active && !this.phone.active) {
                // Reduced stress accumulation (was 0.015)
                this.stress += 0.005;
                if (this.phone.targetNPC) this.stress += 0.01; // Stress while task pending
                
                if (this.stress >= this.maxStress) {
                    this.state = 'GAMEOVER';
                    this.msg.text = "BURNOUT - GAME OVER";
                    this.audio.sfxBurnout();
                    clearInterval(this.taskInterval);
                }
            }
            
            if (this.speedBoost > 0) this.speedBoost--;

            // --- PLAYER INPUT ---
            if(this.shop.active) {
                if (this.input.consume('UP')) { this.shop.selected = Math.max(0, this.shop.selected-1); this.audio.sfxSelect(); }
                if (this.input.consume('DOWN')) { this.shop.selected = Math.min(this.shop.items.length-1, this.shop.selected+1); this.audio.sfxSelect(); }
                if (this.input.consume('A')) this.buyItem();
                if (this.input.consume('B')) this.shop.active = false;
            } 
            else if (this.phone.active) {
                if (this.input.consume('A') || this.input.consume('B')) {
                    this.phone.active = false;
                    this.phone.ringing = false;
                }
            }
            else {
                // Answer Phone
                if (this.phone.ringing && this.input.consume('A')) {
                    this.phone.active = true;
                    this.phone.ringing = false;
                    this.audio.sfxSelect();
                }

                // Move
                const delay = this.speedBoost > 0 ? CONFIG.MOVE_DELAY * 0.6 : CONFIG.MOVE_DELAY;
                if(now - this.player.lastMove > delay) {
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

                if(this.input.consume('A')) this.checkInteract();
            }
        }
        
        // Camera
        if (this.state === 'PLAY') {
            // Keep player centered but clamped to map
            const pX = this.player.vx;
            const pY = this.player.vy;
            let targetCX = pX - (CONFIG.W / 2) + (CONFIG.TILE/2); // Center
            // Shift camera left to make room for HUD on right
            targetCX += 20; 

            const floor = this.building.floors[this.player.z];
            const maxW = (floor.map[0].length * CONFIG.TILE);
            const maxH = (floor.map.length * CONFIG.TILE);
            
            targetCX = Math.max(0, Math.min(targetCX, maxW - CONFIG.W + 40)); // Allow right space
            const targetCY = Math.max(0, Math.min(pY - (CONFIG.H/2), maxH - CONFIG.H));

            this.camera.x += (targetCX - this.camera.x) * 0.1;
            this.camera.y += (targetCY - this.camera.y) * 0.1;
        }
    }

    movePlayer(dx, dy) {
        const f = this.building.floors[this.player.z];
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;
        const t = f.map[ny][nx];
        if (t === 1 || t === 8) { this.audio.sfxBump(); return; } // Wall, Counter

        const hitNPC = f.npcs ? f.npcs.find(n => n.x === nx && n.y === ny) : null;
        if (hitNPC) {
            this.audio.sfxBump();
            if (hitNPC.isVendor) {
                this.openShop();
            } else if (hitNPC === this.phone.targetNPC) {
                this.startMinigame(hitNPC);
            } else {
                this.showMessage(`${hitNPC.role}: "Estoy ocupado."`);
            }
            return; 
        }

        this.player.x = nx; this.player.y = ny;
        this.audio.sfxMove();

        // Stairs Logic
        if(t === 3 && this.player.z < this.building.floors.length-1) {
            this.player.z++;
            const spawn = this.building.floors[this.player.z].spawns.down;
            this.setPlayerPos(spawn.x, spawn.y);
            this.showMessage(`${this.building.floors[this.player.z].name}`);
        }
        else if(t === 4 && this.player.z > 0) {
            this.player.z--;
            const spawn = this.building.floors[this.player.z].spawns.up;
            this.setPlayerPos(spawn.x, spawn.y);
            this.showMessage(`${this.building.floors[this.player.z].name}`);
        }
    }

    setPlayerPos(x, y) {
        this.player.x = x; this.player.y = y;
        this.player.vx = x * CONFIG.TILE;
        this.player.vy = y * CONFIG.TILE;
    }

    checkInteract() {
        const f = this.building.floors[this.player.z];
        // Check adjacent
        const dirs = [{x:0,y:0}, {x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}];
        
        for (let d of dirs) {
            const tx = this.player.x + d.x;
            const ty = this.player.y + d.y;
            
            // NPC
            const npc = f.npcs.find(n => n.x === tx && n.y === ty);
            if (npc) {
                if (npc.isVendor) { this.openShop(); return; }
                if (npc === this.phone.targetNPC) { this.startMinigame(npc); return; }
            }
        }
    }

    openShop() {
        this.shop.active = true;
        this.shop.selected = 0;
        this.audio.sfxSelect();
    }

    buyItem() {
        const item = this.shop.items[this.shop.selected];
        if (this.money >= item.cost) {
            this.money -= item.cost;
            this.stress = Math.max(0, this.stress + item.stress);
            if(item.speed) this.speedBoost = 600; // 10 seconds approx
            this.audio.sfxEat();
            this.showMessage(`¡${item.n} consumido!`);
            this.shop.active = false;
        } else {
            this.audio.sfxError();
            this.showMessage("Fondos insuficientes.");
        }
    }

    async startMinigame(npc) {
        this.state = 'LOADING_TASK';
        this.currentNPC = npc;
        this.audio.sfxSelect();
        
        // Clear phone state
        this.phone.targetNPC = null;
        this.phone.active = false;
        this.phone.ringing = false;

        let q = { text: "El sistema falló.", answer: "reboot" };
        
        if(window.Arbor && window.Arbor.ai) {
            const p = `Context: ${this.contextText.substring(0,600)}. 
            Task: Generate a user complaint.
            Lang: Spanish.
            JSON: {"text":"'Problem description' (max 6 words)", "answer":"OneWordSolution"}`;
            try {
                const res = await window.Arbor.ai.chat([{role:'user',content:p}]);
                q = JSON.parse(res.text.replace(/```json/g,'').replace(/```/g,''));
            } catch(e) {}
        }

        this.currentTaskData = q;
        this.state = 'TYPING_TASK';
        
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskHeader.innerText = `HELP: ${npc.role.toUpperCase()}`;
        this.els.taskPrompt.style.display = 'block';
        this.els.taskPrompt.innerText = `"${q.text}"`;
        this.els.taskInput.style.display = 'block';
        this.els.taskInput.value = '';
        this.els.taskInput.placeholder = "SOLUTION...";
        this.els.taskInput.focus();
    }

    async resolveGameTask(val) {
        const correct = this.currentTaskData.answer.toLowerCase();
        this.els.taskOverlay.style.display = 'none';

        if(val.includes(correct) || correct.includes(val)) {
            const reward = 150;
            this.score += reward;
            this.money += reward;
            this.stress = Math.max(0, this.stress - 20); // Big relief
            
            this.showMessage(`¡GRACIAS! +$${reward}`);
            this.audio.sfxCash();
            
            this.currentNPC.task = null;
            this.tasksSolved++;
            if (this.tasksSolved % 3 === 0) await this.advanceCurriculum();
        } else {
            this.stress += 15;
            this.showMessage(`FALLÓ...`);
            this.audio.sfxError();
        }
        
        this.state = 'PLAY';
    }
    
    async advanceCurriculum() {
        if (window.Arbor && window.Arbor.content && window.Arbor.content.getNext) {
             try {
                 const nextChunk = await window.Arbor.content.getNext();
                 if (nextChunk && nextChunk.text) {
                     this.contextText = nextChunk.text;
                     this.showMessage("¡MANUAL ACTUALIZADO!");
                 }
             } catch(e) {}
        }
    }

    showMessage(txt) {
        this.msg.text = txt;
        this.msg.timer = 180; 
    }

    draw() {
        this.ctx.fillStyle = Palette.bg;
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);

        if(this.state === 'CONNECTING_CALL' || this.state === 'LOADING' || this.state === 'LOADING_TASK') {
            this.drawLoading(this.state === 'CONNECTING_CALL' ? "CONNECTING..." : "LOADING...");
            return;
        }

        if(this.state === 'INTERVIEW_INPUT' || this.state === 'INTERVIEW_FEEDBACK' || this.state === 'INTERVIEW_RESULT') {
            this.drawVideoCall();
            return;
        }

        if(this.state === 'GAMEOVER') {
            this.drawGameOver();
            return;
        }

        // Camera Transform
        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        const f = this.building.floors[this.player.z];
        const tSize = CONFIG.TILE;
        const startX = Math.floor(this.camera.x / tSize);
        const startY = Math.floor(this.camera.y / tSize);
        const endX = startX + (CONFIG.W / tSize) + 1;
        const endY = startY + (CONFIG.H / tSize) + 1;

        // Map
        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y>=0 && y<f.map.length && x>=0 && x<f.map[0].length) {
                    const t = f.map[y][x];
                    let spriteX = t * 16;
                    this.ctx.drawImage(this.sprites.tiles, spriteX, 0, 16, 16, x*tSize, y*tSize, tSize, tSize);
                }
            }
        }

        // NPCs
        if (f.npcs) {
            f.npcs.forEach(npc => {
                const bob = Math.sin(this.frame * 0.2) * 2;
                let sprite = this.getHumanSprite(npc.shirt || '#64748b', npc.hair || '#000', npc.isVendor);
                
                // Shadow
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.fillRect(npc.vx+2, npc.vy+12, 12, 4);

                this.ctx.drawImage(sprite, npc.vx, npc.vy + bob);
                
                // Target Marker (Only show if this is the active mission target)
                if(npc === this.phone.targetNPC) {
                    const yOff = Math.sin(this.frame * 0.3) * 3;
                    this.ctx.fillStyle = '#ef4444'; 
                    this.ctx.fillRect(npc.vx+4, npc.vy - 14 + yOff, 8, 8);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 8px monospace';
                    this.ctx.fillText("!", npc.vx + 6, npc.vy - 7 + yOff);
                }
            });
        }

        // Player
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(this.player.vx+2, this.player.vy+12, 12, 4);
        this.ctx.drawImage(this.sprites.hero, this.player.vx, this.player.vy);
        
        this.ctx.restore();
        
        if (this.state !== 'TYPING_TASK') {
            this.drawHUD();
            this.drawPhone();
            if(this.shop.active) this.drawShop();
        }
    }

    drawHUD() {
        // Top Bar
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        this.ctx.fillRect(0,0,CONFIG.W, 20);
        this.ctx.fillStyle = Palette.text;
        this.ctx.font = '10px "Chakra Petch", monospace';
        
        // Stats
        this.ctx.fillStyle = '#84cc16'; 
        this.ctx.fillText(`$${this.money}`, 10, 14);
        
        // Stress Bar
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(CONFIG.W/2 - 40, 6, 80, 8); 
        const stressPct = Math.min(1, this.stress / this.maxStress);
        let stressColor = Palette.stress_low;
        if(stressPct > 0.5) stressColor = Palette.stress_med;
        if(stressPct > 0.8) stressColor = Palette.stress_high;
        this.ctx.fillStyle = stressColor;
        this.ctx.fillRect(CONFIG.W/2 - 39, 7, 78 * stressPct, 6); 
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '8px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("ESTRÉS", CONFIG.W/2, 13);
        
        // Right Side Elevator Panel
        const panelW = 40;
        const panelX = CONFIG.W - panelW;
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        this.ctx.fillRect(panelX, 20, panelW, CONFIG.H - 20);
        this.ctx.strokeStyle = '#334155';
        this.ctx.beginPath(); this.ctx.moveTo(panelX, 20); this.ctx.lineTo(panelX, CONFIG.H); this.ctx.stroke();

        this.ctx.textAlign = 'center';
        this.ctx.font = '8px monospace';
        
        // Draw Floors in reverse order (Top floor at top of UI)
        for(let i = this.building.floors.length - 1; i >= 0; i--) {
            const f = this.building.floors[i];
            const y = 30 + ((this.building.floors.length - 1 - i) * 16);
            
            // Highlight current
            if (this.player.z === i) {
                this.ctx.fillStyle = '#22d3ee';
                this.ctx.fillRect(panelX + 4, y - 6, panelW - 8, 12);
                this.ctx.fillStyle = '#000';
            } else {
                this.ctx.fillStyle = '#64748b';
            }
            
            let label = i === 0 ? "LOBBY" : (i === 1 ? "CAFE" : `F-${i}`);
            this.ctx.fillText(label, panelX + (panelW/2), y + 2);
        }

        this.ctx.textAlign = 'left';

        // Message Toast
        if(this.msg.timer > 0) {
            this.msg.timer--;
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, CONFIG.H-30, CONFIG.W-panelW, 30);
            this.ctx.fillStyle = '#facc15';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.msg.text, (CONFIG.W-panelW)/2, CONFIG.H-12);
            this.ctx.textAlign = 'left';
        }
    }

    drawPhone() {
        // Vibrating effect
        if (this.phone.ringing) {
            const shake = Math.sin(this.frame * 0.8) * 3;
            this.ctx.fillStyle = Palette.phone_bg;
            this.ctx.strokeStyle = '#ef4444';
            this.ctx.lineWidth = 2;
            const px = CONFIG.W - 70;
            const py = CONFIG.H - 50;
            
            this.ctx.fillRect(px, py + shake, 20, 30);
            this.ctx.strokeRect(px, py + shake, 20, 30);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '8px monospace';
            this.ctx.fillText("CALL", px-20, py+15+shake);
            this.ctx.fillText("(A)", px-15, py+25+shake);
            return;
        }

        if (this.phone.active) {
            // Full Phone UI overlay
            const w = 160;
            const h = 100;
            const x = (CONFIG.W/2) - (w/2);
            const y = (CONFIG.H/2) - (h/2);

            this.ctx.fillStyle = Palette.phone_bg;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeStyle = '#334155';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(x,y,w,h);
            
            // Screen
            this.ctx.fillStyle = Palette.phone_screen;
            this.ctx.fillRect(x+10, y+10, w-20, h-20);
            
            // Text
            this.ctx.fillStyle = '#22d3ee';
            this.ctx.font = '10px "Chakra Petch"';
            this.ctx.fillText(`FROM: ${this.phone.caller}`, x+15, y+25);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '9px monospace';
            // Wrap text logic simplistic
            const words = this.phone.msg.split(' ');
            let line = "";
            let ly = y + 45;
            for(let word of words) {
                if ((line + word).length * 5 > w-30) {
                    this.ctx.fillText(line, x+15, ly);
                    line = word + " ";
                    ly += 12;
                } else {
                    line += word + " ";
                }
            }
            this.ctx.fillText(line, x+15, ly);

            // Button hint
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("[A] OK", x + w/2, y + h - 5);
            this.ctx.textAlign = 'left';
        }
    }

    drawShop() {
        const w = 200;
        const h = 140;
        const x = (CONFIG.W/2) - (w/2);
        const y = (CONFIG.H/2) - (h/2);

        // Window
        this.ctx.fillStyle = '#4a044e';
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px "Chakra Petch"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("CAFETERÍA - MENÚ", x + w/2, y + 20);

        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';
        
        let iy = y + 40;
        this.shop.items.forEach((item, i) => {
            if (i === this.shop.selected) {
                this.ctx.fillStyle = '#facc15';
                this.ctx.fillText("> " + item.n, x + 20, iy);
            } else {
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText("  " + item.n, x + 20, iy);
            }
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`$${item.cost}`, x + w - 20, iy);
            this.ctx.textAlign = 'left';
            iy += 20;
        });
        
        // Info footer
        const selItem = this.shop.items[this.shop.selected];
        this.ctx.fillStyle = '#22d3ee';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`EFECTO: ${selItem.stress} Estrés` + (selItem.speed ? " + VELOCIDAD" : ""), x + w/2, y + h - 30);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText("[A] COMPRAR   [B] SALIR", x + w/2, y + h - 10);
        this.ctx.textAlign = 'left';
    }

    drawVideoCall() {
        this.ctx.fillStyle = '#1e293b'; 
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(40, 20, CONFIG.W-80, 140);
        this.ctx.strokeStyle = '#475569';
        this.ctx.strokeRect(40, 20, CONFIG.W-80, 140);

        const faceX = (CONFIG.W/2) - 32;
        const faceY = 50;
        this.ctx.drawImage(this.sprites.recruiter, faceX, faceY);

        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath(); this.ctx.arc(50, 30, 3, 0, Math.PI*2); this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '8px monospace';
        this.ctx.fillText("REC", 58, 33);
        this.ctx.fillText(this.data.company.toUpperCase() + " HR", 50, 150);
        
        const cx = CONFIG.W/2;
        this.ctx.fillStyle = '#334155';
        this.ctx.beginPath(); this.ctx.arc(cx-20, 200, 12, 0, Math.PI*2); this.ctx.fill(); 
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath(); this.ctx.arc(cx+20, 200, 12, 0, Math.PI*2); this.ctx.fill(); 
        this.ctx.fillStyle = '#334155';
        this.ctx.beginPath(); this.ctx.arc(cx, 200, 12, 0, Math.PI*2); this.ctx.fill(); 

        this.ctx.fillStyle = '#22d3ee';
        this.ctx.textAlign = 'center';
        this.ctx.font = '10px "Chakra Petch"';
        
        if (this.state === 'INTERVIEW_FEEDBACK') {
             this.ctx.fillStyle = '#facc15';
             this.ctx.fillText(this.lastInterviewFeedback, cx, 180);
        } else {
             const q = this.interviewQuestions[this.interviewRound];
             this.ctx.fillText(`"${q.q}"`, cx, 180);
        }
        this.ctx.textAlign = 'left';
    }

    drawLoading(text) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        const cx = CONFIG.W/2;
        const cy = CONFIG.H/2;
        const t = this.frame * 0.1;
        this.ctx.strokeStyle = '#22d3ee';
        this.ctx.beginPath(); this.ctx.arc(cx, cy, 20, t, t+4); this.ctx.stroke();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px "Chakra Petch", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, cx, cy + 40);
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
