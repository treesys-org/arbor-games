
/**
 * LOGIC.JS
 * Simulation physics, AI resolution, and Game Rules.
 */
import { CONFIG } from './core.js';

export class GameLogic {
    constructor(game) {
        this.game = game; // Reference to main state
    }

    update(now) {
        if (this.game.state === 'PLAY') {
            this.updatePlayer(now);
            this.updateNPCs();
            this.updateSystem();
        } else if (this.game.state === 'INTERVIEW_FEEDBACK') {
            if (this.game.input.consume('A')) {
                this.game.audio.sfxSelect();
                this.game.interviewRound++;
                if (this.game.interviewRound >= this.game.interviewQuestions.length) {
                    this.game.showRecruiterVerdict();
                } else {
                    this.game.state = 'INTERVIEW_INPUT';
                    this.game.prepareInterviewUI();
                }
            }
        }
    }

    updatePlayer(now) {
        // SHOP
        if(this.game.shop.active) {
            if (this.game.input.consume('UP')) { this.game.shop.selected = Math.max(0, this.game.shop.selected-1); this.game.audio.sfxSelect(); }
            if (this.game.input.consume('DOWN')) { this.game.shop.selected = Math.min(this.game.shop.items.length-1, this.game.shop.selected+1); this.game.audio.sfxSelect(); }
            if (this.game.input.consume('A')) this.buyItem();
            if (this.game.input.consume('B')) this.game.shop.active = false;
            return;
        } 
        
        // PHONE ACTIVE
        if (this.game.phone.active) {
            if (this.game.input.consume('A') || this.game.input.consume('B')) {
                this.game.phone.active = false;
                this.game.phone.ringing = false;
            }
            return;
        }

        // ANSWER PHONE
        if (this.game.phone.ringing && this.game.input.consume('A')) {
            this.game.phone.active = true;
            this.game.phone.ringing = false;
            this.game.audio.sfxSelect();
            return;
        }

        // MOVEMENT
        const delay = this.game.speedBoost > 0 ? CONFIG.MOVE_DELAY * 0.6 : CONFIG.MOVE_DELAY;
        if(now - this.game.player.lastMove > delay) {
            let dx=0, dy=0;
            if(this.game.input.keys.UP) dy=-1;
            else if(this.game.input.keys.DOWN) dy=1;
            else if(this.game.input.keys.LEFT) dx=-1;
            else if(this.game.input.keys.RIGHT) dx=1;

            if(dx!==0 || dy!==0) {
                this.movePlayer(dx, dy);
                this.game.player.lastMove = now;
            }
        }

        if(this.game.input.consume('A')) this.checkInteract();
        
        // LERP
        const targetX = this.game.player.x * CONFIG.TILE;
        const targetY = this.game.player.y * CONFIG.TILE;
        this.game.player.vx += (targetX - this.game.player.vx) * CONFIG.ANIM_SPEED;
        this.game.player.vy += (targetY - this.game.player.vy) * CONFIG.ANIM_SPEED;
    }

    movePlayer(dx, dy) {
        if (!this.game.building || !this.game.building.floors) return;
        const f = this.game.building.floors[this.game.player.z];
        if (!f || !f.map) return;

        const nx = this.game.player.x + dx;
        const ny = this.game.player.y + dy;
        
        if (ny < 0 || ny >= f.map.length || nx < 0 || nx >= f.map[0].length) return;

        const t = f.map[ny][nx];
        if (t === 1 || t === 8) { // Wall/Solid
            this.game.audio.sfxBump();
            return; 
        }

        const hitNPC = f.npcs ? f.npcs.find(n => n.x === nx && n.y === ny) : null;
        if (hitNPC) {
            this.interactNPC(hitNPC);
            return; 
        }
        
        this.game.player.x = nx; 
        this.game.player.y = ny;
        this.game.audio.sfxMove();
        
        // STAIRS
        if(t === 3 && this.game.player.z < this.game.building.floors.length-1) {
            this.game.player.z++;
            const nextF = this.game.building.floors[this.game.player.z];
            if(nextF) {
                const spawn = nextF.spawns.down;
                this.setPlayerPos(spawn.x, spawn.y);
                this.game.showMessage(`${nextF.name}`);
            }
        }
        else if(t === 4 && this.game.player.z > 0) {
            this.game.player.z--;
            const prevF = this.game.building.floors[this.game.player.z];
            if(prevF) {
                const spawn = prevF.spawns.up;
                this.setPlayerPos(spawn.x, spawn.y);
                this.game.showMessage(`${prevF.name}`);
            }
        }
    }

    setPlayerPos(x, y) {
        this.game.player.x = x; this.game.player.y = y;
        this.game.player.vx = x * CONFIG.TILE;
        this.game.player.vy = y * CONFIG.TILE;
    }

    updateNPCs() {
        if (!this.game.building || !this.game.building.floors) return;
        const f = this.game.building.floors[this.game.player.z];
        if (!f || !f.npcs) return;
        
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
                    if (f.map && f.map[ny] && f.map[ny][nx] !== 1 && (nx !== this.game.player.x || ny !== this.game.player.y)) {
                         npc.x = nx; npc.y = ny;
                    }
                    npc.moveTimer = 0;
                }
                npc.vx += (npc.x * CONFIG.TILE - npc.vx) * 0.1;
                npc.vy += (npc.y * CONFIG.TILE - npc.vy) * 0.1;
            }
        });
    }

    updateSystem() {
        // STRESS
        this.game.stress += 0.005;
        if (this.game.phone.targetNPC) this.game.stress += 0.02; // Faster stress if phone ignored

        if (this.game.stress >= this.game.maxStress) {
            this.game.state = 'GAMEOVER';
            this.game.msg.text = this.game.getLine('BURNOUT');
            this.game.audio.sfxBurnout();
            clearInterval(this.game.taskInterval);
        }
        
        if (this.game.speedBoost > 0) this.game.speedBoost--;

        // SHIFT CLOCK
        this.game.shiftTimer++;
        if (this.game.shiftTimer >= CONFIG.SHIFT_DURATION) {
            this.endShift();
        }
    }

    addStress(amount) {
        this.game.stress = Math.min(this.game.maxStress, this.game.stress + amount);
        this.game.ui.triggerShake(5); // UI Method call via reference
        this.game.particles.spawn(this.game.player.vx, this.game.player.vy, '#ef4444', 8);
        this.game.floatingTexts.spawn(this.game.player.vx, this.game.player.vy - 10, `+${amount} STRESS`, '#ef4444');
    }

    endShift() {
        this.game.state = 'GAMEOVER';
        this.game.msg.text = "SHIFT COMPLETE. WELL DONE.";
        this.game.saveGame();
        this.game.audio.sfxSuccess();
    }

    checkInteract() {
        if (!this.game.building || !this.game.building.floors) return;
        const f = this.game.building.floors[this.game.player.z];
        if (!f || !f.npcs) return;

        const dirs = [{x:0,y:0}, {x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}];
        for (let d of dirs) {
            const tx = this.game.player.x + d.x;
            const ty = this.game.player.y + d.y;
            const npc = f.npcs.find(n => n.x === tx && n.y === ty);
            if (npc) { this.interactNPC(npc); return; }
        }
    }

    interactNPC(npc) {
        if (npc.isVendor) {
            this.openShop();
        } else if (npc === this.game.phone.targetNPC) {
            this.game.startMinigame(npc);
        } else {
            this.game.showMessage(this.game.getLine('BUSY_MSG', {role: npc.role}));
        }
    }

    openShop() {
        this.game.shop.active = true;
        this.game.shop.selected = 0;
        this.game.audio.sfxSelect();
    }

    buyItem() {
        const item = this.game.shop.items[this.game.shop.selected];
        if (this.game.money >= item.cost) {
            this.game.money -= item.cost;
            this.game.stress = Math.max(0, this.game.stress + item.stress);
            if(item.speed) this.game.speedBoost = 600; 
            
            // Visuals
            this.game.floatingTexts.spawn(this.game.player.vx, this.game.player.vy, `-${Math.abs(item.stress)} Stress`, '#4ade80');
            this.game.floatingTexts.spawn(this.game.player.vx, this.game.player.vy - 10, `-$${item.cost}`, '#facc15');
            this.game.particles.spawn(this.game.player.vx, this.game.player.vy, '#4ade80', 10);
            
            this.game.saveGame();
            this.game.audio.sfxEat();
            this.game.showMessage(this.game.getLine('CONSUMED_MSG', {item: item.n}));
            this.game.shop.active = false;
        } else {
            this.game.audio.sfxError();
            this.game.showMessage(this.game.getLine('FUNDS_MSG'));
        }
    }

    /* --- AI HANDLERS --- */
    
    async resolveGameTask(val) {
        this.game.setTaskLoading(true);
        const langName = this.game.lang === 'ES' ? 'Spanish' : 'English';
        try {
            const p = `
            [ROLEPLAY]
            You are a ${this.game.currentTaskData.role} in a company.
            Problem: "${this.game.currentTaskData.complaint}".
            IT Support (player) says: "${val}".
            
            [TASK]
            Evaluate if this solves the problem. 
            Output valid JSON ONLY.
            { "solved": boolean, "reply": "Short response (max 8 words) in ${langName}" }
            `;
            const res = await window.Arbor.ai.askJSON(p);
            this.finalizeTask(res.solved, res.reply);
        } catch(e) {
            const errorReply = this.game.lang === 'ES' ? "Error. Reintentar." : "Error. Retry.";
            this.finalizeTask(false, errorReply);
        }
    }

    finalizeTask(isSolved, replyText) {
        this.game.setTaskLoading(false);
        if (isSolved) {
            const reward = 150;
            this.game.score += reward;
            this.game.money += reward;
            this.game.stress = Math.max(0, this.game.stress - 20); 
            
            this.game.floatingTexts.spawn(this.game.player.vx, this.game.player.vy - 20, `+$${reward}`, '#facc15');
            this.game.particles.spawn(this.game.player.vx, this.game.player.vy, '#facc15', 20);

            this.game.saveGame();
            this.game.showMessage(`"${replyText}"`);
            this.game.audio.sfxCash();
            this.game.currentNPC.task = null;
            this.game.tasksSolved++;
            this.game.state = 'PLAY';
            this.game.els.taskOverlay.style.display = 'none';
        } else {
            this.game.taskAttempts--;
            this.game.audio.sfxError();
            this.addStress(10);
            
            if (this.game.taskAttempts > 0) {
                this.game.els.taskHeader.innerText = this.game.getLine('WRONG_ATTEMPTS', {num: this.game.taskAttempts});
                this.game.els.taskPrompt.innerText = `"${replyText}"`;
                this.game.els.taskInput.value = '';
                this.game.els.taskInput.focus();
            } else {
                this.game.els.taskOverlay.style.display = 'none';
                this.addStress(30); 
                this.game.showMessage(this.game.getLine('TICKET_FAILED', {reply: replyText}));
                this.game.state = 'PLAY';
            }
        }
    }

    async resolveInterview(val) {
        this.game.setTaskLoading(true, this.game.getLine('EVALUATING'));
        const q = this.game.interviewQuestions[this.game.interviewRound];
        const langName = this.game.lang === 'ES' ? 'Spanish' : 'English';
        
        try {
            const p = `
            [ROLEPLAY]
            HR Recruiter at "${this.game.data.company}".
            Question: "${q.q}". Candidate: "${val}".
            
            [TASK]
            Evaluate answer. Output JSON ONLY.
            { "approved": boolean, "reply": "Short comment (max 10 words) in ${langName}" }
            `;
            const res = await window.Arbor.ai.askJSON(p);
            
            if (res.approved) { 
                this.game.interviewScore++; 
                this.game.audio.sfxSuccess();
            } else { 
                this.game.audio.sfxError(); 
            }
            this.game.lastInterviewFeedback = `Recruiter: "${res.reply}"`;

        } catch(e) {
            this.game.lastInterviewFeedback = `Recruiter: "..."`;
            this.game.audio.sfxError();
        }

        this.game.state = 'INTERVIEW_FEEDBACK';
        this.game.els.taskOverlay.style.display = 'none';
    }
}
