/**
 * ARBOR CAREER OS - EXTREME EDITION
 * A stylized workplace simulation game.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!window.AudioContext) return;
        this.ctx = new window.AudioContext();
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.ctx || !this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playBeep() { this.playTone(800, 'sine', 0.1, 0.05); }
    playClick() { this.playTone(1200, 'triangle', 0.05, 0.02); }
    playMoney() { 
        this.playTone(1500, 'sine', 0.1, 0.1); 
        setTimeout(() => this.playTone(2000, 'sine', 0.2, 0.1), 100);
    }
    playError() { this.playTone(150, 'sawtooth', 0.3, 0.1); }
    playSuccess() {
        [440, 554, 659].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.3, 0.05), i * 100));
    }
}

class CareerGame {
    constructor() {
        this.audio = new SoundEngine();
        this.state = {
            money: 0,
            rep: 50,
            energy: 100,
            job: null,
            tasks: [],
            currentTaskIndex: 0,
            interviewLog: [],
            lang: 'ES'
        };

        this.els = {
            views: {
                loading: document.getElementById('view-loading'),
                offer: document.getElementById('view-offer'),
                interview: document.getElementById('view-interview'),
                work: document.getElementById('view-work'),
                summary: document.getElementById('view-summary')
            },
            hud: {
                money: document.getElementById('hud-money'),
                rep: document.getElementById('hud-rep'),
                energy: document.getElementById('hud-energy'),
                job: document.getElementById('job-title-hud')
            },
            loadingText: document.getElementById('loading-text'),
            offer: {
                title: document.getElementById('offer-title'),
                desc: document.getElementById('offer-desc'),
                salary: document.getElementById('offer-salary')
            },
            chat: {
                feed: document.getElementById('chat-feed'),
                input: document.getElementById('chat-input'),
                form: document.getElementById('chat-form')
            },
            task: {
                card: document.getElementById('task-card'),
                title: document.getElementById('task-title'),
                desc: document.getElementById('task-desc'),
                btnA: document.getElementById('btn-opt-a'),
                btnB: document.getElementById('btn-opt-b'),
                txtA: document.getElementById('txt-opt-a'),
                txtB: document.getElementById('txt-opt-b'),
                dots: [document.getElementById('dot-1'), document.getElementById('dot-2'), document.getElementById('dot-3')]
            },
            summary: {
                money: document.getElementById('summary-money'),
                text: document.getElementById('summary-text'),
                icon: document.getElementById('summary-icon')
            }
        };

        this.init();
    }

    init() {
        this.setupListeners();
        // Load persisted money
        if (window.Arbor && window.Arbor.storage) {
            this.state.money = window.Arbor.storage.load('career_money') || 0;
        }
        if (window.Arbor && window.Arbor.user) {
            this.state.lang = (window.Arbor.user.lang || 'es').toUpperCase();
        }
        this.updateHUD();

        // Start sequence
        document.addEventListener('click', () => {
            if(this.audio.ctx && this.audio.ctx.state === 'suspended') this.audio.ctx.resume();
            if(!this.audio.ctx) this.audio.init();
        }, { once: true });

        setTimeout(() => this.connectArbor(), 1000);
    }

    setupListeners() {
        document.getElementById('btn-accept-offer').addEventListener('click', () => {
            this.audio.playClick();
            this.startInterview();
        });

        this.els.chat.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChatSubmit();
        });

        this.els.task.btnA.addEventListener('click', () => this.resolveTask('A'));
        this.els.task.btnB.addEventListener('click', () => this.resolveTask('B'));
        
        document.getElementById('btn-restart').addEventListener('click', () => {
             this.audio.playSuccess();
             this.init(); // Soft reset
        });
    }

    switchView(viewName) {
        Object.values(this.els.views).forEach(el => el.classList.add('hidden'));
        this.els.views[viewName].classList.remove('hidden');
        if (viewName === 'offer') this.els.views[viewName].classList.add('fade-in');
    }

    updateHUD() {
        // Animate numbers
        this.els.hud.money.innerText = `$${this.state.money}`;
        this.els.hud.rep.innerText = `${this.state.rep}%`;
        this.els.hud.energy.innerText = `${this.state.energy}%`;
        
        // Color coding
        this.els.hud.rep.className = this.state.rep < 30 ? 'text-red-500 font-bold text-lg' : 'text-purple-400 font-bold text-lg';
        this.els.hud.energy.className = this.state.energy < 30 ? 'text-red-500 font-bold text-lg' : 'text-yellow-400 font-bold text-lg';
    }

    async connectArbor() {
        this.els.loadingText.innerText = "Analyzing Curriculum Data...";
        
        try {
            if (!window.Arbor || !window.Arbor.content || !window.Arbor.ai) {
                throw new Error("Standalone Mode");
            }

            const lesson = await window.Arbor.content.getNext();
            this.generateJob(lesson);
        } catch (e) {
            console.warn("Running in Standalone Mode");
            this.generateJob({ 
                title: "General Systems", 
                text: "The corporation requires general maintenance and data entry..." 
            });
        }
    }

    async generateJob(lesson) {
        this.els.loadingText.innerText = "Synthesizing Job Offer...";
        
        const langName = this.state.lang === 'ES' ? 'Spanish' : 'English';
        const prompt = `
            Context: "${lesson.text.substring(0, 1000)}".
            Create a futuristic corporate job title and description based on this context.
            User Language: ${langName}. Output JSON ONLY:
            {"title": "Job Title", "desc": "1 sentence description", "salary": 150}
        `;

        try {
            const data = await this.queryAI(prompt);
            this.state.job = data;
            
            this.els.offer.title.innerText = data.title;
            this.els.offer.desc.innerText = data.desc;
            this.els.offer.salary.innerText = data.salary;
            this.els.hud.job.innerText = data.title;

            this.switchView('offer');
            this.audio.playSuccess();
        } catch (e) {
            this.els.loadingText.innerText = "Error Generating Job. Retrying...";
            setTimeout(() => this.connectArbor(), 2000);
        }
    }

    async startInterview() {
        this.switchView('interview');
        this.state.interviewLog = [];
        this.els.chat.feed.innerHTML = '';
        
        const introMsg = this.state.lang === 'ES' ? 
            `Bienvenido al proceso para ${this.state.job.title}. ¿Por qué crees que eres adecuado para este puesto?` :
            `Welcome to the screening for ${this.state.job.title}. Why are you fit for this role?`;

        this.addChatBubble('ai', introMsg);
        this.state.interviewLog.push({ role: 'assistant', content: introMsg });
    }

    async handleChatSubmit() {
        const text = this.els.chat.input.value.trim();
        if (!text) return;

        this.audio.playBeep();
        this.addChatBubble('user', text);
        this.els.chat.input.value = '';
        this.els.chat.input.disabled = true;

        this.state.interviewLog.push({ role: 'user', content: text });

        // Generate response or decision
        const langName = this.state.lang === 'ES' ? 'Spanish' : 'English';
        const isFinal = this.state.interviewLog.length >= 4; // 2 turns
        
        let prompt = `
            Role: Corporate Recruiter for "${this.state.job.title}".
            Tone: Professional, slightly cold but polite.
            Language: ${langName}.
            History: ${JSON.stringify(this.state.interviewLog)}.
        `;

        if (isFinal) {
            prompt += `Decide if hired. Say "HIRED" or "REJECTED" followed by a short reason.`;
        } else {
            prompt += `Ask one more behavioral question relative to the job. Short sentence.`;
        }

        this.addTypingIndicator();
        
        try {
            const response = await this.queryAI(prompt, false);
            this.removeTypingIndicator();
            this.addChatBubble('ai', response);
            this.state.interviewLog.push({ role: 'assistant', content: response });

            if (isFinal) {
                if (response.includes("HIRED") || response.toLowerCase().includes("contratado")) {
                    setTimeout(() => this.startWorkday(), 2000);
                } else {
                    setTimeout(() => {
                         alert("Process Terminated. Try again.");
                         this.init();
                    }, 2000);
                }
            } else {
                this.els.chat.input.disabled = false;
                this.els.chat.input.focus();
            }

        } catch (e) {
            this.removeTypingIndicator();
            this.addChatBubble('ai', "System Error. Proceeding manually...");
            setTimeout(() => this.startWorkday(), 1500);
        }
    }

    async startWorkday() {
        this.switchView('loading');
        this.els.loadingText.innerText = "Generating Daily Tasks...";
        this.state.tasks = [];
        this.state.currentTaskIndex = 0;
        this.state.energy = 100;
        this.updateHUD();

        const langName = this.state.lang === 'ES' ? 'Spanish' : 'English';
        const prompt = `
            Context: Job is "${this.state.job.title}".
            Create 3 distinct workplace crisis scenarios.
            Language: ${langName}.
            Output JSON Array ONLY:
            [
                {
                    "title": "Short Title",
                    "desc": "Situation description",
                    "optA": "Risky/Creative Choice",
                    "optB": "Safe/Boring Choice",
                    "effectA": {"money": 50, "rep": -10, "energy": -20},
                    "effectB": {"money": 10, "rep": 10, "energy": -5}
                }
            ]
        `;

        try {
            const tasks = await this.queryAI(prompt);
            if (!Array.isArray(tasks)) throw new Error("Invalid format");
            this.state.tasks = tasks;
            this.switchView('work');
            this.showTask(0);
        } catch (e) {
            console.error(e);
            this.els.loadingText.innerText = "Error building tasks. Using backup protocol.";
            // Fallback tasks could go here
            setTimeout(() => this.init(), 2000);
        }
    }

    showTask(index) {
        if (index >= this.state.tasks.length) {
            this.endWorkday();
            return;
        }

        const task = this.state.tasks[index];
        this.state.currentTaskIndex = index;

        // UI Updates
        this.els.task.title.innerText = task.title;
        this.els.task.desc.innerText = task.desc;
        this.els.task.txtA.innerText = task.optA;
        this.els.task.txtB.innerText = task.optB;
        
        // Progress Dots
        this.els.task.dots.forEach((d, i) => {
            d.className = i === index ? "w-2 h-2 rounded-full bg-blue-500 animate-pulse" : 
                          i < index ? "w-2 h-2 rounded-full bg-emerald-500" : "w-2 h-2 rounded-full bg-slate-700";
        });

        // Animation Reset
        this.els.task.card.classList.remove('slide-up');
        void this.els.task.card.offsetWidth; // trigger reflow
        this.els.task.card.classList.add('slide-up');
    }

    resolveTask(choice) {
        this.audio.playClick();
        const task = this.state.tasks[this.state.currentTaskIndex];
        const effect = choice === 'A' ? task.effectA : task.effectB;

        this.applyEffect(effect);
        
        setTimeout(() => {
            this.showTask(this.state.currentTaskIndex + 1);
        }, 300);
    }

    applyEffect(effect) {
        if (effect.money) {
            this.state.money += effect.money;
            if (effect.money > 0) {
                this.spawnFloatingText(`+$${effect.money}`, this.els.hud.money, 'text-emerald-400');
                this.audio.playMoney();
            }
        }
        if (effect.rep) {
            this.state.rep = Math.min(100, Math.max(0, this.state.rep + effect.rep));
            const color = effect.rep > 0 ? 'text-purple-400' : 'text-red-400';
            this.spawnFloatingText(`${effect.rep > 0 ? '+' : ''}${effect.rep} REP`, this.els.hud.rep, color);
        }
        if (effect.energy) {
            this.state.energy = Math.min(100, Math.max(0, this.state.energy + effect.energy));
            this.spawnFloatingText(`${effect.energy}`, this.els.hud.energy, 'text-red-400');
        }
        
        // Save
        if (window.Arbor && window.Arbor.storage) {
            window.Arbor.storage.save('career_money', this.state.money);
        }

        this.updateHUD();

        // Shake screen on bad rep or energy
        if ((effect.rep && effect.rep < 0) || (effect.energy && effect.energy < -15)) {
            document.body.classList.add('shake');
            this.audio.playError();
            setTimeout(() => document.body.classList.remove('shake'), 400);
        }
    }

    endWorkday() {
        this.switchView('summary');
        this.audio.playSuccess();
        
        const earned = this.state.tasks.reduce((acc, t) => acc + (Math.max(t.effectA.money, t.effectB.money)), 0);
        this.els.summary.money.innerText = `$${this.state.money}`;
        
        let grade = "SATISFACTORY";
        if (this.state.rep > 80 && this.state.energy > 50) grade = "EXCEPTIONAL";
        if (this.state.rep < 30 || this.state.energy < 10) grade = "TERMINATION IMMINENT";
        
        this.els.summary.text.innerText = `Status: ${grade}`;
        
        if (window.Arbor && window.Arbor.game) {
            window.Arbor.game.addXP(this.state.rep);
        }
    }

    // --- UTILS ---

    spawnFloatingText(text, targetEl, colorClass) {
        const rect = targetEl.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = `float-text ${colorClass} text-lg font-bold`;
        el.innerText = text;
        el.style.left = `${rect.left + 10}px`;
        el.style.top = `${rect.top}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }

    addChatBubble(type, text) {
        const div = document.createElement('div');
        div.className = `bubble bubble-${type}`;
        div.innerText = text;
        this.els.chat.feed.appendChild(div);
        this.els.chat.feed.scrollTop = this.els.chat.feed.scrollHeight;
    }

    addTypingIndicator() {
        const div = document.createElement('div');
        div.id = 'typing-ind';
        div.className = 'bubble bubble-ai italic text-slate-400 text-xs';
        div.innerText = 'Typing...';
        this.els.chat.feed.appendChild(div);
        this.els.chat.feed.scrollTop = this.els.chat.feed.scrollHeight;
    }

    removeTypingIndicator() {
        const el = document.getElementById('typing-ind');
        if (el) el.remove();
    }

    async queryAI(prompt, jsonMode = true) {
        const res = await window.Arbor.ai.chat([{ role: 'user', content: prompt }]);
        if (!jsonMode) return res.text;
        
        try {
            const clean = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = clean.indexOf('{') > -1 ? clean.indexOf('{') : clean.indexOf('[');
            const end = clean.lastIndexOf('}') > -1 ? clean.lastIndexOf('}') + 1 : clean.lastIndexOf(']') + 1;
            return JSON.parse(clean.substring(start, end));
        } catch (e) {
            console.error("AI Parse Error", res.text);
            throw e;
        }
    }
}

// Start
new CareerGame();