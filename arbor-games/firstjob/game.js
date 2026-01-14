

/**
 * FIRST JOB: CORP SIM (REMASTERED v4.0)
 * Entry point for logic and state management.
 */

import { CONFIG, Palette, AudioSynth, Input, SpriteGen, setTheme } from './core.js';
import { Building } from './world.js';

// --- I18N & INITIALIZATION ---
const translations = {
    EN: {
        // Start Screen
        START_SHIFT: "START SHIFT",
        START_DESC: "CONTEXTUAL JOB SIMULATOR.<br><br>- SURVIVE the interview with your knowledge.<br>- EARN MONEY ($) by solving tickets.<br>- ANSWERS based on your current lesson.<br>- BUY TEA to reduce stress.",
        // Controls
        MOVE_DESC: "WASD / ARROWS<br>TO MOVE",
        ACTION_DESC: "Z / ENTER = A<br>X / ESC = B",
        BACK_LABEL: "BACK",
        ACT_LABEL: "ACT",
        // In-Game
        WELCOME_MSG: "WELCOME TO {company}",
        BUSY_MSG: `"{role}": "I'm busy."`,
        FUNDS_MSG: "Insufficient funds.",
        CONSUMED_MSG: "{item} consumed!",
        INCOMING_CALL: "INCOMING!",
        PRESS_A: "PRESS [A]",
        FROM: "FROM: {caller}",
        OK: "OK",
        STRESS: "STRESS",
        SHOP_TITLE: "CAFETERIA - MENU",
        EFFECT: "EFFECT: {stress} Stress",
        SPEED_BONUS: " + SPEED",
        BUY: "BUY",
        EXIT: "EXIT",
        // Interview & Tasks
        INTERVIEW: "INTERVIEW",
        RETRY: " (TRY #{num})",
        CALL_ENDED: "CALL ENDED",
        APPROVED: "APPROVED ({score}/{total})\nWelcome to {company}.\n(+$200 Bonus)",
        REJECTED: "REJECTED ({score}/{total})\nNot a match.\nTry again?",
        CONTINUE: "CONTINUE",
        EVALUATING: "EVALUATING...",
        SUBMITTING: "SUBMITTING...",
        EXECUTE: "EXECUTE",
        TICKET: "TICKET",
        ATTEMPTS: "ATTEMPTS: {num}",
        SOLUTION_PLACEHOLDER: "SOLUTION...",
        TICKET_FAILED: `TICKET FAILED. "{reply}"`,
        WRONG_ATTEMPTS: "WRONG! ATTEMPTS: {num}",
        // Game Over
        GAME_OVER: "GAME OVER",
        BURNOUT: "BURNOUT - GAME OVER",
        RESTART: "PRESS [A] TO RESTART",
        // Loading
        CONNECTING: "CONNECTING CALL...",
        LOADING: "LOADING...",
        // Floors
        LOBBY: "LOBBY",
        CAFE: "CAFE",
        FLOOR: "F-{num}"
    },
    ES: {
        // Start Screen
        START_SHIFT: "INICIAR TURNO",
        START_DESC: "SIMULADOR DE EMPLEO CONTEXTUAL.<br><br>- SUPERVIVE a la entrevista con tus conocimientos.<br>- GANA DINERO ($) resolviendo tickets.<br>- RESPUESTAS basadas en tu lección actual.<br>- COMPRA TÉ para reducir el estrés.",
        // Controls
        MOVE_DESC: "WASD / FLECHAS<br>PARA MOVER",
        ACTION_DESC: "Z / ENTER = A<br>X / ESC = B",
        BACK_LABEL: "VOLVER",
        ACT_LABEL: "ACCIÓN",
        // In-Game
        WELCOME_MSG: "BIENVENIDO A {company}",
        BUSY_MSG: `"{role}": "Estoy ocupado."`,
        FUNDS_MSG: "Fondos insuficientes.",
        CONSUMED_MSG: "¡{item} consumido!",
        INCOMING_CALL: "¡LLAMADA!",
        PRESS_A: "PULSA [A]",
        FROM: "DE: {caller}",
        OK: "OK",
        STRESS: "ESTRÉS",
        SHOP_TITLE: "CAFETERÍA - MENÚ",
        EFFECT: "EFECTO: {stress} Estrés",
        SPEED_BONUS: " + VELOCIDAD",
        BUY: "COMPRAR",
        EXIT: "SALIR",
        // Interview & Tasks
        INTERVIEW: "ENTREVISTA",
        RETRY: " (INTENTO #{num})",
        CALL_ENDED: "LLAMADA FINALIZADA",
        APPROVED: "APROBADO ({score}/{total})\nBienvenido a {company}.\n(Bono +$200)",
        REJECTED: "RECHAZADO ({score}/{total})\nNo eres compatible.\n¿Intentar de nuevo?",
        CONTINUE: "CONTINUAR",
        EVALUATING: "EVALUANDO...",
        SUBMITTING: "ENVIANDO...",
        EXECUTE: "EJECUTAR",
        TICKET: "TICKET",
        ATTEMPTS: "INTENTOS: {num}",
        SOLUTION_PLACEHOLDER: "SOLUCIÓN...",
        TICKET_FAILED: `TICKET FALLIDO. "{reply}"`,
        WRONG_ATTEMPTS: "¡ERROR! INTENTOS: {num}",
        // Game Over
        GAME_OVER: "GAME OVER",
        BURNOUT: "BURNOUT - GAME OVER",
        RESTART: "PULSA [A] PARA REINICIAR",
        // Loading
        CONNECTING: "CONECTANDO LLAMADA...",
        LOADING: "CARGANDO...",
        // Floors
        LOBBY: "LOBBY",
        CAFE: "CAFETERÍA",
        FLOOR: "P-{num}"
    }
};

const lang = (window.Arbor && window.Arbor.user && translations[window.Arbor.user.lang.toUpperCase()]) ? window.Arbor.user.lang.toUpperCase() : 'EN';
const i18n = (key, replacements = {}) => {
    let line = translations[lang][key] || translations['EN'][key] || `[${key}]`;
    for (const [k, v] of Object.entries(replacements)) {
        line = line.replace(`{${k}}`, v);
    }
    return line;
};

// Immediately set static HTML text
document.getElementById('btn-start').textContent = i18n('START_SHIFT');
document.getElementById('start-desc').innerHTML = i18n('START_DESC');
document.getElementById('controls-dpad-desc').innerHTML = i18n('MOVE_DESC');
document.getElementById('controls-action-desc').innerHTML = i18n('ACTION_DESC');
document.getElementById('action-b-label').textContent = i18n('BACK_LABEL');
document.getElementById('action-a-label').textContent = i18n('ACT_LABEL');

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.lang = lang;
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

        // Interview Data: Questions are now static, evaluation is by AI
        this.interviewQuestions = [
            { q: this.lang === 'ES' ? "¿Quién eres?" : "Who are you?" },
            { q: this.lang === 'ES' ? "¿Por qué esta empresa?" : "Why this company?" },
            { q: this.lang === 'ES' ? "¿Cuál es tu mayor debilidad?" : "What is your weakness?" },
            { q: this.lang === 'ES' ? "Define el éxito." : "Define success." },
            { q: this.lang === 'ES' ? "¿Cómo manejas la presión?" : "How do you handle pressure?" },
            { q: this.lang === 'ES' ? "¿Expectativas salariales?" : "Salary expectations?" }
        ];
        this.interviewRound = 0;
        this.interviewScore = 0; // Will count approved answers

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
    
    getLine(key, replacements = {}) {
        return i18n(key, replacements);
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
        
        // Load Save Data from Arbor
        try {
            const saved = await window.Arbor.storage.load('career_save_v1');
            if (saved) {
                this.money = saved.money || 0;
                this.tasksSolved = saved.tasksSolved || 0;
                this.memories = saved.memories || {};
            }
        } catch(e) { console.warn("Save load error:", e); }

        // Load Lesson Content from Arbor
        try { 
            const c = await window.Arbor.content.getNext(); 
            this.contextText = c.text;
        } catch(e) {
            this.contextText = "Corporate Office Work"; // Minimal fallback
            console.error("Failed to load lesson context", e);
        }

        // Setup company profile via AI
        try {
            const langName = this.lang === 'ES' ? 'Spanish' : 'English';
            const prompt = `
            [ROLE]
            You are a game content generator for a simulation game.

            [CONTEXT]
            The game's theme is based on this text: "${this.contextText.substring(0, 500)}"

            [TASK]
            Create a corporate profile based on the context. ALL text output must be in ${langName}.
            1. Industry Theme: Choose strictly one from ['corporate', 'lab', 'studio', 'industrial'].
            2. Company Name: A creative name relevant to the context.
            3. Departments: 3 distinct department names.

            [FORMAT]
            Return ONLY valid JSON.
            { 
              "company": "Company Name", 
              "theme": "corporate",
              "depts": ["Dept1", "Dept2", "Dept3"]
            }
            `;
            const json = await window.Arbor.ai.askJSON(prompt);
            
            this.data.company = json.company;
            this.data.depts = json.depts;
            
            if (json.theme) {
                console.log("Applying Skin:", json.theme);
                setTheme(json.theme);
                this.sprites.tiles = SpriteGen.tiles; 
                this.sprites.hero = SpriteGen.hero;
            }
        } catch(e) { 
            console.error("AI Error during company generation", e);
            // The game will proceed with default data if this fails
        }
    }

    saveGame() {
        window.Arbor.storage.save('career_save_v1', {
            money: this.money,
            tasksSolved: this.tasksSolved,
            memories: this.memories,
            timestamp: Date.now()
        });
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
        
        let headerText = `${this.getLine('INTERVIEW')} [${this.interviewRound+1}/${this.interviewQuestions.length}]`;
        if (this.interviewRound === 0 && this.memories.rejections > 0) {
             headerText += this.getLine('RETRY', {num: this.memories.rejections + 1});
        }
        
        const q = this.interviewQuestions[this.interviewRound];
        this.els.taskHeader.innerText = headerText;
        this.els.taskPrompt.style.display = 'block';
        this.els.taskPrompt.innerText = `REC: "${q.q}"`;
        this.els.taskInput.style.display = 'block';
        this.els.taskSubmit.style.display = 'block';
        this.els.taskInput.value = '';
        this.els.taskInput.disabled = false;
        this.els.taskInput.focus();
        this.els.taskSubmit.disabled = false;
        this.els.taskSubmit.textContent = this.getLine('EXECUTE');
    }

    async resolveInputSubmission() {
        const val = this.els.taskInput.value.trim();
        if (val.length === 0) return;

        if (this.state === 'INTERVIEW_INPUT') await this.resolveInterview(val);
        else if (this.state === 'TYPING_TASK') await this.resolveGameTask(val);
    }

    async resolveInterview(val) {
        // UI Feedback: Thinking
        this.els.taskSubmit.disabled = true;
        this.els.taskSubmit.textContent = this.getLine('EVALUATING');
        this.els.taskInput.disabled = true;

        const q = this.interviewQuestions[this.interviewRound];
        const langName = this.lang === 'ES' ? 'Spanish' : 'English';
        
        try {
            const p = `
            [ROLEPLAY]
            You are a demanding HR recruiter for the company "${this.data.company}".
            Your interview is based on this general topic: "${this.contextText.substring(0, 300)}".
            You just asked the candidate: "${q.q}"
            The candidate replied: "${val}"

            [TASK]
            1. Evaluate if this is a good, mediocre, or bad answer for a job interview.
            2. Write a short, in-character response in ${langName} (Max 10 words).
            
            [FORMAT]
            JSON ONLY: { "approved": boolean, "reply": "Your short comment..." }
            `;

            const res = await window.Arbor.ai.askJSON(p);
            
            if (res.approved) { 
                this.interviewScore++; 
                this.audio.sfxSuccess();
            } else { 
                this.audio.sfxError(); 
            }
            this.lastInterviewFeedback = `Recruiter: "${res.reply}"`;

        } catch(e) {
            console.error("AI Interview Error:", e);
            this.lastInterviewFeedback = `Recruiter: "${this.lang === 'ES' ? 'No entiendo tu respuesta.' : 'I do not understand your answer.'}"`;
            this.audio.sfxError();
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
        
        // Pass if at least 3 answers are approved by the AI
        const passed = this.interviewScore >= 3;
        
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskHeader.innerText = this.getLine('CALL_ENDED');
        this.els.taskInput.style.display = 'none';
        this.els.taskPrompt.style.display = 'block';
        this.els.taskSubmit.textContent = this.getLine('CONTINUE');
        
        if (passed) {
            this.money += 200;
            this.memories.hired = true;
            this.saveGame();
            this.els.taskPrompt.innerText = this.getLine('APPROVED', {score: this.interviewScore, total: this.interviewQuestions.length, company: this.data.company});
            this.els.taskSubmit.onclick = () => {
                this.resetInputUI();
                this.startGameWorld();
            };
        } else {
            this.memories.rejections = (this.memories.rejections || 0) + 1;
            this.saveGame();
            this.els.taskPrompt.innerText = this.getLine('REJECTED', {score: this.interviewScore, total: this.interviewQuestions.length});
            this.els.taskSubmit.onclick = () => window.location.reload();
        }
    }

    resetInputUI() {
        this.els.taskOverlay.style.display = 'none';
        this.els.taskInput.style.display = 'block';
        this.els.taskPrompt.style.display = 'block';
        this.els.taskSubmit.style.display = 'block';
        this.els.taskSubmit.textContent = this.getLine('EXECUTE');
        this.els.taskSubmit.disabled = false;
        this.els.taskSubmit.onclick = () => this.resolveInputSubmission(); 
    }

    /* --- GAME LOOP & WORLD LOGIC --- */
    startGameWorld() {
        this.building.generate(this.data.depts);
        this.state = 'PLAY';
        this.stress = 0;
        this.score = 0;
        this.showMessage(this.getLine('WELCOME_MSG', {company: this.data.company.toUpperCase()}));
        
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
            
            const taskTypes = this.lang === 'ES' 
                ? ["Ayuda impresora", "Bug crítico", "Cliente enojado", "Falta café"]
                : ["Printer help", "Critical bug", "Angry client", "Coffee is out"];
            const taskName = taskTypes[Math.floor(Math.random()*taskTypes.length)];
            const floorLabel = this.lang === 'ES' ? `Piso ${floorIdx}` : `Floor ${floorIdx}`;
            this.phone.msg = `${this.lang === 'ES' ? 'Ve a' : 'Go to'} ${floor.name} (${floorLabel}). ${taskName}.`;
            
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
            this.msg.text = this.getLine('BURNOUT');
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
            this.showMessage(this.getLine('BUSY_MSG', {role: npc.role}));
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
            this.showMessage(this.getLine('CONSUMED_MSG', {item: item.n}));
            this.shop.active = false;
        } else {
            this.audio.sfxError();
            this.showMessage(this.getLine('FUNDS_MSG'));
        }
    }

    async startMinigame(npc) {
        this.state = 'LOADING_TASK';
        this.currentNPC = npc;
        this.audio.sfxSelect();
        this.taskAttempts = 5; 
        
        this.els.taskOverlay.classList.remove('interview-mode');
        this.phone.targetNPC = null;
        this.phone.active = false;
        this.phone.ringing = false;

        let q = { role: npc.role, complaint: "System is not working." };
        const langName = this.lang === 'ES' ? 'Spanish' : 'English';
        
        try {
            const p = `
            [CONTEXT]
            The work environment is related to: "${this.contextText.substring(0, 400)}"

            [TASK]
            Generate a single work ticket/complaint for a(n) ${npc.role}.
            1. Language: ${langName}.
            2. Complaint: A brief problem description (max 8 words).

            [FORMAT]
            JSON ONLY: {"role": "${npc.role}", "complaint": "Problem description"}
            `;
            q = await window.Arbor.ai.askJSON(p);
        } catch(e) {
            console.error("AI Task Generation Error:", e);
        }

        this.currentTaskData = q; 
        this.state = 'TYPING_TASK';
        
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskHeader.innerText = `${this.getLine('TICKET')}: ${npc.role.toUpperCase()} | ${this.getLine('ATTEMPTS', {num: this.taskAttempts})}`;
        this.els.taskPrompt.style.display = 'block';
        this.els.taskPrompt.innerText = `"${q.complaint}"`;
        this.els.taskInput.style.display = 'block';
        this.els.taskSubmit.style.display = 'block';
        this.els.taskInput.value = '';
        this.els.taskInput.placeholder = this.getLine('SOLUTION_PLACEHOLDER');
        this.els.taskInput.disabled = false;
        this.els.taskInput.focus();
    }

    async resolveGameTask(val) {
        // UI Feedback: Thinking
        this.els.taskSubmit.disabled = true;
        this.els.taskSubmit.textContent = this.getLine('SUBMITTING');
        this.els.taskInput.disabled = true;
        const langName = this.lang === 'ES' ? 'Spanish' : 'English';

        try {
            const p = `
            [ROLEPLAY]
            You are a ${this.currentTaskData.role} in a company.
            Your current problem is: "${this.currentTaskData.complaint}".
            The IT Support (player) says: "${val}".

            [TASK]
            1. Evaluate if this is a valid/helpful solution to your problem.
            2. Write a short, natural response in ${langName} (Max 8 words).
            3. If it's wrong, give a subtle hint in the response.

            [FORMAT]
            JSON ONLY: { "solved": boolean, "reply": "Your response here" }
            `;

            const res = await window.Arbor.ai.askJSON(p);
            this.finalizeTask(res.solved, res.reply);

        } catch(e) {
            console.error("AI Task Error:", e);
            const errorReply = this.lang === 'ES' ? "Error de sistema. Intenta de nuevo." : "System Error. Try again.";
            this.finalizeTask(false, errorReply);
        }
    }

    finalizeTask(isSolved, replyText) {
        // Restore UI
        this.els.taskSubmit.disabled = false;
        this.els.taskSubmit.textContent = this.getLine('EXECUTE');
        this.els.taskInput.disabled = false;
        this.els.taskInput.focus();

        if (isSolved) {
            // SUCCESS
            this.els.taskOverlay.style.display = 'none';
            const reward = 150;
            this.score += reward;
            this.money += reward;
            this.stress = Math.max(0, this.stress - 20); 
            this.saveGame();
            this.showMessage(`"${replyText}" +$${reward}`);
            this.audio.sfxCash();
            this.currentNPC.task = null;
            this.tasksSolved++;
            this.state = 'PLAY';
        } else {
            // FAIL ATTEMPT
            this.taskAttempts--;
            this.audio.sfxError();
            
            if (this.taskAttempts > 0) {
                // Retry with AI Feedback
                this.els.taskHeader.innerText = this.getLine('WRONG_ATTEMPTS', {num: this.taskAttempts});
                this.els.taskPrompt.innerText = `"${replyText}"`;
                this.els.taskInput.value = '';
            } else {
                // FINAL FAIL
                this.els.taskOverlay.style.display = 'none';
                this.stress += 25; // Big Penalty
                this.showMessage(this.getLine('TICKET_FAILED', {reply: replyText}));
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
            this.drawLoading(this.state === 'CONNECTING_CALL' ? this.getLine('CONNECTING') : this.getLine('LOADING'));
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
            this.ctx.fillText(`[${this.getLine('PRESS_A')}]`, CONFIG.W/2, CONFIG.H - 40);
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
        this.ctx.fillText(this.getLine('STRESS'), CONFIG.W/2, 13);
        
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
            let label = i === 0 ? this.getLine('LOBBY') : (i === 1 ? this.getLine('CAFE') : this.getLine('FLOOR', {num: i}));
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
            const floatY = Math.sin(this.frame * 0.15) * 2;
            this.ctx.fillStyle = '#ef4444';
            const w = 60, h = 40;
            const px = CONFIG.W - 80, py = CONFIG.H - 60;
            
            this.ctx.fillRect(px, py + floatY, w, h);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(px, py + floatY, w, h);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px "Chakra Petch"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.getLine('INCOMING_CALL'), px + w/2, py + 15 + floatY);
            
            const scale = 1 + Math.sin(this.frame * 0.1) * 0.1;
            this.ctx.font = `bold ${10 * scale}px monospace`;
            this.ctx.fillText(this.getLine('PRESS_A'), px + w/2, py + 30 + floatY);
            
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
            this.ctx.fillText(this.getLine('FROM', {caller: this.phone.caller}), x+15, y+25);
            
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
            this.ctx.fillText(`[A] ${this.getLine('OK')}`, x + w/2, y + h - 5);
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
        this.ctx.fillText(this.getLine('SHOP_TITLE'), x + w/2, y + 20);

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
        let effectText = this.getLine('EFFECT', {stress: selItem.stress});
        if (selItem.speed) effectText += this.getLine('SPEED_BONUS');
        
        this.ctx.fillStyle = Palette.text;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(effectText, x + w/2, y + h - 30);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText(`[A] ${this.getLine('BUY')}   [B] ${this.getLine('EXIT')}`, x + w/2, y + h - 10);
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
        this.ctx.fillText(this.getLine('GAME_OVER'), CONFIG.W/2, CONFIG.H/2 - 20);
        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = '#fca5a5';
        this.ctx.fillText(this.msg.text, CONFIG.W/2, CONFIG.H/2 + 10);
        if (Math.floor(this.frame/30) % 2 === 0) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(this.getLine('RESTART'), CONFIG.W/2, CONFIG.H/2 + 40);
        }
        this.ctx.textAlign = 'left';
    }
}

// Entry Point
document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    new Game();
});
