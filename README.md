
# 🎮 Arbor Games (The Arcade)

**Decentralized, Context-Aware Educational Games.**

This repository hosts a collection of web-based minigames designed to be played within the [Arbor UI](https://github.com/treesys-org/arbor-ui).

## 🧠 The Concept: "Context-Aware" Gaming

Unlike traditional educational software where questions are hardcoded (e.g., *"What is 2+2?"*), Arbor Games are **engines**. They don't know *what* they are teaching until the moment they are launched.

1.  **The Context:** The user selects a topic in Arbor (e.g., "Quantum Physics" or "Medieval History").
2.  **The Injection:** Arbor launches the game and passes the **content URL** of that specific lesson.
3.  **The Generation:** The game uses an LLM (Local via Ollama or Cloud) to read the lesson text and generate gameplay elements (enemies, puzzles, riddles) based on that specific text in real-time.

---

## 📂 Repository Structure

Each folder in this repository represents a standalone game.

```text
/
├── classroom/          # Game: "The Classroom Simulator"
│   ├── index.html      # Entry point
│   ├── meta.json       # Game metadata
│   └── assets/
├── dungeon/            # Game: "The Knowledge Dungeon"
│   └── ...
├── games_builder.py    # Script to generate manifest.json
└── manifest.json       # The index read by Arbor UI
```

## 🛠️ How to Add a Game

1.  **Create a Folder:** Name it clearly (e.g., `my-quiz-game`).
2.  **Add `index.html`:** This is your entry point. It must be a static web application (HTML/JS/CSS or WASM).
3.  **Add `meta.json`:** Define how it looks in the Arcade.
    ```json
    {
      "name": "My Cool Game",
      "description": "A retro platformer where enemies are quiz questions.",
      "icon": "🕹️",
      "version": "1.0.0",
      "author": "Your Name"
    }
    ```
4.  **Build the Index:** Run the builder script to update the `manifest.json`:
    ```bash
    python games_builder.py
    ```

## 🔌 Game Interface (API)

When Arbor launches your game, it appends parameters to your `index.html` URL. Your game must read these to know what to teach.

**URL Example:**
`https://.../my-game/index.html?source=https://.../data.json&module=content/EN/physics/01_intro`

### Parameters:
*   `source`: The URL of the Arbor Tree (data.json) currently loaded.
*   `module`: The internal ID or Path of the specific lesson/branch selected by the user.
*   `lang`: The language code (e.g., 'EN', 'ES').

### Logic Flow (The "Zero-Touch" Protocol):
1.  **Read** `source` and `module` from URL parameters.
2.  **Fetch** the content JSON from the `source`.
3.  **Extract** the raw text (Markdown/HTML) of the lesson.
4.  **Send** the text to an LLM (e.g., via `window.ai` or a user-configured Ollama endpoint) with a prompt like: *"Extract 3 keywords and a riddle from this text."*
5.  **Generate** the level based on the LLM's response.

---

## 🤖 AI Integration

Arbor games typically rely on Generative AI to parse curriculum content.

*   **Local AI:** Instruct users to run [Ollama](https://ollama.com/) locally (`ollama serve`). Your game can fetch `http://localhost:11434/api/chat` directly from the browser (CORS permitting).
*   **Cloud AI:** You can implement adapters for OpenAI, Anthropic, or Puter.js.

## 📄 License

This repository is open source. Games contributed here effectively become part of the public commons for education.