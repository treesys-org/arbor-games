# 🎮 Arbor Games (The Arcade)

**The Developer Guide to Decentralized, Context-Aware Gaming.**

Welcome to the Arbor Arcade. This repository is a collection of "cartridges"—web-based minigames designed to run inside the [Arbor Learning Interface](https://github.com/treesys-org/arbor-ui).

## 🧠 The Philosophy: "Context-Aware" Engines

In traditional ed-tech, content is hardcoded (e.g., a database of questions about the Civil War).
In **Arbor**, games are empty **engines**. They define mechanics (jumping, matching, racing) but have no data.

1.  **Injection:** When a user plays a game while studying "Quantum Physics", Arbor injects that text into the game.
2.  **Synthesis:** The game sends that text to an LLM (via the Arbor Bridge) with a prompt like *"Turn this text into 5 trivia questions"*.
3.  **Gameplay:** The game parses the AI response and builds the level in real-time.

---

## 🚀 Quick Start: Create Your First Game

### 1. The Structure
Create a new folder inside `arbor-games/`. Let's call it `super-quiz`.
Your game must be a static web app (HTML/JS/CSS).

```text
/arbor-games
  /super-quiz
    index.html      <-- Entry point (Required)
    style.css       <-- Optional
    game.js         <-- Optional
    meta.json       <-- Metadata (Required for the menu)
```

### 2. The Metadata (`meta.json`)
Create this file so the Arcade menu knows how to display your game.

```json
{
  "name": "Super Quiz 3000",
  "description": "A cyberpunk trivia battle against an AI.",
  "icon": "🤖",
  "version": "1.0.0",
  "author": "Your Name"
}
```

### 3. Register the Game
Run the builder script to update the `manifest.json`.
```bash
python game_builder.py
```

---

## 🔌 The Arbor Bridge API (v2)

Arbor injects a global object `window.Arbor` into your `index.html`. This is your gateway to the outside world.

### 1. `Arbor.user` (Identity)
Get the player's profile.
```javascript
if (window.Arbor && window.Arbor.user) {
    console.log(`Hello, ${Arbor.user.username}!`);
    // Avatar is a base64 string or URL
    document.getElementById('avatar').src = Arbor.user.avatar; 
}
```

### 2. `Arbor.content` (The Context)
**CRITICAL:** This is how you make your game educational. Get the text the user is currently studying.

```javascript
// Returns a Promise resolving to { title: string, text: string }
const lesson = await window.Arbor.content.getNext();
console.log("Topic:", lesson.title); 
console.log("Source Text:", lesson.text);
```

### 3. `Arbor.ai` (The Intelligence)
Access the user's local or cloud LLM. You send a prompt; you get a string back.

**Best Practice:** Ask for JSON output to make parsing easier.

```javascript
const prompt = `
    Read this text: "${lesson.text.substring(0, 1000)}".
    Create 3 true/false questions based on it.
    Return ONLY a JSON array like: [{"q": "Question?", "a": true}]
`;

const response = await window.Arbor.ai.chat([
    { role: "user", content: prompt }
]);

// Note: LLMs might wrap JSON in markdown blocks (```json ... ```).
// Always clean the string before parsing!
const cleanJson = response.replace(/```json/g, '').replace(/```/g, '');
const questions = JSON.parse(cleanJson);
```

### 4. `Arbor.storage` (Persistence)
Save progress, high scores, or inventory. This data persists across sessions for this specific game.

```javascript
// Load (returns null if empty)
let highScore = window.Arbor.storage.load('high_score') || 0;

// Save
window.Arbor.storage.save('high_score', 9999);
```

### 5. `Arbor.game` (Gamification)
Communicate game state back to the Arbor OS.

```javascript
// Give the user XP (Arbor handles leveling up)
window.Arbor.game.addXP(50);

// Close the game
window.Arbor.game.exit();
```

---

## 🛠️ Development Best Practices

### 1. Always Handle "Standalone Mode"
When developing locally (opening `index.html` in your browser), `window.Arbor` will be undefined. Your code should handle this gracefully so you can test mechanics without the full UI.

```javascript
const Engine = {
    async init() {
        if (window.Arbor) {
            // Production Mode
            this.user = window.Arbor.user;
            this.content = await window.Arbor.content.getNext();
        } else {
            // Dev/Standalone Mode
            console.warn("Running in Standalone Mode");
            this.user = { username: "DevPlayer" };
            this.content = { 
                title: "Mock Topic", 
                text: "This is mock text for testing purposes..." 
            };
        }
        this.startGame();
    }
}
```

### 2. Handling Latency
Generating content via `Arbor.ai` takes time (2-10 seconds depending on the model).
*   **Do:** Show a loading screen ("Consulting the Oracle...", "Downloading Curriculum...").
*   **Do:** Use the `lesson.text` length limit. Don't send 10,000 words to the LLM; truncate it to ~1000 characters for speed.

### 3. Error Handling
LLMs can hallucinate or return bad JSON.
*   Wrap your `JSON.parse` in a `try/catch` block.
*   If parsing fails, have a fallback content set or retry the request.

---

## 📄 License
Open Source (GPL-3.0). Contributions welcome.
