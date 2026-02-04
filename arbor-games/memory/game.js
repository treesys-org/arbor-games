
/**
 * GAME.JS
 * Core Logic for Memory Garden: Overgrowth
 */
import { FX } from './fx.js';

// --- I18N & INITIALIZATION ---
const translations = {
    EN: {
        SCORE: "Score",
        INITIALIZE: "INITIALIZE",
        LOADING_SAGE: "Consulting the Sage...",
        VICTORY_TITLE: "GARDEN BLOOMED",
        VICTORY_REVIEW: "MEMORY WATERED 💧", // SRS Specific
        FINAL_SCORE: "Final Score: ",
        HIGH_SCORE: "High Score: ",
        REPLAY: "REPLAY",
        ROTATE_TITLE: "Portrait Mode<br>Recommended",
        ROTATE_DESC: "Let the garden grow tall.",
        LOADING_CRYSTALS: "Synthesizing Crystals...",
        SYNTHESIS_FAILED: "Synthesis failed. No data returned from AI.",
        INIT_FAILED: "Initialization Failed. Check Arbor Context.",
        NO_BRIDGE: "Arbor Bridge is not properly initialized.",
        NO_LESSON: "No lesson content available from the curriculum.",
        MODE_REVIEW: "WATERING MODE" // SRS Mode
    },
    ES: {
        SCORE: "Puntos",
        INITIALIZE: "INICIALIZAR",
        LOADING_SAGE: "Consultando al Sabio...",
        VICTORY_TITLE: "JARDÍN FLORECIDO",
        VICTORY_REVIEW: "MEMORIA REGADA 💧", // SRS Specific
        FINAL_SCORE: "Puntuación Final: ",
        HIGH_SCORE: "Puntuación Máxima: ",
        REPLAY: "REPETIR",
        ROTATE_TITLE: "Modo Vertical<br>Recomendado",
        ROTATE_DESC: "Deja que el jardín crezca alto.",
        LOADING_CRYSTALS: "Sintetizando cristales...",
        SYNTHESIS_FAILED: "La síntesis falló. La IA no devolvió datos.",
        INIT_FAILED: "Falló la inicialización. Revisa el contexto de Arbor.",
        NO_BRIDGE: "El puente de Arbor no está inicializado.",
        NO_LESSON: "No hay contenido de lección disponible.",
        MODE_REVIEW: "MODO RIEGO" // SRS Mode
    }
};

const lang = (window.Arbor && window.Arbor.user && translations[window.Arbor.user.lang.toUpperCase()]) ? window.Arbor.user.lang.toUpperCase() : 'EN';
const i18n = (key) => translations[lang][key] || translations['EN'][key];


class MemoryGame {
    constructor() {
        this.lang = lang;
        this.state = {
            cards: [],
            flipped: [],
            matchedCount: 0,
            locked: false,
            score: 0,
            highScore: 0,
            combo: 0,
            comboTimer: 0,
            currentLessonId: null, // Track for SRS
            isReviewMode: false    // Track if we are watering a withered node
        };

        this.els = {
            grid: document.getElementById('card-grid'),
            scoreLabel: document.getElementById('score-label'),
            score: document.getElementById('score-display'),
            comboBar: document.getElementById('combo-bar'),
            startScreen: document.getElementById('start-screen'),
            victoryScreen: document.getElementById('victory-screen'),
            victoryTitle: document.getElementById('victory-title'),
            finalScoreLabel: document.getElementById('final-score-label'),
            finalScore: document.getElementById('final-score'),
            highScoreLabel: document.getElementById('high-score-label'),
            highScore: document.getElementById('high-score'),
            btnStart: document.getElementById('btn-start'),
            btnReplay: document.getElementById('btn-replay'),
            loadState: document.getElementById('loading-state'),
            loadText: document.getElementById('loading-text'),
            topic: document.getElementById('lesson-topic'),
            rotateTitle: document.getElementById('rotate-title'),
            rotateDesc: document.getElementById('rotate-desc')
        };
        
        // Set initial UI text
        this.els.scoreLabel.textContent = i18n('SCORE');
        this.els.btnStart.querySelector('span').textContent = i18n('INITIALIZE');
        this.els.loadText.textContent = i18n('LOADING_SAGE');
        this.els.victoryTitle.textContent = i18n('VICTORY_TITLE');
        this.els.finalScoreLabel.textContent = i18n('FINAL_SCORE');
        this.els.highScoreLabel.textContent = i18n('HIGH_SCORE');
        this.els.btnReplay.textContent = i18n('REPLAY');
        this.els.rotateTitle.innerHTML = i18n('ROTATE_TITLE'); // innerHTML for <br>
        this.els.rotateDesc.textContent = i18n('ROTATE_DESC');

        // Load high score from Arbor Storage
        if (window.Arbor && window.Arbor.storage) {
            this.state.highScore = window.Arbor.storage.load('high_score') || 0;
        }

        this.fx = new FX();
        this.initListeners();
        this.gameLoop();
    }

    initListeners() {
        this.els.btnStart.addEventListener('click', () => this.startSequence());
        this.els.btnReplay.addEventListener('click', () => window.location.reload());
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
        
        // 1. Initialize Audio (Must be done on user gesture)
        await this.fx.initAudio();

        try {
            // 2. Generate Cards via AI
            const { title, pairs, lessonId, isDue } = await this.generatePairs();
            
            // SRS State
            this.state.currentLessonId = lessonId;
            this.state.isReviewMode = isDue;

            this.els.topic.innerText = title;
            this.els.topic.classList.remove('opacity-0');
            
            // SRS Visual Feedback
            if (isDue) {
                this.els.topic.innerHTML += ` <span style="color:#60a5fa">[${i18n('MODE_REVIEW')}]</span>`;
            }

            if (pairs && pairs.length > 0) {
                this.buildGrid(pairs);
                this.startGame();
            } else {
                throw new Error(i18n('SYNTHESIS_FAILED'));
            }
        } catch (e) {
            this.handleError(e.message || i18n('INIT_FAILED'));
        }
    }

    async generatePairs() {
        this.els.loadText.innerText = i18n('LOADING_CRYSTALS');

        if (!window.Arbor || !window.Arbor.ai || !window.Arbor.content) {
            throw new Error(i18n('NO_BRIDGE'));
        }

        // 1. Get raw lesson content from the player
        const lesson = await window.Arbor.content.getNext();
        if (!lesson) {
            throw new Error(i18n('NO_LESSON'));
        }
        
        // 1.5 Check Memory Status (SRS)
        let isDue = false;
        if (window.Arbor.memory) {
            const dueList = window.Arbor.memory.getDue();
            if (dueList && dueList.includes(lesson.id)) {
                isDue = true;
                console.log("MemoryGarden: Node is due for review!", lesson.id);
            }
        }

        // 2. Build the game-specific prompt
        const langName = this.lang === 'ES' ? 'Spanish' : 'English';
        const prompt = `
Context: "${lesson.text.substring(0, 1000)}".
Task: Create content for a "Memory" style card matching game in ${langName}.
Goal: Generate 6 pairs of concepts where the player must match a "Term" with its "Definition".
Rules:
1. The pairs must be logically connected and unique within this set.
2. "Term" should be a noun or short phrase (1-3 words) in ${langName}.
3. "Definition" must be a concise explanation (max 6 words) in ${langName}.
4. ALL output text MUST be in ${langName}.
5. Avoid ambiguous pairs where a definition could fit multiple terms.
Output: ONLY a valid JSON array: [{"t": "Term", "d": "Definition"}, ...]
Do NOT use markdown.
        `;
        
        // 3. Send the prompt to the SIMPLIFIED bridge
        console.log("Sending prompt to AI via clean bridge...");
        
        // askJSON handles markdown stripping and JSON.parsing automatically
        const pairs = await window.Arbor.ai.askJSON(prompt);
        
        return { 
            title: lesson.title, 
            pairs: pairs, 
            lessonId: lesson.id,
            isDue: isDue
        };
    }

    handleError(msg) {
        this.els.loadText.innerText = msg;
        this.els.loadText.classList.add('text-red-500');
    }

    startGame() {
        this.els.startScreen.classList.add('hidden-fade');
        document.getElementById('game-ui').classList.remove('hidden');
    }

    // --- Grid Logic ---
    buildGrid(pairs) {
        // Ensure we only take 6 pairs
        const selectedPairs = pairs.slice(0, 6);
        let cards = [];
        
        selectedPairs.forEach((p, i) => {
            cards.push({ id: i, text: p.t, type: 'TERM' });
            cards.push({ id: i, text: p.d, type: 'DEF' });
        });
        
        // Shuffle
        cards.sort(() => Math.random() - 0.5);

        this.els.grid.innerHTML = '';
        cards.forEach((card, index) => {
            const el = document.createElement('div');
            // Responsive heights: Significantly reduced to fit screen better (h-20 mobile up to h-40 on massive screens)
            el.className = 'card-container w-full h-20 md:h-28 lg:h-32 xl:h-40';
            el.innerHTML = `
                <div class="card" data-index="${index}" data-id="${card.id}">
                    <div class="card-face face-front">
                        <span class="text-2xl md:text-4xl opacity-50">🌿</span>
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
        
        if (i1 === undefined || i2 === undefined) {
             this.state.flipped = [];
             this.state.locked = false;
             return;
        }

        const c1 = this.state.cards[i1];
        const c2 = this.state.cards[i2];
        const el1 = document.querySelector(`.card[data-index="${i1}"]`);
        const el2 = document.querySelector(`.card[data-index="${i2}"]`);

        if (c1.id === c2.id) {
            this.state.cards[i1].matched = true;
            this.state.cards[i2].matched = true;
            this.state.matchedCount += 2;
            
            this.state.combo++;
            this.state.comboTimer = 100;
            
            const points = 100 * this.state.combo;
            this.state.score += points;

            if (window.Arbor && window.Arbor.game) {
                window.Arbor.game.addXP(points);
            }
            this.els.score.innerText = this.state.score;

            // FIX: Reduced wait time from 3000ms to 1200ms to avoid feeling like a crash
            setTimeout(() => {
                try {
                    if(el1) el1.classList.add('matched');
                    if(el2) el2.classList.add('matched');
                    
                    if(el1 && el2) {
                        const rect = el1.getBoundingClientRect();
                        const rect2 = el2.getBoundingClientRect();
                        // Verify Rects are valid before spawning effects to prevent errors
                        if (rect.width > 0) this.fx.spawnBloom(rect.left + rect.width/2, rect.top + rect.height/2);
                        if (rect2.width > 0) this.fx.spawnBloom(rect2.left + rect2.width/2, rect2.top + rect2.height/2);
                    }
                    
                    this.fx.growPlant();
                    this.fx.playMatchSound(this.state.combo);
                    
                } catch (e) {
                    console.error("Visual Effect Error:", e);
                } finally {
                    // CRITICAL FIX: Ensure game unlocks even if effects fail
                    this.state.flipped = [];
                    this.state.locked = false;

                    if (this.state.matchedCount === this.state.cards.length) {
                        this.triggerVictory();
                    }
                }
            }, 1200);

        } else {
            this.state.combo = 0;
            this.fx.playErrorSound();
            
            setTimeout(() => {
                if(el1) el1.classList.remove('flipped');
                if(el2) el2.classList.remove('flipped');
                this.state.flipped = [];
                this.state.locked = false;
            }, 700);
        }
    }

    triggerVictory() {
        setTimeout(() => {
            this.fx.playVictorySound();
            
            // SRS REPORTING
            if (window.Arbor && window.Arbor.memory) {
                const quality = this.state.score > 2000 ? 5 : 4;
                console.log(`Reporting Memory: ${this.state.currentLessonId} -> Quality ${quality}`);
                window.Arbor.memory.report(this.state.currentLessonId, quality);
            }

            if (this.state.score > this.state.highScore) {
                this.state.highScore = this.state.score;
                if (window.Arbor && window.Arbor.storage) {
                    window.Arbor.storage.save('high_score', this.state.highScore);
                }
            }
            
            this.els.finalScore.innerText = this.state.score;
            this.els.highScore.innerText = this.state.highScore;
            
            // Show special title if we just watered a memory
            if (this.state.isReviewMode) {
                this.els.victoryTitle.textContent = i18n('VICTORY_REVIEW');
                this.els.victoryTitle.style.color = '#60a5fa';
            }
            
            this.els.victoryScreen.classList.remove('hidden-fade');
            
            for(let i=0; i<10; i++) setTimeout(() => this.fx.growPlant(), i*200);
        }, 800);
    }
}

new MemoryGame();
