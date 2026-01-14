
/**
 * FIRST JOB: CORP SIM (REMASTERED v4.0)
 * Main entry point. Orchestrates UI, Logic, and Data.
 */

import { CONFIG, Palette, AudioSynth, Input, SpriteGen, setTheme, ParticleSystem, TextManager } from './core.js';
import { Building } from './world.js';
import { GameLogic } from './logic.js';
import { GameUI } from './ui.js';

// --- I18N ---
const translations = {
    EN: {
        START_SHIFT: "START SHIFT",
        START_DESC: "CONTEXTUAL JOB SIMULATOR.<br>- SURVIVE until shift ends.<br>- EARN MONEY ($) by solving tickets.<br>- MANAGE STRESS to avoid burnout.<br>- BUY ITEMS in the cafeteria.",
        MOVE_DESC: "WASD / ARROWS<br>TO MOVE",
        ACTION_DESC: "Z / ENTER = A<br>X / ESC = B",
        BACK_LABEL: "BACK", ACT_LABEL: "ACT",
        WELCOME_MSG: "WELCOME TO {company}",
        BUSY_MSG: `"{role}": "I'm busy."`,
        FUNDS_MSG: "Insufficient funds.",
        CONSUMED_MSG: "{item} consumed!",
        INCOMING_CALL: "INCOMING!",
        PRESS_A: "PRESS [A]",
        FROM: "FROM: {caller}",
        OK: "OK", STRESS: "STRESS",
        SHOP_TITLE: "CAFETERIA - MENU",
        EFFECT: "EFFECT: {stress} Stress",
        SPEED_BONUS: " + SPEED",
        BUY: "BUY", EXIT: "EXIT",
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
        GAME_OVER: "GAME OVER",
        BURNOUT: "BURNOUT - GAME OVER",
        RESTART: "PRESS [A] TO RESTART",
        CONNECTING: "CONNECTING CALL...",
        LOADING: "LOADING...",
        LOBBY: "LOBBY", CAFE: "CAFE", FLOOR: "F-{num}",
        PROLOGUE: ["SYSTEM BOOT...", "YEAR 20XX.", "THE JOB MARKET HAS COLLAPSED.", "ONLY THE ADAPTABLE SURVIVE.", "YOU HAVE ONE CHANCE.", "DON'T. MESS. IT. UP."]
    },
    ES: {
        START_SHIFT: "INICIAR TURNO",
        START_DESC: "SIMULADOR DE EMPLEO CONTEXTUAL.<br>- SOBREVIVE hasta el fin del turno.<br>- GANA DINERO ($) resolviendo tickets.<br>- GESTIONA EL ESTRÉS para no quemarte.<br>- COMPRA ITEMS en la cafetería.",
        MOVE_DESC: "WASD / FLECHAS<br>PARA MOVER",
        ACTION_DESC: "Z / ENTER = A<br>X / ESC = B",
        BACK_LABEL: "VOLVER", ACT_LABEL: "ACCIÓN",
        WELCOME_MSG: "BIENVENIDO A {company}",
        BUSY_MSG: `"{role}": "Estoy ocupado."`,
        FUNDS_MSG: "Fondos insuficientes.",
        CONSUMED_MSG: "¡{item} consumido!",
        INCOMING_CALL: "¡LLAMADA!",
        PRESS_A: "PULSA [A]",
        FROM: "DE: {caller}",
        OK: "OK", STRESS: "ESTRÉS",
        SHOP_TITLE: "CAFETERÍA - MENÚ",
        EFFECT: "EFECTO: {stress} Estrés",
        SPEED_BONUS: " + VELOCIDAD",
        BUY: "COMPRAR", EXIT: "SALIR",
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
        GAME_OVER: "GAME OVER",
        BURNOUT: "BURNOUT - GAME OVER",
        RESTART: "PULSA [A] PARA REINICIAR",
        CONNECTING: "CONECTANDO LLAMADA...",
        LOADING: "CARGANDO...",
        LOBBY: "LOBBY", CAFE: "CAFETERÍA", FLOOR: "P-{num}",
        PROLOGUE: ["INICIANDO SISTEMA...", "AÑO 20XX.", "EL MERCADO LABORAL HA COLAPSADO.", "SOLO LOS ADAPTABLES SOBREVIVEN.", "TIENES UNA OPORTUNIDAD.", "NO. LA. ARRUINES."]
    }
};

const lang = (window.Arbor && window.Arbor.user && translations[window.Arbor.user.lang.toUpperCase()]) ? window.Arbor.user.lang.toUpperCase() : 'EN';
const i18n = (key, replacements = {}) => {
    let line = translations[lang][key] || translations['EN'][key] || `[${key}]`;
    for (const [k, v] of Object.entries(replacements)) { line = line.replace(`{${k}}`, v); }
    return line;
};

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
        
        // Modules
        this.logic = new GameLogic(this);
        this.ui = new GameUI(this);
        this.particles = new ParticleSystem();
        this.floatingTexts = new TextManager();

        // Assets & State
        this.sprites = { hero: SpriteGen.hero, tiles: SpriteGen.tiles, recruiter: SpriteGen.recruiterFace };
        this.humanCache = {};
        this.state = 'INIT';
        this.frame = 0;
        this.data = { company: "Arbor Corp", depts: ["Sales", "HR", "Dev"] };
        this.player = { x: 10, y: 6, z: 0, vx: 160, vy: 96, lastMove: 0 };
        this.camera = { x: 0, y: 0 };
        
        this.phone = { active: false, ringing: false, timer: 0, caller: "", floorName: "", targetNPC: null, msg: "" };
        this.shop = { active: false, items: [ {n: "Café", cost: 40, stress: -20}, {n: "Sandwich", cost: 80, stress: -50}, {n: "Energía", cost: 120, stress: -30, speed: true} ], selected: 0 };
        
        this.speedBoost = 0;
        this.memories = {}; 
        this.score = 0;
        this.money = 0;
        this.tasksSolved = 0; 
        this.taskAttempts = 5; 
        this.stress = 0; 
        this.maxStress = 100;
        this.shiftTimer = 0; 
        this.msg = { text: "", timer: 0 };
        
        this.prologueLines = translations[this.lang].PROLOGUE || translations['EN'].PROLOGUE;
        this.prologueIndex = 0;
        this.interviewQuestions = [];
        this.interviewRound = 0;
        this.interviewScore = 0; 

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
    
    getLine(key, replacements = {}) { return i18n(key, replacements); }

    bindEvents() {
        this.els.taskSubmit.addEventListener('click', () => this.logic.resolveInputSubmission());
        this.els.pauseBtn.addEventListener('click', () => { this.paused = !this.paused; });
        this.loop = this.loop.bind(this);
        this.canvas.addEventListener('click', () => { if (this.state === 'GAMEOVER') window.location.reload(); });
        
        // Proxy logic submit to avoid circular dep
        this.logic.resolveInputSubmission = async () => {
            const val = this.els.taskInput.value.trim();
            if (val.length === 0) return;
            if (this.state === 'INTERVIEW_INPUT') await this.logic.resolveInterview(val);
            else if (this.state === 'TYPING_TASK') await this.logic.resolveGameTask(val);
        };
    }

    async init() {
        this.state = 'PROLOGUE';
        requestAnimationFrame(this.loop);
        
        // Load Data
        try { const s = await window.Arbor.storage.load('career_save_v1'); if (s) { this.money = s.money; this.tasksSolved = s.tasksSolved; this.memories = s.memories; } } catch(e){}
        try { const c = await window.Arbor.content.getNext(); this.contextText = c.text; } catch(e){ this.contextText = "Office"; }

        // AI Setup
        const langName = this.lang === 'ES' ? 'Spanish' : 'English';
        try {
            const json = await window.Arbor.ai.askJSON(`
                Context: "${this.contextText.substring(0, 400)}".
                Task: Create company profile.
                JSON ONLY: { "company": "Name", "theme": "corporate|lab|studio|industrial", "depts": ["D1", "D2", "D3"] }
            `);
            this.data = json;
            if (json.theme) { setTheme(json.theme); this.sprites.tiles = SpriteGen.tiles; this.sprites.hero = SpriteGen.hero; }
        } catch(e) {}
        
        try {
            const qs = await window.Arbor.ai.askJSON(`
                Context: "${this.contextText.substring(0, 400)}".
                Task: Create 6 interview questions in ${langName}.
                JSON ONLY: [{"q": "Question 1"}, ...]
            `);
            if(qs && qs.length) this.interviewQuestions = qs.slice(0,6);
        } catch(e) {}
    }

    loop(now) {
        this.frame++;
        
        if (this.state === 'PROLOGUE') {
            if (this.input.consume('A') || this.input.consume('B')) {
                this.audio.sfxSelect();
                this.prologueIndex++;
                if (this.prologueIndex >= this.prologueLines.length) this.startInterviewSequence();
            }
        } else if (this.state === 'GAMEOVER') {
            if (this.input.consume('A')) window.location.reload();
        } else {
            if (!this.paused) {
                this.logic.update(now);
                this.updateCamera();
                this.particles.update();
                this.floatingTexts.update();
            }
        }
        this.ui.draw();
        requestAnimationFrame(this.loop);
    }

    startInterviewSequence() {
        this.state = 'CONNECTING_CALL';
        this.interviewRound = 0;
        this.interviewScore = 0;
        const check = setInterval(() => {
            if (this.interviewQuestions.length > 0) { clearInterval(check); this.state = 'INTERVIEW_INPUT'; this.prepareInterviewUI(); }
        }, 500);
    }

    prepareInterviewUI() {
        this.els.taskOverlay.style.display = 'flex';
        this.els.taskOverlay.classList.add('interview-mode');
        let headerText = `${this.getLine('INTERVIEW')} [${this.interviewRound+1}/${this.interviewQuestions.length}]`;
        this.els.taskHeader.innerText = headerText;
        this.els.taskPrompt.style.display = 'block';
        this.els.taskPrompt.innerText = `REC: "${this.interviewQuestions[this.interviewRound].q}"`;
        this.els.taskInput.style.display = 'block';
        this.els.taskSubmit.style.display = 'block';
        this.els.taskInput.value = '';
        this.els.taskInput.disabled = false;
        this.els.taskInput.focus();
        this.els.taskSubmit.disabled = false;
        this.els.taskSubmit.textContent = this.getLine('EXECUTE');
    }

    showRecruiterVerdict() {
        this.state = 'INTERVIEW_RESULT';
        this.els.taskOverlay.classList.remove('interview-mode');
        const passed = this.interviewScore >= Math.ceil(this.interviewQuestions.length / 2);
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
            this.els.taskSubmit.onclick = () => { this.startGameWorld(); };
        } else {
            this.memories.rejections = (this.memories.rejections || 0) + 1;
            this.saveGame();
            this.els.taskPrompt.innerText = this.getLine('REJECTED', {score: this.interviewScore, total: this.interviewQuestions.length});
            this.els.taskSubmit.onclick = () => window.location.reload();
        }
    }

    startGameWorld() {
        this.els.taskOverlay.style.display = 'none';
        this.resetInputUI(); // Restore click handler
        this.building.generate(this.data.depts);
        this.state = 'PLAY';
        this.stress = 0;
        this.score = 0;
        this.shiftTimer = 0;
        this.showMessage(this.getLine('WELCOME_MSG', {company: this.data.company.toUpperCase()}));
        
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
            this.phone.targetNPC = npc; this.phone.active = false; this.phone.ringing = true;
            this.phone.caller = npc.role; this.phone.floorName = floor.name;
            const taskName = this.lang === 'ES' ? "Error Crítico" : "Critical Error";
            this.phone.msg = `${this.lang === 'ES' ? 'Ve a' : 'Go to'} ${floor.name}. ${taskName}.`;
            npc.task = { type: 'TICKET' };
            this.audio.sfxPhone();
        }
    }

    async startMinigame(npc) {
        this.state = 'LOADING_TASK';
        this.currentNPC = npc;
        this.audio.sfxSelect();
        this.taskAttempts = 5; 
        this.phone.targetNPC = null; this.phone.active = false; this.phone.ringing = false;

        let q = { role: npc.role, complaint: "Broken system." };
        const langName = this.lang === 'ES' ? 'Spanish' : 'English';
        try {
            q = await window.Arbor.ai.askJSON(`Context: "${this.contextText.substring(0,400)}". Create complaint for ${npc.role} in ${langName}. JSON: {"role":"", "complaint":""}`);
        } catch(e) {}

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

    updateCamera() {
        const pX = this.player.vx; const pY = this.player.vy;
        let targetCX = pX - (CONFIG.W / 2) + (CONFIG.TILE/2) + 20; 
        const floor = this.building.floors[this.player.z];
        const maxW = (floor.map[0].length * CONFIG.TILE);
        const maxH = (floor.map.length * CONFIG.TILE);
        targetCX = Math.max(0, Math.min(targetCX, maxW - CONFIG.W + 40));
        const targetCY = Math.max(0, Math.min(pY - (CONFIG.H/2), maxH - CONFIG.H));
        this.camera.x += (targetCX - this.camera.x) * 0.08;
        this.camera.y += (targetCY - this.camera.y) * 0.08;
    }

    getHumanSprite(s, h, v) { const k=`${s}-${h}-${v}`; if(!this.humanCache[k]) this.humanCache[k]=SpriteGen.human(s,h,v); return this.humanCache[k]; }
    showMessage(txt) { this.msg.text = txt; this.msg.timer = 180; }
    saveGame() { window.Arbor.storage.save('career_save_v1', { money: this.money, tasksSolved: this.tasksSolved, memories: this.memories }); }
    setTaskLoading(isLoading, txt) {
        this.els.taskSubmit.disabled = isLoading;
        this.els.taskSubmit.textContent = isLoading ? (txt || this.getLine('SUBMITTING')) : this.getLine('EXECUTE');
        this.els.taskInput.disabled = isLoading;
    }
    resetInputUI() {
        this.els.taskSubmit.onclick = () => this.logic.resolveInputSubmission();
    }
}

document.getElementById('btn-start').addEventListener('click', () => { document.getElementById('start-screen').style.display = 'none'; new Game(); });
