/**
 * GAME.JS
 * Core Logic for Memory Garden: Overgrowth
 */
import { FX } from './fx.js';

class MemoryGame {
    constructor() {
        this.state = {
            cards: [],
            flipped: [],
            matchedCount: 0,
            locked: false,
            score: 0,
            combo: 0,
            comboTimer: 0
        };

        this.els = {
            grid: document.getElementById('card-grid'),
            score: document.getElementById('score-display'),
            comboBar: document.getElementById('combo-bar'),
            startScreen: document.getElementById('start-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            btnStart: document.getElementById('btn-start'),
            loadState: document.getElementById('loading-state'),
            loadText: document.getElementById('loading-text'),
            topic: document.getElementById('lesson-topic')
        };

        this.fx = new FX();
        this.initListeners();
        this.gameLoop();
    }

    initListeners() {
        this.els.btnStart.addEventListener('click', () => this.startSequence());
    }

    // --- GAME LOOP for UI Updates ---
    gameLoop() {
        if (this.state.combo > 0) {
            this.state.comboTimer -= 0.5; // Drain combo
            if (this.state.comboTimer <= 0) {
                this.state.combo = 0;
                this.state.comboTimer = 0;
            }
        }
        
        // Update UI
        const percent = Math.min(100, (this.state.comboTimer / 100) * 100);
        this.els.comboBar.style.width = `${percent}%`;
        
        requestAnimationFrame(() => this.gameLoop());
    }

    // --- INITIALIZATION ---
    async startSequence() {
        this.els.btnStart.classList.add('hidden');
        this.els.loadState.classList.remove('hidden');
        
        // 1. Initialize Audio
        await this.fx.initAudio();

        // 2. Fetch Content
        const content = await this.fetchContent();
        
        if (!content) {
            this.handleError("No lesson content found.");
            return;
        }
        
        this.els.topic.innerText = content.title;
        this.els.topic.classList.remove('opacity-0');

        // 3. Generate Cards via AI
        const pairs = await this.generatePairs(content.text);
        
        if (pairs) {
            this.buildGrid(pairs);
            this.startGame();
        } else {
            this.handleError("Failed to synthesize memory crystals.");
        }
    }

    async fetchContent() {
        // Bridge to Arbor
        if (window.Arbor && window.Arbor.content) {
            try {
                const lesson = await window.Arbor.content.getNext();
                if (lesson) return { title: lesson.title, text: lesson.text };
            } catch (e) { console.warn("Arbor Bridge Error", e); }
        }
        // Fallback for testing
        return { 
            title: "Demo Mode: Botany", 
            text: "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. Chlorophyll gives plants their green color." 
        };
    }

    async generatePairs(text) {
        this.els.loadText.innerText = "Synthesizing Crystals...";
        
        const prompt = `
        Analyze this text: "${text.substring(0, 1000)}".
        Create 6 pairs of "Term" vs "Definition".
        Output ONLY valid JSON array: [{"t": "Term", "d": "Definition (max 6 words)"}, ...]
        `;

        try {
            let json = null;
            
            if (window.Arbor && window.Arbor.ai) {
                const response = await window.Arbor.ai.chat([{ role: "user", content: prompt }]);
                const match = response.match(/(\[[\s\S]*\])/);
                if (match) json = JSON.parse(match[0]);
            } else {
                // Mock AI delay
                await new Promise(r => setTimeout(r, 1000));
                json = [
                    {t: "Photosynthesis", d: "Process creating energy from sunlight"},
                    {t: "Chlorophyll", d: "Pigment making plants green"},
                    {t: "Stomata", d: "Pores for gas exchange"},
                    {t: "Xylem", d: "Transports water up"},
                    {t: "Phloem", d: "Transports sugars down"},
                    {t: "Roots", d: "Absorb water and nutrients"}
                ];
            }
            
            return json ? json.slice(0, 6) : null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    handleError(msg) {
        this.els.loadText.innerText = msg;
        this.els.loadText.classList.add('text-red-500');
    }

    startGame() {
        this.els.startScreen.classList.add('hidden-fade');
        document.getElementById('game-ui').classList.remove('hidden');
        this.fx.playStartSound();
    }

    // --- GRID LOGIC ---
    buildGrid(pairs) {
        let cards = [];
        pairs.forEach((p, i) => {
            cards.push({ id: i, text: p.t, type: 'TERM' });
            cards.push({ id: i, text: p.d, type: 'DEF' });
        });
        
        // Shuffle
        cards.sort(() => Math.random() - 0.5);

        this.els.grid.innerHTML = '';
        cards.forEach((card, index) => {
            const el = document.createElement('div');
            el.className = 'card-container w-full h-24 md:h-32';
            el.innerHTML = `
                <div class="card" data-index="${index}" data-id="${card.id}">
                    <div class="card-face face-front">
                        <span class="text-4xl opacity-50">🌿</span>
                    </div>
                    <div class="card-face face-back border-b-4 ${card.type === 'TERM' ? 'border-emerald-500' : 'border-yellow-500'}">
                        <span>${card.text}</span>
                    </div>
                </div>
            `;
            el.querySelector('.card').addEventListener('click', (e) => this.onCardClick(e.currentTarget, index));
            this.els.grid.appendChild(el);
            this.state.cards.push({ ...card, matched: false });
        });
    }

    onCardClick(el, index) {
        if (this.state.locked || this.state.flipped.includes(index) || this.state.cards[index].matched) return;

        // Flip Visual
        el.classList.add('flipped');
        this.fx.playFlipSound();
        this.state.flipped.push(index);

        if (this.state.flipped.length === 2) {
            this.checkMatch();
        }
    }

    checkMatch() {
        this.state.locked = true;
        const [i1, i2] = this.state.flipped;
        const c1 = this.state.cards[i1];
        const c2 = this.state.cards[i2];
        const el1 = document.querySelector(`.card[data-index="${i1}"]`);
        const el2 = document.querySelector(`.card[data-index="${i2}"]`);

        if (c1.id === c2.id) {
            // MATCH
            this.state.cards[i1].matched = true;
            this.state.cards[i2].matched = true;
            this.state.matchedCount += 2;
            
            // Combo Logic
            this.state.combo++;
            this.state.comboTimer = 100; // Refill bar
            
            const points = 100 * this.state.combo;
            this.state.score += points;
            this.els.score.innerText = this.state.score;

            // Effects
            setTimeout(() => {
                el1.classList.add('matched');
                el2.classList.add('matched');
                
                // Get screen coordinates for particles
                const rect = el1.getBoundingClientRect();
                const rect2 = el2.getBoundingClientRect();
                
                this.fx.spawnBloom(rect.left + rect.width/2, rect.top + rect.height/2);
                this.fx.spawnBloom(rect2.left + rect2.width/2, rect2.top + rect2.height/2);
                
                this.fx.growPlant(); // Grow background
                this.fx.playMatchSound(this.state.combo);
                
                this.state.flipped = [];
                this.state.locked = false;

                if (this.state.matchedCount === this.state.cards.length) {
                    this.triggerVictory();
                }
            }, 300);

        } else {
            // NO MATCH
            this.state.combo = 0;
            this.fx.playErrorSound();
            
            setTimeout(() => {
                el1.classList.remove('flipped');
                el2.classList.remove('flipped');
                this.state.flipped = [];
                this.state.locked = false;
            }, 1000);
        }
    }

    triggerVictory() {
        setTimeout(() => {
            this.fx.playVictorySound();
            document.getElementById('final-score').innerText = this.state.score;
            this.els.victoryScreen.classList.remove('hidden-fade');
            // Massive bloom
            for(let i=0; i<10; i++) setTimeout(() => this.fx.growPlant(), i*200);
        }, 1000);
    }
}

// Start
new MemoryGame();
