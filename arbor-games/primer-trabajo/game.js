class PrimerTrabajoGame {
    constructor() {
        this.lang = 'ES';
        this.state = {
            phase: 'loading', // loading, offer, interview, workday, end
            profession: null,
            interviewHistory: [],
            workdayScenario: null,
            money: 0,
            clientName: 'Micaela',
        };

        this.clientNames = ['Micaela', 'Javier', 'Sofia', 'Mateo', 'Valentina', 'Bautista', 'Camila', 'Agustín'];

        this.els = {
            status: document.getElementById('arbor-status'),
            loadingScreen: document.getElementById('loading-screen'),
            loadingText: document.getElementById('loading-text'),
            jobOfferScreen: document.getElementById('job-offer-screen'),
            jobTitle: document.getElementById('job-title'),
            jobDescription: document.getElementById('job-description'),
            interviewScreen: document.getElementById('interview-screen'),
            chatContainer: document.getElementById('chat-container'),
            interviewForm: document.getElementById('interview-form'),
            interviewInput: document.getElementById('interview-input'),
            workdayScreen: document.getElementById('workday-screen'),
            bobyDialogue: document.getElementById('boby-dialogue'),
            clientName: document.getElementById('client-name'),
            micaelaProblem: document.getElementById('micaela-problem'),
            workChoices: document.getElementById('work-choices'),
            endScreen: document.getElementById('end-screen'),
            endIcon: document.getElementById('end-icon'),
            endOutcome: document.getElementById('end-outcome'),
            moneyEarned: document.getElementById('money-earned'),
            playerWallet: document.getElementById('player-wallet'),
            playerMoney: document.getElementById('player-money'),
            btnStartInterview: document.getElementById('btn-start-interview'),
            btnRestart: document.getElementById('btn-restart'),
        };

        this.initListeners();
        this.init();
    }

    initListeners() {
        this.els.btnStartInterview.addEventListener('click', () => this.startInterview());
        this.els.interviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInterviewResponse();
        });
        this.els.btnRestart.addEventListener('click', () => this.init());
    }

    async init() {
        this.resetState();
        this.generateClientName();
        
        if (window.Arbor && window.Arbor.storage) {
            this.state.money = window.Arbor.storage.load('primer_trabajo_money') || 0;
        }
        this.updateMoneyUI();
        this.updateUI();

        if (window.Arbor && window.Arbor.user && window.Arbor.user.lang) {
            this.lang = window.Arbor.user.lang.toUpperCase();
        }

        setTimeout(() => {
            if (window.Arbor && window.Arbor.ai && window.Arbor.content) {
                this.els.status.textContent = 'Conectado a ArborOS';
                this.assignJob();
            } else {
                this.els.status.textContent = 'Modo Autónomo (Sin ArborOS)';
                this.runStandalone();
            }
        }, 500);
    }
    
    resetState() {
        this.state.phase = 'loading';
        this.state.profession = null;
        this.state.interviewHistory = [];
        this.state.workdayScenario = null;
        this.els.chatContainer.innerHTML = '';
        this.els.interviewInput.value = '';
    }

    generateClientName() {
        this.state.clientName = this.clientNames[Math.floor(Math.random() * this.clientNames.length)];
    }

    updateMoneyUI() {
        this.els.playerMoney.textContent = `$${this.state.money}`;
    }

    // --- MANEJO DE IA Y CONTENIDO DE ARBOR ---

    async assignJob() {
        try {
            this.els.loadingText.textContent = 'Analizando tu lección actual...';
            const lesson = await window.Arbor.content.getNext();
            if (!lesson || !lesson.text) throw new Error("No hay contenido en la lección.");

            const langName = this.lang === 'ES' ? 'Español' : 'Inglés';
            const prompt = `
                Basado en el siguiente texto sobre "${lesson.title}", inventa un título de trabajo de nivel de entrada adecuado y una descripción de una frase para él.
                El idioma del usuario es ${langName}. Toda la salida debe estar en ${langName}.
                Devuelve SOLO un objeto JSON válido como este: {"job_title": "...", "job_description": "..."}

                Texto: "${lesson.text.substring(0, 1500)}"
            `;
            
            this.els.loadingText.textContent = 'Creando una oferta de trabajo para ti...';
            const response = await this.queryAI(prompt);
            
            this.state.profession = response;
            this.state.phase = 'offer';
            this.updateUI();

        } catch(e) {
            console.error("Error asignando trabajo:", e);
            this.els.loadingText.textContent = `Error: ${e.message}. Usando datos de ejemplo.`;
            setTimeout(() => this.runStandalone(), 2000);
        }
    }

    async startInterview() {
        this.state.phase = 'interview';
        this.updateUI();

        const langName = this.lang === 'ES' ? 'Español' : 'Inglés';
        const prompt = `
            Eres un amable entrevistador contratando para un puesto de "${this.state.profession.job_title}".
            Tu idioma es ${langName}.
            Hazme tu primera pregunta de la entrevista. Sé conciso.
        `;

        const response = await this.queryAI(prompt, false);
        this.addMessageToChat(response, 'ai');
        this.state.interviewHistory.push({ role: 'assistant', content: response });
    }

    async handleInterviewResponse() {
        const userInput = this.els.interviewInput.value.trim();
        if (!userInput) return;

        this.addMessageToChat(userInput, 'player');
        this.state.interviewHistory.push({ role: 'user', content: userInput });
        this.els.interviewInput.value = '';
        this.els.interviewInput.disabled = true;

        const systemPrompt = `Eres un amable entrevistador para el puesto de "${this.state.profession.job_title}". Tu idioma es ${this.lang === 'ES' ? 'Español' : 'Inglés'}. Mantén las preguntas concisas. Después de 2 preguntas, decide si quieres contratarme. Si es así, termina la conversación diciendo "¡Estás contratado/a!" o una frase similar y nada más.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.state.interviewHistory
        ];
        
        this.addMessageToChat('...', 'ai', true); // Show typing indicator
        const response = await window.Arbor.ai.chat(messages);
        const aiText = response.text;

        this.removeTypingIndicator();
        this.addMessageToChat(aiText, 'ai');
        this.state.interviewHistory.push({ role: 'assistant', content: aiText });

        if (aiText.toLowerCase().includes('contratado') || aiText.toLowerCase().includes('hired')) {
            setTimeout(() => this.startWorkday(), 2000);
        } else {
            this.els.interviewInput.disabled = false;
            this.els.interviewInput.focus();
        }
    }
    
    async startWorkday() {
        this.state.phase = 'workday';
        this.updateUI();
        
        this.els.bobyDialogue.textContent = '...';
        this.els.micaelaProblem.textContent = '...';
        this.els.clientName.textContent = this.state.clientName;

        const langName = this.lang === 'ES' ? 'Español' : 'Inglés';
        const prompt = `
            Soy un nuevo empleado como "${this.state.profession.job_title}".
            Crea un escenario corto para mi primer día.
            1. Mi simpático compañero de trabajo, Boby, dice algo para darme la bienvenida.
            2. Un/a cliente/a llamado/a ${this.state.clientName} llega con un problema común relacionado con mi trabajo.
            3. Proporciona dos opciones distintas, de una frase, sobre cómo debería manejar el problema.
            4. Asigna un pago en dólares (un número entero entre 20 y 150) por resolver el problema con éxito.
            El idioma del usuario es ${langName}. Toda la salida debe estar en ${langName}.
            Devuelve SOLO un objeto JSON válido: {"boby_dialogue": "...", "client_problem": "...", "choices": ["opción uno", "opción dos"], "payment": 50}
        `;

        const scenario = await this.queryAI(prompt);
        this.state.workdayScenario = scenario;
        
        this.els.bobyDialogue.textContent = scenario.boby_dialogue;
        this.els.micaelaProblem.textContent = scenario.client_problem;

        this.els.workChoices.innerHTML = '<h3 class="text-center font-semibold text-slate-600">¿Qué harás?</h3>';
        scenario.choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.textContent = choice;
            button.onclick = () => this.handleWorkChoice(choice);
            this.els.workChoices.appendChild(button);
        });
    }

    async handleWorkChoice(choice) {
        this.els.workChoices.innerHTML = `<div class="text-center text-slate-500">Procesando tu decisión...</div>`;

        const langName = this.lang === 'ES' ? 'Español' : 'Inglés';
        const prompt = `
            Escenario: Soy un nuevo "${this.state.profession.job_title}". Un/a cliente/a, ${this.state.clientName}, tuvo este problema: "${this.state.workdayScenario.client_problem}".
            Mi respuesta fue: "${choice}".
            Describe el resultado de mi acción en una o dos frases. Y determina si la elección fue exitosa.
            El idioma del usuario es ${langName}.
            Devuelve SOLO un objeto JSON válido: {"outcome": "El resultado de tu acción...", "success": true}
        `;
        
        const result = await this.queryAI(prompt);
        this.endGame(result.outcome, result.success);
    }
    
    endGame(outcomeText, success) {
        this.state.phase = 'end';
        this.els.endOutcome.textContent = outcomeText;
        this.els.endIcon.textContent = success ? '🎉' : '🤔';
        
        const payment = this.state.workdayScenario.payment || 50;

        if (success) {
            this.state.money += payment;
            this.els.moneyEarned.textContent = `+ $${payment} Ganados`;
            if (window.Arbor.storage) {
                window.Arbor.storage.save('primer_trabajo_money', this.state.money);
            }
            if (window.Arbor.game) {
                window.Arbor.game.addXP(100);
            }
        } else {
            this.els.moneyEarned.textContent = `+ $0 Ganados`;
             if (window.Arbor.game) {
                window.Arbor.game.addXP(25);
            }
        }
        
        this.updateMoneyUI();
        this.updateUI();
    }


    // --- MODO STANDALONE Y UTILIDADES ---

    runStandalone() {
        this.state.profession = {
            job_title: "Probador de Juegos",
            job_description: "Aseguras la calidad y diversión de nuevas experiencias interactivas."
        };
        this.state.phase = 'offer';
        this.updateUI();
    }

    async queryAI(prompt, parseJson = true) {
        const response = await window.Arbor.ai.chat([{ role: 'user', content: prompt }]);
        if (parseJson) {
            try {
                // Limpieza robusta de la respuesta de la IA
                const cleanResponse = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                const match = cleanResponse.match(/\{[\s\S]*\}/);
                if (match) {
                    return JSON.parse(match[0]);
                }
                return JSON.parse(cleanResponse);
            } catch (e) {
                console.error("Fallo al parsear JSON de la IA:", e, "Respuesta cruda:", response.text);
                throw new Error("La IA devolvió un formato inesperado.");
            }
        }
        return response.text;
    }

    // --- RENDERIZADO Y UI ---
    
    addMessageToChat(text, sender, isTyping = false) {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble');
        if(isTyping) {
            bubble.classList.add('chat-bubble-ai', 'typing-indicator');
            bubble.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;
        } else {
            bubble.classList.add(sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-player');
            bubble.textContent = text;
        }
        this.els.chatContainer.appendChild(bubble);
        this.els.chatContainer.scrollTop = this.els.chatContainer.scrollHeight;
    }
    
    removeTypingIndicator() {
        const indicator = this.els.chatContainer.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    updateUI() {
        const screens = {
            loading: this.els.loadingScreen,
            offer: this.els.jobOfferScreen,
            interview: this.els.interviewScreen,
            workday: this.els.workdayScreen,
            end: this.els.endScreen,
        };

        for (const screen in screens) {
            screens[screen].classList.add('hidden');
        }
        if (screens[this.state.phase]) {
            screens[this.state.phase].classList.remove('hidden');
        }

        if (this.state.phase === 'offer' && this.state.profession) {
            this.els.jobTitle.textContent = this.state.profession.job_title;
            this.els.jobDescription.textContent = this.state.profession.job_description;
        }
    }
}

new PrimerTrabajoGame();