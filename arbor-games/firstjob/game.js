
/**
 * FIRST JOB: CORP SIM (REMASTERED v4.0)
 * Entry point for logic and state management.
 */

import { CONFIG, Palette, AudioSynth, Input, SpriteGen, setTheme } from './core.js';
import { Building } from './world.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.input = new Input();
        this.audio = new AudioSynth();
        this.building = new Building();
        this.paused = false;
        
        // Asset Cache
        this.sprites = {
            hero: SpriteGen.hero,
            tiles: SpriteGen.tiles, // Generated with default palette initially
            recruiter: SpriteGen.recruiterFace
        };
        this.humanCache = {};

        // Game State
        this.state = 'INIT'; 
        this.frame = 0;
        this.data = { company: "Arbor Corp", depts: ["Sales", "HR", "Dev"] };
        this.player = { x: 10, y: 6, z: 0, vx: 160, vy: 96, lastMove: 0 };
        this.camera = { x: 0, y: 0 };
        
        // Systems
        this.phone = { active: false, ringing: false, timer: 0, caller: "", floorName: "", targetNPC: null, msg: "" };
        this.shop = { active: false, items: [
            {n: "Café", cost: 40, stress: -20},
            {n: "Sandwich", cost: 80, stress: -50},
            {n: "Energía", cost: 120, stress: -30, speed: true}
        ], selected: 0 };
        
        // Stats
        this.speedBoost = 0;
        this.memories = {}; 
        this.score = 0;
        this.money = 0;
        this.tasksSolved = 0; 
        this.taskAttempts = 5; // New: 5 Attempts per task
        this.stress = 0; 
        this.maxStress = 100;
        this.msg = { text: "", timer: 0 };
        
        // Prologue Data
        this.prologueLines = [
            "SYSTEM BOOT...",
            "YEAR 20XX.",
            "THE JOB MARKET HAS COLLAPSED.",
            "ONLY THE ADAPTABLE SURVIVE.",
            "YOU HAVE ONE CHANCE.",
            "DON'T. MESS. IT. UP."
        ];
        this.prologueIndex = 0;

        // Interview Data (Default 6 Questions)
        this.interviewQuestions = [
            { q: "Who are you?", keywords: ["hard", "worker", "passionate", "motivated", "learner"] },
            { q: "Why this company?", keywords: ["growth", "values", "best", "future", "money"] },
            { q: "What is your weakness?", keywords: ["perfectionist", "care", "details", "workaholic"] },
            { q: "Define success.", keywords: ["results", "impact", "profit", "completion", "winning"] },
            { q: "Handle pressure?", keywords: ["calm", "focus", "organize", "breathe", "prioritize"] },
            { q: "Salary expectations?", keywords: ["fair", "market", "negotiable", "high", "growth"] }
        ];
        this.interviewRound = 0;
        this.interviewScore = 0;

        // UI Refs
        this.els = {
            taskOverlay: document.getElementById('task-input-layer'),
            taskHeader: document.getElementById('term-header'),
            taskPrompt: document.getElementById('task-prompt-text'),
            taskInput: document.getElementById('task-answer-input'),
            taskSubmit: document.getElementById('btn-submit-task'),
            pauseBtn: document.getElementById('btn-pause')
        };
        
        this.bindEvents();
        this.init();
    }

    bindEvents() {
        this.els.taskSubmit.addEventListener('click', () => this.resolveInputSubmission());
        this.els.pauseBtn.addEventListener('click', () => this.togglePause());
        this.loop = this.loop.bind(this);
        
        // Mobile tap for Game Over restart
        this.canvas.addEventListener('click', () => {
            if (this.state === 'GAMEOVER') window.location.reload();
        });
    }

    async init() {
        this.state = 'PROLOGUE'; // Start with Prologue
        requestAnimationFrame(this.loop);
        
        // Load Save
        if (window.Arbor && window.Arbor.storage) {
            try {
                const saved = await window.Arbor.storage.load('career_save_v1');
                if (saved) {
                    this.money = saved.money || 0;
                    this.tasksSolved = saved.tasksSolved || 0;
                    this.memories = saved.memories || {};
                }
            } catch(e) { console.warn("Save load error:", e); }
        }

        // Load Content
        let contextText = "Corporate Office Work";
        if(window.Arbor && window.Arbor.content) {
            try { 
                const c = await window.Arbor.content.getNext(); 
                if(c && c.text) contextText = c.text;
            } catch(e) {}
        }
        this.contextText = contextText;

        // AI Setup
        if(window.Arbor && window.Arbor.ai) {
             try {
                // Request 6 questions + THEME
                // Updated to allow 'lab' instead of 'startup'
                const prompt = `
                Context: "${contextText.substring(0,800)}".
                Determine the industry of this profession and choose a 'theme' from: ['corporate', 'lab', 'studio', 'industrial'].
                Generate JSON:
                { 
                  "company": "Company Name", 
                  "theme": "corporate",
                  "depts": ["Dept1", "Dept2", "Dept3"], 
                  "interview": [{"q":"Question (Max 6 words)?", "keywords":["key1", "key2"]}] 
                }
                Make sure 'interview' has exactly 6 items.
                `;
                const json = await window.Arbor.ai.askJSON(prompt);
                
                // Apply Data
                this.data.company = json.company;
                this.data.depts = json.depts;
                
                // Apply Theme
                if (json.theme) {
                    console.log("Applying Skin:", json.theme);
                    setTheme(json.theme);
                    // Regenerate Sprites with new colors
                    this.sprites.tiles = SpriteGen.tiles; 
                    this.sprites.hero = SpriteGen.hero; // Re-gen hero to match potential theme nuance
                }

                if (json.interview && json.interview.length >= 2) this.interviewQuestions = json.interview;
             } catch(e) { console.error("AI Error", e); }
        }
    }

    saveGame() {
        if (window.Arbor && window.Arbor.storage) {
            window.Arbor.storage.save('career_save_v1', {
                money: this.money,
                tasksSolved: this.tasksSolved,
                memories: this.memories,
                timestamp: Date.now()
            });
        }
    }

    getHumanSprite(shirt, hair, isVendor) {
        const key = `${shirt}-${hair}-${isVendor}`;
        if (!this.humanCache[key]) {
            this.humanCache[key] = SpriteGen.human(shirt, hair, isVendor);
        }
        return this.humanCache[key];
    }

    /* --- PROLOGUE --- */
    updatePrologue() {
        if (this.input.consume('A') || this.input.consume('B')) {
            this.audio.sfxSelect();
            this.prologueIndex++;
            if (this.prologueIndex >= this.prologueLines.length) {
                this.startInterviewSequence();
            }
        }
    }

    startInterviewSequence() {
        this.state = 'CONNECTING_CALL';
        this.interviewRound = 0;
        this.interviewScore = 0;
        setTimeout(() => {
            this.state = 'INTERVIEW_INPUT';
            this.prepareInterviewUI();
        }, 2000);
    }

    /* --- INTERVIEW LOGIC --- */
    prepareInterviewUI() {
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskOverlay.classList.add('interview-mode');
        
        let headerText = `INTERVIEW [${this.interviewRound+1}/${this.interviewQuestions.length}]`;
        if (this.interviewRound === 0 && this.memories.rejections > 0) {
             headerText += ` (TRY #${this.memories.rejections + 1})`;
        }
        
        const q = this.interviewQuestions[this.interviewRound];
        this.els.taskHeader.innerText = headerText;
        this.els.taskPrompt.style.display = 'block';
        this.els.taskPrompt.innerText = `REC: "${q.q}"`;
        this.els.taskInput.style.display = 'block';
        this.els.taskSubmit.style.display = 'block';
        this.els.taskInput.value = '';
        this.els.taskInput.focus();
    }

    resolveInputSubmission() {
        const val = this.els.taskInput.value.trim().toLowerCase();
        if (val.length === 0) return;

        if (this.state === 'INTERVIEW_INPUT') this.resolveInterview(val);
        else if (this.state === 'TYPING_TASK') this.resolveGameTask(val);
    }

    resolveInterview(val) {
        const q = this.interviewQuestions[this.interviewRound];
        const hit = q.keywords.some(k => val.includes(k.toLowerCase()));
        const effort = val.length > 1; // Basic validation
        const success = hit || effort; // Simplified logic, keywords are bonus in this version

        if (success) { 
            this.interviewScore++; 
            this.audio.sfxSuccess();
            this.lastInterviewFeedback = `Recruiter: "Good answer."`;
        } else { 
            this.audio.sfxError(); 
            this.lastInterviewFeedback = `Recruiter: "I disagree."`;
        }

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
        this.els.taskOverlay.classList.remove('interview-mode');
        // Need to pass at least 50%
        const passed = this.interviewScore >= Math.floor(this.interviewQuestions.length * 0.5);
        
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskHeader.innerText = "CALL ENDED";
        this.els.taskInput.style.display = 'none';
        this.els.taskPrompt.style.display = 'block';
        this.els.taskSubmit.textContent = "CONTINUE";
        
        if (passed) {
            this.money += 200;
            this.memories.hired = true;
            this.saveGame();
            this.els.taskPrompt.innerText = `APPROVED (${this.interviewScore}/${this.interviewQuestions.length})\nWelcome to ${this.data.company}.\n(+$200 Bonus)`;
            this.els.taskSubmit.onclick = () => {
                this.resetInputUI();
                this.startGameWorld();
            };
        } else {
            this.memories.rejections = (this.memories.rejections || 0) + 1;
            this.saveGame();
            this.els.taskPrompt.innerText = `REJECTED (${this.interviewScore}/${this.interviewQuestions.length})\nNot a match.\nTry again?`;
            this.els.taskSubmit.onclick = () => window.location.reload();
        }
    }

    resetInputUI() {
        this.els.taskOverlay.style.display = 'none';
        this.els.taskInput.style.display = 'block';
        this.els.taskPrompt.style.display = 'block';
        this.els.taskSubmit.style.display = 'block';
        this.els.taskSubmit.textContent = "EXECUTE";
        this.els.taskSubmit.onclick = () => this.resolveInputSubmission(); 
    }

    /* --- GAME LOOP & WORLD LOGIC --- */
    startGameWorld() {
        this.building.generate(this.data.depts);
        this.state = 'PLAY';
        this.stress = 0;
        this.score = 0;
        this.showMessage(`BIENVENIDO A ${this.data.company.toUpperCase()}`);
        
        // Initial Camera snap
        this.player.vx = this.player.x * CONFIG.TILE;
        this.player.vy = this.player.y * CONFIG.TILE;
        this.camera.x = this.player.vx - (CONFIG.W/2);
        this.camera.y = this.player.vy - (CONFIG.H/2);
        
        if(this.taskInterval) clearInterval(this.taskInterval);
        this.taskInterval = setInterval(() => this.triggerPhoneCall(), 8000);
    }

    triggerPhoneCall() {
        if(this.state !== 'PLAY' || this.phone.targetNPC || this.paused || this.shop.active) return;
        
        const officeFloors = this.building.floors.slice(2);
        if (officeFloors.length === 0) return;
        
        const floorIdx = Math.floor(Math.random() * officeFloors.length) + 2;
        const floor = this.building.floors[floorIdx];
        
        if(floor.npcs && floor.npcs.length > 0) {
            const npc = floor.npcs[Math.floor(Math.random()*floor.npcs.length)];
            
            this.phone.targetNPC = npc;
            this.phone.active = false;
            this.phone.ringing = true;
            this.phone.caller = npc.role;
            this.phone.floorName = floor.name;
            
            const taskTypes = ["Ayuda impresora", "Bug crítico", "Cliente enojado", "Falta café"];
            const taskName = taskTypes[Math.floor(Math.random()*taskTypes.length)];
            this.phone.msg = `Ve a ${floor.name} (Piso ${floorIdx}). ${taskName}.`;
            
            npc.task = { type: 'TICKET' };
            this.audio.sfxPhone();
        }
    }

    togglePause() { this.paused = !this.paused; }

    loop(now) {
        this.frame++;
        
        if (this.state === 'PROLOGUE') {
            this.updatePrologue();
            this.draw(); // Prologue has unique draw
        } else if (this.state === 'GAMEOVER') {
            // Ensure inputs are checked
            if (this.input.consume('A')) window.location.reload();
            this.draw();
        } else {
            if (!this.paused) this.update(now);
            this.draw();
        }
        
        requestAnimationFrame(this.loop);
    }

    update(now) {
        if (this.state === 'PLAY') {
            this.updatePlayer(now);
            this.updateNPCs();
            this.updateSystem();
            this.updateCamera();
        }
    }

    updatePlayer(now) {
        // Shop Interaction
        if(this.shop.active) {
            if (this.input.consume('UP')) { this.shop.selected = Math.max(0, this.shop.selected-1); this.audio.sfxSelect(); }
            if (this.input.consume('DOWN')) { this.shop.selected = Math.min(this.shop.items.length-1, this.shop.selected+1); this.audio.sfxSelect(); }
            if (this.input.consume('A')) this.buyItem();
            if (this.input.consume('B')) this.shop.active = false;
            return;
        } 
        
        // Phone Interaction
        if (this.phone.active) {
            if (this.input.consume('A') || this.input.consume('B')) {
                this.phone.active = false;
                this.phone.ringing = false;
            }
            return;
        }

        // Answer Phone
        if (this.phone.ringing && this.input.consume('A')) {
            this.phone.active = true;
            this.phone.ringing = false;
            this.audio.sfxSelect();
            return;
        }

        // Movement
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
        
        // Lerp Visuals
        const targetX = this.player.x * CONFIG.TILE;
        const targetY = this.player.y * CONFIG.TILE;
        this.player.vx += (targetX - this.player.vx) * CONFIG.ANIM_SPEED;
        this.player.vy += (targetY - this.player.vy) * CONFIG.ANIM_SPEED;
    }

    movePlayer(dx, dy) {
        const f = this.building.floors[this.player.z];
        
        // Try axis-aligned sliding logic for better feel
        const tryMove = (ox, oy) => {
            const nx = this.player.x + ox;
            const ny = this.player.y + oy;
            if (ny < 0 || ny >= f.map.length || nx < 0 || nx >= f.map[0].length) return false;

            const t = f.map[ny][nx];
            if (t === 1 || t === 8) return false; // Wall or Solid

            const hitNPC = f.npcs ? f.npcs.find(n => n.x === nx && n.y === ny) : null;
            if (hitNPC) {
                this.interactNPC(hitNPC);
                return false; 
            }
            
            this.player.x = nx; 
            this.player.y = ny;
            
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
            return true;
        };

        if (tryMove(dx, dy)) {
            this.audio.sfxMove();
        } else {
            this.audio.sfxBump();
        }
    }

    setPlayerPos(x, y) {
        this.player.x = x; this.player.y = y;
        this.player.vx = x * CONFIG.TILE;
        this.player.vy = y * CONFIG.TILE;
    }

    updateNPCs() {
        const f = this.building.floors[this.player.z];
        if (!f.npcs) return;
        
        f.npcs.forEach(npc => {
            if (typeof npc.vx === 'undefined') { npc.vx = npc.x * CONFIG.TILE; npc.vy = npc.y * CONFIG.TILE; }
            
            if (npc.task || npc.isVendor || npc.role === 'Receptionist') {
                npc.vx = (npc.x * CONFIG.TILE);
                npc.vy = (npc.y * CONFIG.TILE);
            } else {
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
                // Smooth move
                npc.vx += (npc.x * CONFIG.TILE - npc.vx) * 0.1;
                npc.vy += (npc.y * CONFIG.TILE - npc.vy) * 0.1;
            }
        });
    }

    updateSystem() {
        this.stress += 0.005;
        if (this.phone.targetNPC) this.stress += 0.01;
        
        if (this.stress >= this.maxStress) {
            this.state = 'GAMEOVER';
            this.msg.text = "BURNOUT - GAME OVER";
            this.audio.sfxBurnout();
            clearInterval(this.taskInterval);
        }
        
        if (this.speedBoost > 0) this.speedBoost--;
    }

    updateCamera() {
        const pX = this.player.vx;
        const pY = this.player.vy;
        let targetCX = pX - (CONFIG.W / 2) + (CONFIG.TILE/2) + 20; // Offset for HUD
        const floor = this.building.floors[this.player.z];
        const maxW = (floor.map[0].length * CONFIG.TILE);
        const maxH = (floor.map.length * CONFIG.TILE);
        
        targetCX = Math.max(0, Math.min(targetCX, maxW - CONFIG.W + 40));
        const targetCY = Math.max(0, Math.min(pY - (CONFIG.H/2), maxH - CONFIG.H));

        // Smoother Lerp
        this.camera.x += (targetCX - this.camera.x) * 0.08;
        this.camera.y += (targetCY - this.camera.y) * 0.08;
    }

    interactNPC(npc) {
        if (npc.isVendor) {
            this.openShop();
        } else if (npc === this.phone.targetNPC) {
            this.startMinigame(npc);
        } else {
            this.showMessage(`${npc.role}: "Estoy ocupado."`);
        }
    }

    checkInteract() {
        const f = this.building.floors[this.player.z];
        const dirs = [{x:0,y:0}, {x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}];
        for (let d of dirs) {
            const tx = this.player.x + d.x;
            const ty = this.player.y + d.y;
            const npc = f.npcs.find(n => n.x === tx && n.y === ty);
            if (npc) { this.interactNPC(npc); return; }
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
            if(item.speed) this.speedBoost = 600; 
            this.saveGame();
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
        this.taskAttempts = 5; // Reset attempts to 5
        
        this.els.taskOverlay.classList.remove('interview-mode');
        this.phone.targetNPC = null;
        this.phone.active = false;
        this.phone.ringing = false;

        let q = { text: "El sistema falló.", answer: "reboot" };
        
        if(window.Arbor && window.Arbor.ai) {
            const p = `Context: ${this.contextText.substring(0,600)}. 
            Task: Generate a user complaint.
            Lang: Spanish.
            JSON: {"text":"'Problem description' (max 6 words)", "answer":"OneWordSolution"}`;
            try { q = await window.Arbor.ai.askJSON(p); } catch(e) {}
        }

        this.currentTaskData = q;
        this.state = 'TYPING_TASK';
        
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskHeader.innerText = `TICKET: ${npc.role.toUpperCase()} | ATTEMPTS: ${this.taskAttempts}`;
        this.els.taskPrompt.style.display = 'block';
        this.els.taskPrompt.innerText = `"${q.text}"`;
        this.els.taskInput.style.display = 'block';
        this.els.taskSubmit.style.display = 'block';
        this.els.taskInput.value = '';
        this.els.taskInput.placeholder = "SOLUTION...";
        this.els.taskInput.focus();
    }

    async resolveGameTask(val) {
        const correct = this.currentTaskData.answer.toLowerCase();
        const hit = val.includes(correct) || correct.includes(val);

        if (hit) {
            // SUCCESS
            this.els.taskOverlay.style.display = 'none';
            const reward = 150;
            this.score += reward;
            this.money += reward;
            this.stress = Math.max(0, this.stress - 20); 
            this.saveGame();
            this.showMessage(`¡GRACIAS! +$${reward}`);
            this.audio.sfxCash();
            this.currentNPC.task = null;
            this.tasksSolved++;
            this.state = 'PLAY';
        } else {
            // FAIL ATTEMPT
            this.taskAttempts--;
            this.audio.sfxError();
            
            if (this.taskAttempts > 0) {
                // Retry
                this.els.taskHeader.innerText = `WRONG! ATTEMPTS: ${this.taskAttempts}`;
                this.els.taskPrompt.innerText = `"${this.currentTaskData.text}"\n(Try Again!)`;
                this.els.taskInput.value = '';
                this.els.taskInput.focus();
            } else {
                // FINAL FAIL
                this.els.taskOverlay.style.display = 'none';
                this.stress += 25; // Big Penalty
                this.showMessage(`¡TICKET FALLIDO! +ESTRÉS`);
                this.state = 'PLAY';
            }
        }
    }

    showMessage(txt) {
        this.msg.text = txt;
        this.msg.timer = 180; 
    }

    /* --- RENDERING --- */
    draw() {
        // Clear based on Theme Palette
        this.ctx.fillStyle = Palette.bg;
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);

        if(this.state === 'PROLOGUE') {
            this.drawPrologue();
            return;
        }

        if(this.state === 'CONNECTING_CALL' || this.state === 'LOADING' || this.state === 'LOADING_TASK') {
            this.drawLoading(this.state === 'CONNECTING_CALL' ? "CONNECTING CALL..." : "LOADING...");
            return;
        }

        if(this.state.startsWith('INTERVIEW')) {
            this.drawVideoCall();
            return;
        }

        if(this.state === 'GAMEOVER') {
            this.drawGameOver();
            return;
        }

        this.drawWorld();
        
        if (this.state !== 'TYPING_TASK') {
            this.drawHUD();
            this.drawPhone();
            if(this.shop.active) this.drawShop();
        }
    }

    drawPrologue() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        
        const line = this.prologueLines[this.prologueIndex];
        
        this.ctx.fillStyle = Palette.text;
        this.ctx.textAlign = 'center';
        this.ctx.font = '16px "Chakra Petch"';
        this.ctx.fillText(line, CONFIG.W/2, CONFIG.H/2);
        
        this.ctx.font = '10px monospace';
        this.ctx.fillStyle = '#94a3b8';
        if (Math.floor(this.frame / 30) % 2 === 0) {
            this.ctx.fillText("[PRESS A]", CONFIG.W/2, CONFIG.H - 40);
        }
        this.ctx.textAlign = 'left';
    }

    drawWorld() {
        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        const f = this.building.floors[this.player.z];
        const tSize = CONFIG.TILE;
        const startX = Math.floor(this.camera.x / tSize);
        const startY = Math.floor(this.camera.y / tSize);
        const endX = startX + (CONFIG.W / tSize) + 2;
        const endY = startY + (CONFIG.H / tSize) + 2;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y>=0 && y<f.map.length && x>=0 && x<f.map[0].length) {
                    const t = f.map[y][x];
                    let spriteX = t * 16;
                    this.ctx.drawImage(this.sprites.tiles, spriteX, 0, 16, 16, x*tSize, y*tSize, tSize, tSize);
                }
            }
        }

        if (f.npcs) {
            f.npcs.forEach(npc => {
                const bob = Math.sin(this.frame * 0.2) * 2;
                let sprite = this.getHumanSprite(npc.shirt || '#64748b', npc.hair || '#000', npc.isVendor);
                
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.fillRect(npc.vx+2, npc.vy+12, 12, 4);
                this.ctx.drawImage(sprite, npc.vx, npc.vy + bob);
                
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

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(this.player.vx+2, this.player.vy+12, 12, 4);
        this.ctx.drawImage(this.sprites.hero, this.player.vx, this.player.vy);
        
        this.ctx.restore();
    }

    drawHUD() {
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        this.ctx.fillRect(0,0,CONFIG.W, 20);
        this.ctx.fillStyle = Palette.text;
        this.ctx.font = '10px "Chakra Petch", monospace';
        this.ctx.fillText(`$${this.money}`, 10, 14);
        
        // Stress
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(CONFIG.W/2 - 40, 6, 80, 8); 
        const stressPct = Math.min(1, this.stress / this.maxStress);
        let stressColor = stressPct > 0.8 ? Palette.stress_high : (stressPct > 0.5 ? Palette.stress_med : Palette.stress_low);
        this.ctx.fillStyle = stressColor;
        this.ctx.fillRect(CONFIG.W/2 - 39, 7, 78 * stressPct, 6); 
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = '8px monospace';
        this.ctx.fillText("ESTRÉS", CONFIG.W/2, 13);
        
        // Elevator Panel
        const panelW = 40;
        const panelX = CONFIG.W - panelW;
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        this.ctx.fillRect(panelX, 20, panelW, CONFIG.H - 20);
        this.ctx.strokeStyle = '#334155';
        this.ctx.beginPath(); this.ctx.moveTo(panelX, 20); this.ctx.lineTo(panelX, CONFIG.H); this.ctx.stroke();

        this.ctx.textAlign = 'center';
        this.ctx.font = '8px monospace';
        for(let i = this.building.floors.length - 1; i >= 0; i--) {
            const y = 30 + ((this.building.floors.length - 1 - i) * 16);
            if (this.player.z === i) {
                this.ctx.fillStyle = Palette.text;
                this.ctx.fillRect(panelX + 4, y - 6, panelW - 8, 12);
                this.ctx.fillStyle = '#000';
            } else {
                this.ctx.fillStyle = '#64748b';
            }
            let label = i === 0 ? "LOBBY" : (i === 1 ? "CAFE" : `F-${i}`);
            this.ctx.fillText(label, panelX + (panelW/2), y + 2);
        }
        this.ctx.textAlign = 'left';

        // Toast
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
        if (this.phone.ringing) {
            // Enhanced visual for ringing
            const shake = Math.sin(this.frame * 0.8) * 3;
            // Flashing background
            this.ctx.fillStyle = (Math.floor(this.frame/10)%2===0) ? '#ef4444' : '#facc15';
            
            const w = 60; // Bigger
            const h = 40;
            const px = CONFIG.W - 80;
            const py = CONFIG.H - 60;
            
            this.ctx.fillRect(px, py + shake, w, h);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(px, py + shake, w, h);
            
            this.ctx.fillStyle = '#000';
            this.ctx.font = '10px "Chakra Petch"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("INCOMING!", px + w/2, py + 15 + shake);
            
            // Pulsing button prompt
            const scale = 1 + Math.sin(this.frame * 0.2) * 0.2;
            this.ctx.font = `bold ${10 * scale}px monospace`;
            this.ctx.fillText("PRESS [A]", px + w/2, py + 30 + shake);
            
            this.ctx.textAlign = 'left';
            return;
        }

        if (this.phone.active) {
            const w = 160; const h = 100;
            const x = (CONFIG.W/2) - (w/2);
            const y = (CONFIG.H/2) - (h/2);
            this.ctx.fillStyle = Palette.phone_bg;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeStyle = '#334155';
            this.ctx.strokeRect(x,y,w,h);
            this.ctx.fillStyle = Palette.phone_screen;
            this.ctx.fillRect(x+10, y+10, w-20, h-20);
            
            this.ctx.fillStyle = Palette.text;
            this.ctx.font = '10px "Chakra Petch"';
            this.ctx.fillText(`FROM: ${this.phone.caller}`, x+15, y+25);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '9px monospace';
            const words = this.phone.msg.split(' ');
            let line = ""; let ly = y + 45;
            for(let word of words) {
                if ((line + word).length * 5 > w-30) {
                    this.ctx.fillText(line, x+15, ly);
                    line = word + " "; ly += 12;
                } else line += word + " ";
            }
            this.ctx.fillText(line, x+15, ly);
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("[A] OK", x + w/2, y + h - 5);
            this.ctx.textAlign = 'left';
        }
    }

    drawShop() {
        const w = 200; const h = 140;
        const x = (CONFIG.W/2) - (w/2);
        const y = (CONFIG.H/2) - (h/2);
        this.ctx.fillStyle = Palette.floor_cafe;
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(x, y, w, h);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px "Chakra Petch"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("CAFETERÍA - MENÚ", x + w/2, y + 20);

        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';
        
        let iy = y + 40;
        this.shop.items.forEach((item, i) => {
            this.ctx.fillStyle = i === this.shop.selected ? '#facc15' : '#fff';
            this.ctx.fillText((i===this.shop.selected ? "> " : "  ") + item.n, x + 20, iy);
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`$${item.cost}`, x + w - 20, iy);
            this.ctx.textAlign = 'left';
            iy += 20;
        });
        
        const selItem = this.shop.items[this.shop.selected];
        this.ctx.fillStyle = Palette.text;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`EFECTO: ${selItem.stress} Estrés` + (selItem.speed ? " + VELOCIDAD" : ""), x + w/2, y + h - 30);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText("[A] COMPRAR   [B] SALIR", x + w/2, y + h - 10);
        this.ctx.textAlign = 'left';
    }

    drawVideoCall() {
        this.ctx.fillStyle = Palette.bg; 
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        this.ctx.fillStyle = Palette.floor;
        this.ctx.fillRect(40, 20, CONFIG.W-80, 140);
        this.ctx.strokeStyle = '#475569';
        this.ctx.strokeRect(40, 20, CONFIG.W-80, 140);

        const faceX = (CONFIG.W/2) - 32;
        this.ctx.drawImage(this.sprites.recruiter, faceX, 50);

        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath(); this.ctx.arc(50, 30, 3, 0, Math.PI*2); this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '8px monospace';
        this.ctx.fillText("REC", 58, 33);
        this.ctx.fillText(this.data.company.toUpperCase() + " HR", 50, 130); 
        
        const cx = CONFIG.W/2;
        this.ctx.fillStyle = Palette.text;
        this.ctx.textAlign = 'center';
        this.ctx.font = '10px "Chakra Petch"';
        
        if (this.state === 'INTERVIEW_FEEDBACK') {
             this.ctx.fillStyle = '#facc15';
             this.ctx.fillText(this.lastInterviewFeedback, cx, 150);
        }
        this.ctx.textAlign = 'left';
    }

    drawLoading(text) {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        const cx = CONFIG.W/2;
        const cy = CONFIG.H/2;
        const t = this.frame * 0.1;
        this.ctx.strokeStyle = Palette.text;
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
            this.ctx.fillText("PRESS [A] TO RESTART", CONFIG.W/2, CONFIG.H/2 + 40);
        }
        this.ctx.textAlign = 'left';
    }
}

// Entry Point
document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    new Game();
});
