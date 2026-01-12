/**
 * ENGINE.JS
 * The core logic for Arbor Classroom.
 * Handles: Game Loop, State Machine, Rendering, and AI Communication.
 */
import { SpriteGen } from './assets.js';

export class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // Internal resolution (pixel art style)
        this.width = 640;
        this.height = 480;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.state = 'INIT'; // INIT, GENERATING, DIALOGUE, INPUT, EVALUATING, VICTORY, DEFEAT
        this.frame = 0;
        
        this.assets = {
            prof: SpriteGen.generateProfessor(),
            student: SpriteGen.generateStudent(),
            bg: SpriteGen.generateBackground(this.width, this.height),
            desk: SpriteGen.generateDesk()
        };

        this.actors = [
            { id: 'prof', x: 300, y: 160, sprite: this.assets.prof, scale: 2, bobOffset: 0, talking: false },
            { id: 'p1', x: 300, y: 350, sprite: this.assets.student, scale: 3, bobOffset: Math.PI, talking: false }
        ];

        this.particles = [];
        this.lessonData = { text: "Loading...", concepts: [] };
        this.currentConcept = null;
        this.playerHP = 100; // "Confidence"
        this.score = 0;

        // Binds
        this.ui = {
            dialogueBox: document.getElementById('dialogue-box'),
            speakerName: document.getElementById('speaker-name'),
            dialogueText: document.getElementById('dialogue-text'),
            shoutBubble: document.getElementById('shout-bubble'),
            inputOverlay: document.getElementById('input-overlay'),
            inputField: document.getElementById('player-input')
        };

        this.inputResolver = null;
        this.setupInput();
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                if (this.state === 'DIALOGUE') this.advanceDialogue();
            }
        });

        this.ui.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = this.ui.inputField.value.trim();
                if (val && this.inputResolver) {
                    this.inputResolver(val);
                    this.ui.inputField.value = '';
                    this.ui.inputOverlay.style.display = 'none';
                    this.ui.inputField.blur();
                }
            }
        });
    }

    start() {
        this.loop();
        this.loadContent();
    }

    loop() {
        this.update();
        this.draw();
        this.frame++;
        requestAnimationFrame(() => this.loop());
    }

    update() {
        // Animation Logic
        this.actors.forEach(actor => {
            const bob = Math.sin((this.frame / 20) + actor.bobOffset) * 2;
            actor.yDraw = actor.y + bob;
        });

        // Particle Logic
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        const ctx = this.ctx;
        
        // 1. Background
        ctx.drawImage(this.assets.bg, 0, 0);

        // 2. Blackboard Text
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '16px VT323';
        const boardText = this.currentConcept ? this.currentConcept.topic.toUpperCase() : "CLASS IN SESSION";
        ctx.fillText(boardText, 110, 80);
        ctx.fillText("CONFIDENCE: " + this.playerHP + "%", 450, 80);

        // 3. Actors (Professor)
        const prof = this.actors[0];
        ctx.save();
        ctx.translate(prof.x, prof.yDraw);
        ctx.scale(prof.scale, prof.scale);
        ctx.drawImage(prof.sprite, -32, -64);
        ctx.restore();

        // 4. Desk (Professor)
        ctx.drawImage(this.assets.desk, 260, 260, 160, 100);

        // 5. Actors (Student/Player) - Back of head mostly, but using sprite for now
        const p1 = this.actors[1];
        ctx.save();
        ctx.translate(p1.x, p1.yDraw);
        ctx.scale(p1.scale, p1.scale);
        ctx.drawImage(p1.sprite, -32, -32); // Lower down
        ctx.restore();

        // 6. Particles
        ctx.fillStyle = '#fff';
        this.particles.forEach(p => {
            ctx.fillStyle = p.color || '#fff';
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        // 7. Scanlines (Subtle in canvas, distinct from CSS)
        if (this.frame % 2 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            for(let i=0; i<this.height; i+=4) ctx.fillRect(0, i, this.width, 2);
        }
    }

    // --- GAMEPLAY LOGIC ---

    async loadContent() {
        this.state = 'GENERATING';
        this.showDialogue("SYSTEM", "Connecting to Arbor Core...", false);

        // 1. Get Context from Arbor
        let rawText = "History of the Roman Empire.";
        if (window.Arbor && window.Arbor.content) {
            try {
                const lesson = await window.Arbor.content.getNext();
                if (lesson && lesson.text) rawText = lesson.text;
            } catch(e) { console.warn("Arbor offline, using mock."); }
        }
        
        this.lessonData.text = rawText;

        // 2. Generate Concepts via AI
        this.showDialogue("PROFESSOR", "Reading the material... Prepare yourself.", true);
        
        const prompt = `
        Context: "${rawText.substring(0, 1500)}".
        Generate 3 challenging questions for a student.
        JSON Format:
        {
            "intro": "A short witty greeting from a strict professor.",
            "questions": [
                { "topic": "Topic Name", "q": "The question text", "a": "The correct answer key" }
            ]
        }
        `;

        try {
            const aiRes = await window.Arbor.ai.chat([{role: "user", content: prompt}]);
            const json = this.parseJSON(aiRes);
            
            if (json && json.questions) {
                this.lessonData.concepts = json.questions;
                await this.runRound(0, json.intro);
            } else {
                throw new Error("Invalid AI format");
            }

        } catch(e) {
            this.showDialogue("SYSTEM", "AI Generation Failed. Reload.", false);
            console.error(e);
        }
    }

    async runRound(index, introText) {
        if (index >= this.lessonData.concepts.length) {
            this.victory();
            return;
        }

        this.currentConcept = this.lessonData.concepts[index];
        const q = this.currentConcept;

        // Intro
        if (introText) await this.showDialogue("PROFESSOR", introText);
        
        // Question
        this.state = 'DIALOGUE';
        await this.showDialogue("PROFESSOR", `Question ${index+1}: ${q.q}`);

        // Input
        this.state = 'INPUT';
        const playerAns = await this.waitForInput();

        // Evaluation
        this.state = 'EVALUATING';
        this.showDialogue("PROFESSOR", "Hmm...", true); // Thinking

        const evalPrompt = `
        Question: "${q.q}"
        Correct Answer: "${q.a}"
        Student Answer: "${playerAns}"
        Task: Decide if the student is correct. Be strict but fair.
        JSON: { "correct": true, "response": "Short reaction text." }
        `;
        
        let isCorrect = false;
        try {
            const evalRes = await window.Arbor.ai.chat([{role: "user", content: evalPrompt}]);
            const evalJson = this.parseJSON(evalRes);
            
            isCorrect = evalJson?.correct || false;
            const feedback = evalJson?.response || (isCorrect ? "Acceptable." : "Wrong.");
            
            if (isCorrect) {
                this.shout("CORRECT!");
                this.spawnParticles(300, 350, '#4ade80'); // Green confetti
                this.score += 100;
                await this.showDialogue("PROFESSOR", feedback);
            } else {
                this.shout("OBJECTION!");
                this.shakeScreen();
                this.playerHP -= 35;
                await this.showDialogue("PROFESSOR", feedback);
            }

        } catch(e) {
            await this.showDialogue("PROFESSOR", "I didn't quite catch that. Moving on.");
        }

        if (this.playerHP <= 0) {
            this.defeat();
        } else {
            this.runRound(index + 1);
        }
    }

    victory() {
        this.state = 'VICTORY';
        this.shout("CLASS DISMISSED!");
        this.spawnParticles(this.width/2, this.height/2, '#fbbf24', 100);
        this.showDialogue("PROFESSOR", `Excellent work. Final Score: ${this.score}`);
    }

    defeat() {
        this.state = 'DEFEAT';
        this.shout("FAILED!");
        this.showDialogue("PROFESSOR", "See me after class. (Refresh to retry)");
    }

    // --- UTILS ---

    parseJSON(str) {
        try {
            const start = str.indexOf('{');
            const end = str.lastIndexOf('}');
            if (start === -1 || end === -1) return null;
            return JSON.parse(str.substring(start, end + 1));
        } catch (e) { return null; }
    }

    waitForInput() {
        this.ui.inputOverlay.style.display = 'flex';
        this.ui.inputField.focus();
        return new Promise(resolve => {
            this.inputResolver = resolve;
        });
    }

    showDialogue(speaker, text, auto = false) {
        return new Promise(resolve => {
            this.ui.dialogueBox.style.display = 'block';
            this.ui.speakerName.innerText = speaker;
            this.ui.dialogueText.innerHTML = ''; // Reset
            
            let i = 0;
            // Typewriter effect
            const interval = setInterval(() => {
                this.ui.dialogueText.textContent += text.charAt(i);
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    if (auto) {
                        setTimeout(() => {
                            resolve(); 
                        }, 1000); // Auto wait 1s
                    } else {
                        // Wait for manual advance
                        this.advanceCallback = resolve;
                    }
                }
            }, 30);
        });
    }

    advanceDialogue() {
        if (this.advanceCallback) {
            const cb = this.advanceCallback;
            this.advanceCallback = null;
            this.ui.dialogueBox.style.display = 'none';
            cb();
        }
    }

    shout(text) {
        const el = this.ui.shoutBubble;
        el.innerText = text;
        el.style.display = 'block';
        el.classList.add('shake');
        setTimeout(() => {
            el.style.display = 'none';
            el.classList.remove('shake');
        }, 1500);
    }

    shakeScreen() {
        this.canvas.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`;
        setTimeout(() => this.canvas.style.transform = 'none', 50);
        setTimeout(() => this.canvas.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`, 100);
        setTimeout(() => this.canvas.style.transform = 'none', 150);
    }

    spawnParticles(x, y, color, count=20) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 60,
                size: Math.random() * 4 + 2,
                color: color
            });
        }
    }
}