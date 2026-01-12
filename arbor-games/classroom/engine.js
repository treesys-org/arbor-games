
/**
 * ENGINE.JS
 * The core logic for Arbor Classroom.
 * Logic: Professor asks questions, Students answer, Player judges correctness.
 */
import { SpriteGen, Colors } from './assets.js';

export class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.state = 'INIT'; 
        this.frame = 0;
        
        this.assets = {
            prof: SpriteGen.generateProfessor(),
            bg: SpriteGen.generateBackground(this.width, this.height),
            desk: SpriteGen.generateDesk(),
            studentLola: SpriteGen.generateStudent(Colors.lola),
            studentTimmy: SpriteGen.generateStudent(Colors.timmy),
            studentPlayer: SpriteGen.generateStudent(Colors.player)
        };

        // Rank Mock: Lola, Timmy, Student
        this.students = [
            { id: 'lola', name: 'Lola', color: Colors.lola, score: 0, x: 200, y: 380, sprite: this.assets.studentLola },
            { id: 'timmy', name: 'Timmy', color: Colors.timmy, score: 0, x: 400, y: 380, sprite: this.assets.studentTimmy },
            { id: 'you', name: 'You', color: Colors.player, score: 0, x: 600, y: 380, sprite: this.assets.studentPlayer }
        ];

        // Fix: Professor Y moved from 180 (floating) to 350 (floor level)
        this.professor = { x: 700, y: 350, sprite: this.assets.prof };
        this.particles = [];
        
        // Game Data
        this.lessonData = { text: "Loading...", concepts: [] };
        this.currentRound = 0;
        this.currentQ = null;
        this.answeringStudentIndex = 0;
        this.lastJudgmentCorrect = null;

        // Binds
        this.ui = {
            dialogueBox: document.getElementById('dialogue-box'),
            speakerName: document.getElementById('speaker-name'),
            dialogueText: document.getElementById('dialogue-text'),
            shoutBubble: document.getElementById('shout-bubble'),
            
            // Judge UI
            overlay: document.getElementById('input-overlay'),
            btnTrue: document.getElementById('btn-judge-true'),
            btnFalse: document.getElementById('btn-judge-false'),
            
            // Text Input UI
            textOverlay: document.getElementById('text-overlay'),
            inputField: document.getElementById('player-input'),
            btnSubmit: document.getElementById('btn-submit')
        };

        this.inputResolver = null;
        this.textResolver = null;
        this.setupInput();
    }

    setupInput() {
        // KEYBOARD
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && this.state === 'DIALOGUE') {
                this.advanceDialogue();
            }
            if (e.key === 'Enter') {
                if (this.state === 'DIALOGUE') this.advanceDialogue();
                if (this.state === 'INPUT_TEXT') this.submitText();
            }
        });

        // TOUCH/CLICK (For Mobile 'Spacebar' replacement)
        this.ui.dialogueBox.addEventListener('click', () => {
             if (this.state === 'DIALOGUE') {
                this.advanceDialogue();
            }
        });

        // Judge Buttons
        this.ui.btnTrue.addEventListener('click', () => this.resolveInput(true));
        this.ui.btnFalse.addEventListener('click', () => this.resolveInput(false));
        
        // Text Submit
        this.ui.btnSubmit.addEventListener('click', () => this.submitText());
    }

    resolveInput(val) {
        if (this.state === 'INPUT' && this.inputResolver) {
            this.inputResolver(val);
            this.ui.overlay.style.display = 'none';
        }
    }

    submitText() {
        if (this.state === 'INPUT_TEXT' && this.textResolver) {
            const val = this.ui.inputField.value.trim();
            if (val.length === 0) return; // Prevent empty submit
            this.textResolver(val);
            this.ui.textOverlay.style.display = 'none';
            this.ui.inputField.value = ''; // Clean input
            this.ui.inputField.blur(); // Close keyboard on mobile
        }
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
        const bob = Math.sin(this.frame / 15) * 2;
        this.professor.yDraw = this.professor.y + bob;

        this.students.forEach((s, i) => {
            // Animate only if talking or it's player's turn to answer
            if (this.state === 'DIALOGUE_STUDENT' && this.answeringStudentIndex === i) {
                s.yDraw = s.y + Math.sin(this.frame / 5) * 5;
            } 
            // Also animate Player if the Professor is talking TO them
            else if (this.state === 'PLAYER_TURN' && i === 2) {
                s.yDraw = s.y + Math.sin(this.frame / 5) * 5;
            }
            else {
                s.yDraw = s.y;
            }
            // Add slight random idle movement
            s.yDraw += Math.sin((this.frame + i*100) / 30); 
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
        
        // FIX: Explicit Clear to prevent text artifacts/saturation
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Background
        ctx.drawImage(this.assets.bg, 0, 0);

        // 2. Blackboard Topics
        this.drawBoardContent(ctx);

        // 3. Class Rank UI (Top Left)
        this.drawRank(ctx);

        // 4. Professor
        ctx.save();
        ctx.translate(this.professor.x, this.professor.yDraw);
        ctx.scale(2, 2);
        ctx.drawImage(this.assets.prof, -32, -64);
        ctx.restore();

        // 5. Students & Desks
        this.students.forEach(s => {
            // FIX: Draw Student FIRST (Behind desk)
            ctx.save();
            ctx.translate(s.x, s.yDraw);
            
            // Highlight answering student or Player if it's their turn
            const isActing = (this.state === 'DIALOGUE_STUDENT' && this.students.indexOf(s) === this.answeringStudentIndex) || 
                             (this.state === 'PLAYER_TURN' && s.id === 'you');
            
            if (isActing) {
                 ctx.filter = "brightness(1.2)";
                 this.drawArrow(ctx, 0, -80);
            }
            
            ctx.scale(2, 2);
            ctx.drawImage(s.sprite, -32, -40);
            ctx.restore();

            // FIX: Draw Desk SECOND (In front of student)
            ctx.drawImage(this.assets.desk, s.x - 60, s.y - 10, 120, 90);
        });

        // 6. Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color || '#fff';
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
    }

    drawBoardContent(ctx) {
        ctx.fillStyle = '#4ade80'; // Terminal Green
        ctx.font = '20px VT323';
        ctx.textAlign = 'left';
        ctx.fillText("CLASS TOPICS:", 180, 85);

        if (!this.lessonData.concepts) return;

        let y = 120;
        this.lessonData.concepts.forEach((c, i) => {
            ctx.fillStyle = (i === this.currentRound) ? '#fbbf24' : '#fff'; // Highlight current
            ctx.fillText(`- ${c.topic}`, 180, y);
            
            // Draw status marks
            if (c.status === 'correct') {
                ctx.fillStyle = '#4ade80';
                ctx.fillText("✔", 500, y);
            } else if (c.status === 'wrong') {
                ctx.fillStyle = '#ef4444';
                ctx.fillText("✘", 500, y);
            }
            y += 35;
        });
    }

    drawRank(ctx) {
        const x = 20, y = 20;
        const w = 140, h = 120;
        
        // Box
        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Header
        ctx.fillStyle = '#fbbf24';
        ctx.font = '16px VT323';
        ctx.textAlign = 'left';
        ctx.fillText("CLASS RANK", x + 10, y + 25);
        ctx.beginPath(); ctx.moveTo(x, y+35); ctx.lineTo(x+w, y+35); ctx.stroke();

        // Rows
        let rowY = y + 55;
        // Sort by score
        const sorted = [...this.students].sort((a,b) => b.score - a.score);
        
        sorted.forEach(s => {
            ctx.fillStyle = s.color;
            ctx.fillText(s.name, x + 10, rowY);
            ctx.fillStyle = '#fff';
            ctx.fillText(s.score + " ★", x + 100, rowY);
            rowY += 25;
        });
    }

    drawArrow(ctx, x, y) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x, y + 10);
        ctx.fill();
    }

    // --- GAMEPLAY LOGIC ---

    clearBoard() {
        // "Cleaning" context to prevent saturation as requested
        this.lessonData = { text: "...", concepts: [] };
        this.currentRound = 0;
        this.ui.dialogueBox.style.display = 'none';
        this.ui.overlay.style.display = 'none';
        this.ui.textOverlay.style.display = 'none';
    }

    async loadContent() {
        this.clearBoard();
        this.state = 'GENERATING';
        
        await this.showDialogue("SYSTEM", "Clearing Context...", true);
        await this.showDialogue("SYSTEM", "Loading New Curriculum...", false);

        // 1. Get Context
        let rawText = "Mathematics: Basic Algebra and Geometry.";
        let hasArbor = false;
        
        if (window.Arbor && window.Arbor.content) {
            try {
                const lesson = await window.Arbor.content.getNext();
                if (lesson && lesson.text) {
                    rawText = lesson.text;
                    hasArbor = true;
                }
            } catch(e) { console.warn("Arbor offline, using mock."); }
        }
        
        // 2. Generate
        await this.showDialogue("PROFESSOR", "I have wiped the board. Pay attention.", true);
        
        const prompt = `
        Context: "${rawText.substring(0, 800)}".
        Generate 3 distinct topics. For each topic, create a short question, a CORRECT answer (max 3 words), and a PLAUSIBLE WRONG answer (max 3 words).
        Return ONLY valid JSON array:
        [
            { "topic": "Short Topic Name", "q": "Question text", "correct": "Correct Answer", "wrong": "Wrong Answer" }
        ]
        `;

        try {
            let json = null;
            if (hasArbor && window.Arbor.ai) {
                const aiRes = await window.Arbor.ai.chat([{role: "user", content: prompt}]);
                json = this.parseJSON(aiRes);
            }

            if (json && Array.isArray(json)) {
                this.lessonData.concepts = json.map(j => ({ ...j, status: 'pending' }));
                await this.runRound();
            } else {
                throw new Error("Invalid AI format or Offline");
            }

        } catch(e) {
            console.log("Using Fallback Data due to: " + e.message);
            await this.showDialogue("SYSTEM", "AI Connection Unstable. Using textbook.", true);
            this.lessonData.concepts = [
                { topic: "Logic", q: "Is 'False' True?", correct: "No", wrong: "Yes", status: 'pending' },
                { topic: "Math", q: "10 * 10?", correct: "100", wrong: "1000", status: 'pending' },
                { topic: "History", q: "First moon landing?", correct: "1969", wrong: "1999", status: 'pending' }
            ];
            await this.runRound();
        }
    }

    async runRound() {
        if (this.currentRound >= this.lessonData.concepts.length) {
            this.victory();
            return;
        }

        const concept = this.lessonData.concepts[this.currentRound];
        this.currentQ = concept;

        // 1. Pick who will be asked (Lola, Timmy, or YOU)
        // 0: Lola, 1: Timmy, 2: You
        this.answeringStudentIndex = Math.floor(Math.random() * 3);
        const student = this.students[this.answeringStudentIndex];

        // --- SCENARIO A: YOU ARE ASKED (PLAYER TURN) ---
        if (this.answeringStudentIndex === 2) {
            this.state = 'PLAYER_TURN';
            
            // Prof speaks question directly
            await this.showDialogue("PROFESSOR", `You there! ${concept.q} Answer me.`);

            // Wait for Player Input (Typed text)
            this.state = 'INPUT_TEXT';
            const playerText = await this.waitForText(); 

            // Logic: Fuzzy match user text against the correct answer
            // We ignore case and just check if the user included the main words
            const cleanPlayer = playerText.toLowerCase();
            const cleanCorrect = concept.correct.toLowerCase();
            
            // Simple inclusion check
            const isCorrect = cleanPlayer.includes(cleanCorrect) || cleanCorrect.includes(cleanPlayer);

            if (isCorrect) {
                this.shout("CORRECT!");
                this.spawnParticles(student.x, student.y, '#4ade80');
                student.score += 20; // Bonus points for answering directly
                concept.status = 'correct';
                await this.showDialogue("PROFESSOR", `Exactly. "${concept.correct}". Good job.`);
            } else {
                this.shout("WRONG!");
                this.shakeScreen();
                concept.status = 'wrong';
                await this.showDialogue("PROFESSOR", `Incorrect. I was looking for "${concept.correct}".`);
            }
        } 
        
        // --- SCENARIO B: AI STUDENT IS ASKED ---
        else {
            this.state = 'DIALOGUE';
            await this.showDialogue("PROFESSOR", `${concept.topic}: ${concept.q}`);
            
            // Determine if Student is Right or Wrong (50/50 chance)
            const isRight = Math.random() > 0.4;
            const answerText = isRight ? concept.correct : concept.wrong;
            
            // Student Speaks
            this.state = 'DIALOGUE_STUDENT';
            await this.showDialogue(student.name.toUpperCase(), answerText);

            // Player Judges (Using Buttons)
            this.state = 'INPUT';
            const playerJudge = await this.waitForInput(); // Returns true (Correct) or false (Wrong)

            // Evaluate
            const judgmentCorrect = (isRight && playerJudge) || (!isRight && !playerJudge);

            if (judgmentCorrect) {
                this.shout("ACCEPTED!");
                this.spawnParticles(this.students[2].x, this.students[2].y, '#4ade80'); // Green particles on player
                this.students[2].score += 10; 
                concept.status = 'correct';
                await this.showDialogue("PROFESSOR", "Well spotted, Student. Correct.");
            } else {
                this.shout("OBJECTION!");
                this.shakeScreen();
                
                if (isRight) {
                    student.score += 10;
                    await this.showDialogue("PROFESSOR", `No! ${student.name} was actually correct.`);
                } else {
                    await this.showDialogue("PROFESSOR", `Pay attention! That was obviously wrong.`);
                }
                
                concept.status = 'wrong';
            }
        }

        // Next Round
        this.currentRound++;
        setTimeout(() => this.runRound(), 500);
    }

    victory() {
        this.state = 'VICTORY';
        const pScore = this.students[2].score;
        this.shout("CLASS DISMISSED");
        this.showDialogue("PROFESSOR", `Final tally. You scored ${pScore} points.`);
    }

    // --- UTILS ---

    parseJSON(str) {
        if (!str) return null;
        try {
            // Robust Regex to find the first JSON array in the string
            const match = str.match(/\[.*\]/s);
            if (match) {
                return JSON.parse(match[0]);
            }
            return JSON.parse(str);
        } catch (e) { 
            console.error("JSON Parse Error", e);
            return null; 
        }
    }

    waitForInput() {
        this.ui.overlay.style.display = 'flex';
        return new Promise(resolve => {
            this.inputResolver = resolve;
        });
    }

    waitForText() {
        this.ui.textOverlay.style.display = 'flex';
        this.ui.inputField.focus();
        return new Promise(resolve => {
            this.textResolver = resolve;
        });
    }

    showDialogue(speaker, text, auto = false) {
        return new Promise(resolve => {
            this.ui.dialogueBox.style.display = 'block';
            this.ui.speakerName.innerText = speaker;
            
            // Text color based on speaker
            this.ui.dialogueText.style.color = (speaker === 'PROFESSOR') ? '#000' : '#444'; 
            if (speaker === 'SYSTEM') this.ui.dialogueText.style.color = '#666';

            this.ui.dialogueText.innerHTML = ''; 
            
            let i = 0;
            // Clear any existing interval if user clicks fast
            if (this.currentTyping) clearInterval(this.currentTyping);

            this.currentTyping = setInterval(() => {
                this.ui.dialogueText.textContent += text.charAt(i);
                i++;
                if (i >= text.length) {
                    clearInterval(this.currentTyping);
                    this.currentTyping = null;
                    if (auto) {
                        setTimeout(() => resolve(), 1500);
                    } else {
                        this.advanceCallback = resolve;
                    }
                }
            }, 30);
        });
    }

    advanceDialogue() {
        if (this.currentTyping) {
            // Instant finish if typing
            // (Not implemented for simplicity, but good practice)
        }
        
        if (this.advanceCallback) {
            const cb = this.advanceCallback;
            this.advanceCallback = null;
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
        setTimeout(() => this.canvas.style.transform = 'none', 100);
    }

    spawnParticles(x, y, color) {
        for(let i=0; i<20; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 60,
                size: 4,
                color: color
            });
        }
    }
}
