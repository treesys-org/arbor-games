
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
6.  **The User** wins. Your game sends **XP**, **Saves Progress**, and updates **Memory Health**.

---

## 🧠 Memory Core (SRS System)

Arbor tracks the "Memory Health" of every lesson using a **Spaced Repetition System (SRS)** (based on the SM-2 algorithm).

Your game is not just for fun; it is a tool for **Knowledge Maintenance**.

### 1. Reading State: `Arbor.memory.getDue()`
Check if the player is about to forget the current topic.
*   **Returns:** Array of Strings (Node IDs that are "Due").

**Use Case: "The Withered World"**
If the lesson is due, make your game look "decayed" or "dry". Playing the game "waters" the knowledge.

```javascript
const currentLesson = await window.Arbor.content.getNext();
const dueList = window.Arbor.memory.getDue();

// Check if THIS specific lesson is in the "Due" list
const isWithered = dueList.includes(currentLesson.id);

if (isWithered) {
    console.log("URGENT: This knowledge is fading!");
    // TODO: Set game background to 'desert' or 'ruins'
    // TODO: Show "BONUS XP" for restoring memory
} else {
    // TODO: Set game background to 'lush garden'
}
```

### 2. Writing State: `Arbor.memory.report(nodeId, quality)`
Tell Arbor how well the player remembers the topic. This updates the forgetting curve.

*   `nodeId`: The ID of the lesson (get this from `Arbor.content.getNext()`).
*   `quality`: Integer (0-5).

**Quality Score Guide:**

| Score | Meaning | Game Logic Equivalent |
| :--- | :--- | :--- |
| **0** | **Blackout** | Player failed the level completely. Game Over. |
| **1** | **Incorrect** | Player struggled, got most answers wrong. |
| **2** | **Hard** | Player passed but with < 50% health/score. |
| **3** | **Pass** | Standard win. Good effort. |
| **4** | **Good** | Solid win. Fast reaction time. |
| **5** | **Perfect** | Flawless victory. No damage/errors. |

```javascript
// Example: Level Complete
function onVictory(score, maxScore) {
    const percentage = score / maxScore;
    
    let quality = 3;
    if (percentage > 0.9) quality = 5;
    else if (percentage > 0.7) quality = 4;
    
    // Tell Arbor to schedule the next review based on this performance
    window.Arbor.memory.report(currentLesson.id, quality);
}
```

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
This template uses **ALL** the features of Arbor: Language, Identity, Raw Content, AI, XP, Persistence, and **Memory**.

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
        .watering-mode { color: #60a5fa; font-weight: bold; }
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
        let currentLessonId = null;
        let isWatering = false;

        // --- 2. GAME LOGIC ---
        function renderGame(data, topicTitle) {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('game-ui').classList.remove('hidden');
            
            const topicEl = document.getElementById('topic');
            topicEl.innerText = "Topic: " + topicTitle;
            
            if (isWatering) {
                topicEl.innerHTML += " <span class='watering-mode'>[WATERING MODE 💧]</span>";
            }

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
                
                // 6. MEMORY CORE: Report success (SRS)
                if (window.Arbor.memory) {
                    // Quality 5 = Perfect/Easy
                    window.Arbor.memory.report(currentLessonId, 5); 
                }
                
                document.getElementById('high-score').innerText = newScore;
                alert("XP Gained! Memory Watered!");
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

                // 3. CONTENT & MEMORY
                const lesson = await window.Arbor.content.getNext();
                currentLessonId = lesson.id;
                
                // Check if this lesson needs watering
                if (window.Arbor.memory) {
                    const due = window.Arbor.memory.getDue();
                    if (due.includes(currentLessonId)) {
                        isWatering = true;
                    }
                }

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

---

## ⚖️ Assets & Licensing

This project is designed to be **Asset-Free**. It does not use external images, sprites, or audio files that could pose copyright risks.

*   **Graphics:** All visuals (sprites, planets, UI) are **Procedurally Generated** using the HTML5 Canvas API. The code that generates them is open source (GPL-3.0).
*   **Icons:** The interface uses Standard Unicode Emojis. These are text characters rendered by the user's operating system.
*   **Fonts:** Uses fonts from Google Fonts (Open Font License), which are free for commercial use.
*   **Audio:** Sound effects are synthesized in real-time using the Web Audio API (`AudioContext`). No `.mp3` or `.wav` samples are included.

---

## 🔌 The Arbor Bridge API (Reference)

When inside Arbor, `window.Arbor` is available.

### 1. Identity (`Arbor.user`)
*   `username`: String (e.g., "Alice")
*   `lang`: String (e.g., "EN", "ES", "DE"). **Crucial for prompts.**
*   `avatar`: Emoji or URL.

### 2. Content & Navigation (`Arbor.content`)

**Method A: Linear Access (Default)**
Used for most games (RPG, Quiz). Gets the *active* lesson immediately.
```javascript
const lesson = await window.Arbor.content.getNext();
console.log(lesson.title); // "Photosynthesis"
console.log(lesson.text);  // "The process by which plants..."
```

**Method B: Non-Linear Access (Advanced)**
Used for Galaxy Maps, Hubs, or Explorers (like *Starship Learner*).
Allows you to build a map of the entire syllabus.

```javascript
// 1. Get the Syllabus (List of metadata)
// Returns: [{ id: "uuid", title: "Lesson 1", index: 0, status: "completed" }, ...]
const modules = window.Arbor.content.getList();

// 2. Load Content Specific (When player lands on a planet/node)
// Returns: Full lesson object { id, title, text, ... }
const specificLesson = await window.Arbor.content.getAt(2);
```

### 3. Intelligence (`Arbor.ai`)
`Arbor.ai.askJSON(prompt)` sends your prompt + lesson text to the LLM. Returns a JS Object.
```javascript
const level = await window.Arbor.ai.askJSON("Create 3 enemies.");
```

### 4. Gamification (`Arbor.game`)
`Arbor.game.addXP(amount)` awards experience points to the user's global profile.
```javascript
window.Arbor.game.addXP(100);
```

### 5. Persistence (`Arbor.storage`)
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
