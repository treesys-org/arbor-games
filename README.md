
# 🎮 Arbor Games (The Arcade)

**The Future of Educational Gaming: Context-Aware Engines.**

---

## 🤯 What is this? (The Innovation)

**Stop hardcoding questions. Start building engines.**

In traditional ed-tech, to teach "History", you build a specific game about History. To teach "Physics", you build a separate game. This is slow and expensive.

**Arbor changes the paradigm.**

Here, you build **Empty Engines**.
*   You build a generic RPG.
*   You build a generic Trivia Show.
*   You build a generic Trading Sim.

When a student plays your game, Arbor injects the **Lesson Text** (Context) + **User Language** (Locale). Your game passes this to an AI, and the AI generates the levels, enemies, and questions **in real-time**.

**One Game. Infinite Topics. Any Language.**

---

## ⚡ How it Works

1.  **The User** opens a lesson (e.g., "Photosynthesis") in **Spanish**.
2.  **Your Game** asks Arbor: *"Who is playing and what are they reading?"*
3.  **Arbor** replies: *"User is 'Maria', Language is 'ES', Lesson is 'Photosynthesis...'."*
4.  **Your Game** tells the AI: *"Generate a quiz in Spanish based on this text."*
5.  **The AI** returns JSON. The game starts.
6.  **The User** wins. Your game sends **XP** and **Saves Progress** back to Arbor.

---

## 🏃 How to Run the Arcade

Before building, let's run the console.

### 1. Prerequisites
You need **Python 3** installed (to act as a local web server).

### 2. Start the Server
Browsers block AI connections if you just double-click files. You **must** run a server.

1.  Open a terminal in this folder (`arbor-games-main`).
2.  Run this command:
    ```bash
    python -m http.server 8000
    ```
3.  Open your browser: **http://localhost:8000**

You will see the Arcade Menu.

---

## 🛠️ How to Create a Game

Let's build a "Context-Aware" cartridge called **"Super Quiz"**.

### Step 1: The Folder
Create a folder inside `arbor-games/` (e.g., `super-quiz`).
Inside it, create `index.html` and `meta.json`.

```text
/arbor-games
  /super-quiz
    index.html    <-- The Code
    meta.json     <-- The Info
```

### Step 2: The Master Template (Copy & Paste)
This template uses **ALL** the features of Arbor: Language, Identity, Raw Content, AI, XP, and **Persistence**.

**Paste this into `index.html`:**

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { background: #1a1a1a; color: #fff; font-family: sans-serif; text-align: center; padding: 40px; }
        button { padding: 15px 30px; font-size: 1.2rem; cursor: pointer; background: #22c55e; border: none; color: #000; font-weight: bold; border-radius: 10px; margin-top: 20px; }
        .hidden { display: none; }
        .stat-box { border: 1px solid #333; display: inline-block; padding: 10px; border-radius: 8px; margin: 10px; }
    </style>
</head>
<body>
    <h1 id="greeting">👋 Hello!</h1>
    
    <div id="stats">
        <span class="stat-box">🏆 High Score: <span id="high-score">0</span></span>
    </div>

    <div id="loading">🧠 AI is reading your lesson...</div>
    
    <!-- Game Content -->
    <div id="game-ui" class="hidden">
        <h3 id="topic" style="color: #4ade80;">...</h3>
        <h2 id="question">...</h2>
        <p id="answer" style="color: #888; margin-bottom: 30px;">(Spoiler)</p>
        <button onclick="finishGame()">✅ I Learned It! (Get XP)</button>
    </div>

    <script>
        // --- 1. CONFIGURATION ---
        const PROMPT_TEMPLATE = `
            Read the lesson text.
            User Language: "{lang}". 
            Create 1 trivia question about the text in that language.
            Return JSON: {"q": "Question text", "a": "Answer text"}
        `;
        
        let currentHighScore = 0;

        // --- 2. GAME LOGIC ---
        function renderGame(data, topicTitle) {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('game-ui').classList.remove('hidden');
            
            document.getElementById('topic').innerText = "Topic: " + topicTitle;
            document.getElementById('question').innerText = data.q;
            document.getElementById('answer').innerText = data.a;
        }

        function finishGame() {
            if (window.Arbor) {
                // 4. GAMIFICATION: Reward the player
                window.Arbor.game.addXP(50);
                
                // 5. PERSISTENCE: Save new high score
                const newScore = currentHighScore + 50;
                window.Arbor.storage.save('super_quiz_high_score', newScore);
                
                document.getElementById('high-score').innerText = newScore;
                alert("XP Gained! Progress Saved.");
            } else {
                alert("Dev Mode: XP would be sent here.");
            }
        }

        // --- 3. THE BRIDGE (BOILERPLATE) ---
        window.onload = async function() {
            if (window.Arbor) {
                // 1. IDENTITY: Get User Data
                const user = window.Arbor.user; 
                document.getElementById('greeting').innerText = `Hola, ${user.username}!`;

                // 2. PERSISTENCE: Load previous data
                const savedScore = await window.Arbor.storage.load('super_quiz_high_score');
                if (savedScore) {
                    currentHighScore = parseInt(savedScore);
                    document.getElementById('high-score').innerText = currentHighScore;
                }

                // 3. CONTENT: Get Raw Lesson Data (Title, Text)
                const lesson = await window.Arbor.content.getNext();
                // You can access lesson.text manually here if you want to bypass AI!

                // 4. INTELLIGENCE: Ask AI (Context is injected automatically)
                const prompt = PROMPT_TEMPLATE.replace("{lang}", user.lang);
                window.Arbor.ai.askJSON(prompt, (aiData) => {
                    renderGame(aiData, lesson.title);
                });

            } else {
                // Dev Mode (Running in browser without Arbor)
                renderGame({ q: "What is 2+2?", a: "4 (Dev Mode)" }, "Math 101");
            }
        };
    </script>
</body>
</html>
```

### Step 3: The Metadata (`meta.json`)
Paste this into `meta.json`.

```json
{
  "name": "Super Quiz",
  "description": "A quiz that remembers your score.",
  "icon": "🧠",
  "version": "1.0.0",
  "author": "Me"
}
```

### Step 4: Register the Game
Run the builder script to update the menu (`manifest.json`).

```bash
python game_builder.py
```

---

## 🧪 Testing your Game

### Phase A: Local (Fast)
Go to `http://localhost:8000/arbor-games/super-quiz/index.html`.
*   **Result:** You see "Dev Mode". This confirms your HTML/JS is valid.

### Phase B: Integration (The Real Deal)
To see the AI actually read a lesson and generate content:
1.  Download the **[Arbor UI](https://github.com/treesys-org/arbor-ui)** (The App).
2.  Open Arbor, select a lesson (e.g., Biology).
3.  Go to **Arcade** -> **Add Game URL**.
4.  Paste your local link: `http://localhost:8000/arbor-games/super-quiz/index.html`.
5.  **Play.** You will see your game greet you by name, show the lesson title, and generate a question.

---

## 🔌 The Arbor Bridge API (Reference)

When inside Arbor, `window.Arbor` is available.

### `Arbor.user` (Identity)
*   `username`: String (e.g., "Alice")
*   `lang`: String (e.g., "EN", "ES", "DE"). **Crucial for prompts.**
*   `avatar`: Emoji or URL.

### `Arbor.content.getNext()` (Raw Data)
Access the current lesson before asking the AI.
```javascript
const lesson = await window.Arbor.content.getNext();
console.log(lesson.title); // "Photosynthesis"
console.log(lesson.text);  // "The process by which plants..."
```

### `Arbor.ai.askJSON(prompt)` (Intelligence)
Sends your prompt + lesson text to the LLM. Returns a JS Object.
```javascript
const level = await window.Arbor.ai.askJSON("Create 3 enemies.");
```

### `Arbor.game.addXP(amount)` (Gamification)
Awards experience points to the user's global profile.
```javascript
window.Arbor.game.addXP(100);
```

### `Arbor.storage` (Persistence)
Save data that persists between game sessions (even if the user changes lessons).
Data is stored in the user's local browser or synced cloud account.

```javascript
// Save a simple value or object
window.Arbor.storage.save('my_game_gold', 500);

// Load data (async supported)
const gold = await window.Arbor.storage.load('my_game_gold');
```

---

## 📄 License
Open Source (GPL-3.0). Contributions welcome.
