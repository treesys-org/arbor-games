
/**
 * PRIMER TRABAJO: RPG EDITION
 * A Retro Office RPG running on HTML5 Canvas.
 */

// --- 1. ASSET GENERATION (Procedural Pixel Art) ---
const Palette = {
    black: '#0f172a',
    white: '#f8fafc',
    skin: '#ffdab9',
    grass: '#4ade80',
    floor: '#e2e8f0',
    wall: '#64748b',
    desk: '#a16207',
    ui_bg: '#f8fafc',
    ui_border: '#334155',
    hair_hero: '#3b82f6',
    hair_boss: '#94a3b8'
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
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(2, 12, 12, 3);
            // Body
            ctx.fillStyle = Palette.white; // White shirt (Office Style)
            ctx.fillRect(4, 8, 8, 6);
            // Head
            ctx.fillStyle = Palette.skin;
            ctx.fillRect(4, 2, 8, 7);
            // Hat/Hair
            ctx.fillStyle = Palette.black;
            ctx.fillRect(4, 2, 8, 3);
            ctx.fillRect(10, 2, 4, 4); // Cap rim
        });
    }

    static boss() {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(2, 12, 12, 3);
            ctx.fillStyle = '#1e293b'; // Suit
            ctx.fillRect(3, 8, 10, 7);
            ctx.fillStyle = Palette.skin;
            ctx.fillRect(4, 1, 8, 7);
            ctx.fillStyle = '#94a3b8'; // Grey Hair
            ctx.fillRect(3, 1, 10, 2);
            ctx.fillRect(3, 1, 2, 6);
            ctx.fillRect(11, 1, 2, 6);
            // Glasses
            ctx.fillStyle = '#000';
            ctx.fillRect(5, 4, 6, 1);
        });
    }

    static npc() {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(2, 12, 12, 3);
            ctx.fillStyle = '#22c55e'; // Green shirt
            ctx.fillRect(4, 8, 8, 6);
            ctx.fillStyle = Palette.skin;
            ctx.fillRect(4, 2, 8, 7);
            ctx.fillStyle = '#ca8a04'; // Brown hair
            ctx.fillRect(4, 1, 8, 3);
        });
    }

    static tiles() {
        const sheet = document.createElement('canvas');
        sheet.width = 64; sheet.height = 16;
        const ctx = sheet.getContext('2d');
        
        // 0: Floor
        ctx.fillStyle = Palette.floor;
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#cbd5e1'; // Detail
        ctx.fillRect(0, 0, 16, 1);
        ctx.fillRect(0, 0, 1, 16);

        // 1: Wall
        ctx.fillStyle = Palette.wall;
        ctx.fillRect(16, 0, 16, 16);
        ctx.fillStyle = '#475569';
        ctx.fillRect(16, 12, 16, 4); // Baseboard

        // 2: Desk (Top)
        ctx.fillStyle = Palette.desk;
        ctx.fillRect(32, 2, 16, 12);
        ctx.fillStyle = '#fef3c7'; // Paper
        ctx.fillRect(36, 4, 8, 6);

        // 3: Plant
        ctx.fillStyle = Palette.floor;
        ctx.fillRect(48, 0, 16, 16);
        ctx.fillStyle = '#854d0e'; // Pot
        ctx.fillRect(52, 10, 8, 4);
        ctx.fillStyle = Palette.grass; // Leaves
        ctx.beginPath(); ctx.arc(56, 8, 5, 0, Math.PI*2); ctx.fill();

        return sheet;
    }
}

// --- 2. ENGINE & INPUT ---

const KEYS = {
    UP: ['ArrowUp', 'w'],
    DOWN: ['ArrowDown', 's'],
    LEFT: ['ArrowLeft', 'a'],
    RIGHT: ['ArrowRight', 'd'],
    A: ['z', 'Enter', ' '],
    B: ['x', 'Escape', 'Backspace']
};

class Input {
    constructor() {
        this.keys = {};
        this.pressed = {}; // For single trigger
        
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            this.pressed[e.key] = true;
        });
        window.addEventListener('keyup', e => this.keys[e.key] = false);

        // Touch Bindings
        this.bindTouch('btn-up', 'ArrowUp');
        this.bindTouch('btn-down', 'ArrowDown');
        this.bindTouch('btn-left', 'ArrowLeft');
        this.bindTouch('btn-right', 'ArrowRight');
        this.bindTouch('btn-a', 'z');
        this.bindTouch('btn-b', 'x');
        this.bindTouch('btn-start', 'Enter');
    }

    bindTouch(id, keyName) {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[keyName] = true; this.pressed[keyName] = true; });
        el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[keyName] = false; });
    }

    isDown(action) {
        return KEYS[action].some(k => this.keys[k]);
    }

    isPressed(action) {
        const hit = KEYS[action].some(k => this.pressed[k]);
        if (hit) {
            KEYS[action].forEach(k => this.pressed[k] = false); // Consume
        }
        return hit;
    }
}

// --- 3. GAME LOGIC ---

const TILE_SIZE = 16;
const MAP_W = 10;
const MAP_H = 9; // Fits in 160x144 (10x9 tiles)

// 0: Floor, 1: Wall, 2: Desk, 3: Plant
const MAP_DATA = [
    [1,1,1,1,1,1,1,1,1,1],
    [1,3,0,0,0,0,0,0,3,1], // Row 1: Plants
    [1,0,0,2,0,0,2,0,0,1], // Row 2: Desks
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,2,0,2,0,2,0,0,1], // Row 4: Desks
    [1,0,0,0,0,0,0,0,0,1],
    [1,3,0,0,0,0,0,0,3,1],
    [1,1,1,0,0,1,1,1,1,1], // Door at bottom
    [1,1,1,0,0,1,1,1,1,1] 
];

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new Input();
        
        // Assets
        this.sprites = {
            hero: SpriteGen.hero(),
            boss: SpriteGen.boss(),
            npc: SpriteGen.npc(),
            tiles: SpriteGen.tiles()
        };

        // Game State
        this.state = 'START'; // START, MENU, WORLD, DIALOGUE, TASK_MODE
        this.dialogueQueue = [];
        this.menuOptions = [];
        this.menuSelection = 0;
        
        // Entities
        this.player = { x: 4, y: 7, facing: 'up', moving: false };
        this.npcs = [
            { x: 4, y: 1, sprite: this.sprites.boss, name: "BOSS" }, // Boss at top center
            { x: 2, y: 4, sprite: this.sprites.npc, name: "Coworker Dave" }
        ];

        // Data
        this.contextData = null; // Lesson from Arbor
        this.professions = []; // Generated by AI
        this.currentJob = null; // Selected Job
        this.rep = 0;

        // Loop
        this.lastTime = 0;
        requestAnimationFrame(t => this.loop(t));
        
        this.startSequence();
    }

    async startSequence() {
        this.queueDialogue("Welcome to Corp-O-World!");
        this.queueDialogue("I am the CEO.");
        this.queueDialogue("Connecting to HR Server...");
        this.state = 'DIALOGUE';

        // Load content in bg
        try {
            if (window.Arbor && window.Arbor.content) {
                this.contextData = await window.Arbor.content.getNext();
                // Generate jobs immediately
                this.generateProfessions();
            } else {
                // Mock
                this.contextData = { title: "General Knowledge", text: "Study hard." };
                this.professions = [
                    { name: "Intern", desc: "Gets coffee." },
                    { name: "Dev", desc: "Fixes bugs." },
                    { name: "Manager", desc: "Sends emails." }
                ];
            }
        } catch(e) { console.error(e); }
    }

    async generateProfessions() {
        if (!window.Arbor || !window.Arbor.ai) return;
        
        const prompt = `
            Context: "${this.contextData.text.substring(0, 500)}".
            Create 3 distinct RPG-style job classes for this field.
            JSON Output only: [{"name": "Class Name", "desc": "Short description"}]
        `;
        
        try {
            const res = await window.Arbor.ai.chat([{ role: "user", content: prompt }]);
            const json = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
            if (Array.isArray(json)) this.professions = json.slice(0, 3);
        } catch(e) {
            console.error("AI Gen Failed", e);
        }
    }

    loop(time) {
        const dt = time - this.lastTime;
        this.lastTime = time;

        this.update();
        this.draw();
        
        requestAnimationFrame(t => this.loop(t));
    }

    update() {
        if (this.state === 'DIALOGUE') {
            if (this.input.isPressed('A')) {
                this.advanceDialogue();
            }
        }
        else if (this.state === 'MENU') {
            if (this.input.isPressed('UP')) this.menuSelection = Math.max(0, this.menuSelection - 1);
            if (this.input.isPressed('DOWN')) this.menuSelection = Math.min(this.menuOptions.length - 1, this.menuSelection + 1);
            if (this.input.isPressed('A')) this.selectMenuOption();
        }
        else if (this.state === 'WORLD') {
            this.handleMovement();
            if (this.input.isPressed('A')) this.checkInteraction();
        }
        else if (this.state === 'TASK_MODE') {
            if (this.input.isPressed('UP')) this.menuSelection = Math.max(0, this.menuSelection - 1);
            if (this.input.isPressed('DOWN')) this.menuSelection = Math.min(this.menuOptions.length - 1, this.menuSelection + 1);
            if (this.input.isPressed('A')) this.resolveTaskOption();
        }
    }

    handleMovement() {
        if (this.player.moving) return; // Simple grid lock

        let dx = 0, dy = 0;
        if (this.input.isDown('UP')) dy = -1;
        else if (this.input.isDown('DOWN')) dy = 1;
        else if (this.input.isDown('LEFT')) dx = -1;
        else if (this.input.isDown('RIGHT')) dx = 1;

        if (dx !== 0 || dy !== 0) {
            const tx = this.player.x + dx;
            const ty = this.player.y + dy;
            
            // Bounds
            if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return;
            
            // Collision (Walls=1, Desks=2, Plant=3, Boss=NPC)
            if (MAP_DATA[ty][tx] !== 0) return;
            if (this.npcs.some(n => n.x === tx && n.y === ty)) return;

            // Move
            this.player.x = tx;
            this.player.y = ty;
            
            // Random Encounter (Sudden Task)
            if (Math.random() < 0.15) {
                this.startTask();
            }
        }
    }

    checkInteraction() {
        // Simple 1 tile check in front? Let's just check proximity for simplicity
        const n = this.npcs.find(npc => Math.abs(npc.x - this.player.x) + Math.abs(npc.y - this.player.y) <= 1);
        if (n) {
            if (n.name === "BOSS") {
                this.queueDialogue("BOSS: Get back to work!");
                this.queueDialogue(`Current Rep: ${this.rep}`);
            } else {
                this.queueDialogue(`${n.name}: Don't deploy on Fridays.`);
            }
            this.state = 'DIALOGUE';
        }
    }

    // --- DIALOGUE SYSTEM ---
    queueDialogue(text) {
        this.dialogueQueue.push(text);
    }

    advanceDialogue() {
        if (this.dialogueQueue.length > 0) {
            this.dialogueQueue.shift();
        }
        
        if (this.dialogueQueue.length === 0) {
            // End of conversation
            if (!this.currentJob && this.professions.length > 0) {
                this.openJobMenu();
            } else {
                this.state = 'WORLD';
            }
        }
    }

    // --- MENU SYSTEM (Jobs) ---
    openJobMenu() {
        this.state = 'MENU';
        this.menuOptions = this.professions.map(p => p.name);
        this.menuSelection = 0;
        this.menuPrompt = "Choose your Career:";
    }

    selectMenuOption() {
        this.currentJob = this.professions[this.menuSelection];
        this.state = 'WORLD';
        this.queueDialogue(`You are now a ${this.currentJob.name}!`);
        this.queueDialogue("Walk around to find tasks.");
        this.state = 'DIALOGUE';
        
        // Spawn player at door
        this.player.x = 4;
        this.player.y = 8;
    }

    // --- BATTLE SYSTEM (Tasks) ---
    async startTask() {
        this.state = 'TASK_LOADING'; // Block input
        
        // Generate Task
        let taskName = "Critical Issue";
        let question = "Is 1+1=2?";
        let answers = ["Yes", "No"];
        let correct = 0;

        if (window.Arbor && window.Arbor.ai) {
             const prompt = `
                Job: ${this.currentJob.name}.
                Generate a sudden office problem (Task Title) and a multiple choice question to solve it.
                JSON: {"title": "Title", "q": "Question", "opts": ["A","B"], "correctIndex": 0}
             `;
             try {
                const res = await window.Arbor.ai.chat([{role:'user', content:prompt}]);
                const data = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
                taskName = data.title || data.enemy;
                question = data.q;
                answers = data.opts;
                correct = data.correctIndex;
             } catch(e) { console.log(e); }
        }

        this.taskData = { title: taskName, q: question, opts: answers, correct };
        
        this.state = 'TASK_MODE';
        this.menuOptions = answers;
        this.menuSelection = 0;
        this.menuPrompt = `Task Incoming: ${taskName}!\n${question}`;
    }

    resolveTaskOption() {
        const isCorrect = this.menuSelection === this.taskData.correct;
        if (isCorrect) {
            this.rep += 10;
            this.queueDialogue("Ticket Closed! +10 Rep.");
            if (window.Arbor && window.Arbor.game) window.Arbor.game.addXP(10);
        } else {
            this.rep -= 5;
            this.queueDialogue("Issue Escalated. -5 Rep.");
        }
        this.state = 'DIALOGUE';
    }


    // --- RENDERING ---
    draw() {
        // Clear
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, 160, 144);

        if (this.state === 'START' || this.state === 'TASK_LOADING' || this.state === 'DIALOGUE_LOADING') {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '8px "Press Start 2P"';
            this.ctx.fillText("LOADING...", 60, 72);
            return;
        }

        if (this.state === 'WORLD' || this.state === 'DIALOGUE') {
            this.drawWorld();
        }

        if (this.state === 'MENU' || this.state === 'TASK_MODE') {
            // If in battle, maybe draw background?
            this.drawMenu();
        }

        if (this.state === 'DIALOGUE') {
            this.drawTextBox(this.dialogueQueue[0]);
        }
    }

    drawWorld() {
        // 1. Map
        for(let y=0; y<MAP_H; y++) {
            for(let x=0; x<MAP_W; x++) {
                const tileId = MAP_DATA[y][x];
                this.ctx.drawImage(this.sprites.tiles, tileId*16, 0, 16, 16, x*16, y*16, 16, 16);
            }
        }
        
        // 2. NPCs
        this.npcs.forEach(n => {
             this.ctx.drawImage(n.sprite, n.x*16, n.y*16);
        });

        // 3. Player
        this.ctx.drawImage(this.sprites.hero, this.player.x*16, this.player.y*16);
    }

    drawTextBox(text) {
        if (!text) return;
        
        const h = 48;
        const y = 144 - h;
        
        // Box
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, y, 160, h);
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(2, y+2, 156, h-4);
        
        // Text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '8px "Press Start 2P"';
        this.ctx.textBaseline = 'top';
        
        // Simple word wrap
        const words = text.split(' ');
        let line = '';
        let ly = y + 8;
        
        for(let w of words) {
            const testLine = line + w + ' ';
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > 146 && line !== '') {
                this.ctx.fillText(line, 8, ly);
                line = w + ' ';
                ly += 10;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, 8, ly);
        
        // Cursor blink
        if (Date.now() % 1000 < 500) {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.fillRect(150, 135, 6, 6);
        }
    }

    drawMenu() {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, 160, 144); // Clear screen for menu
        
        this.ctx.fillStyle = '#000';
        this.ctx.font = '8px "Press Start 2P"';
        
        // Header
        const headerLines = this.menuPrompt ? this.menuPrompt.split('\n') : ["Select:"];
        headerLines.forEach((l, i) => {
             this.ctx.fillText(l, 8, 16 + (i*10));
        });

        // Options
        const startY = 50;
        this.menuOptions.forEach((opt, i) => {
            if (i === this.menuSelection) {
                this.ctx.fillText(">", 8, startY + (i*15));
            }
            this.ctx.fillText(opt, 20, startY + (i*15));
        });
        
        // Description (if Job Select)
        if (this.state === 'MENU' && this.professions[this.menuSelection]) {
            const desc = this.professions[this.menuSelection].desc;
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(desc.substring(0, 20) + "...", 8, 130);
        }
    }
}

// Start Game
window.onload = () => {
    new Game();
};
