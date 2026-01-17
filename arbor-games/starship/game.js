
// =============================================================================
//  STARSHIP LEARNER - GAME ENGINE
// =============================================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const loadingScreen = document.getElementById('loading');
const landingPrompt = document.getElementById('landing-prompt');
const lessonModal = document.getElementById('lesson-computer');
const lessonContentDiv = document.getElementById('lesson-content');
const btnLiftoff = document.getElementById('btn-liftoff');

// Game State
const state = {
    planets: [],
    stars: [],
    ship: {
        x: 0, y: 0,
        vx: 0, vy: 0,
        angle: -Math.PI / 2,
        thrust: false,
        rotateLeft: false,
        rotateRight: false,
        fuel: 100
    },
    camera: { x: 0, y: 0 },
    activePlanet: null, // The planet we are currently hovering over
    isLanded: false,
    visitedCount: 0
};

// Config
const CONFIG = {
    SHIP_SIZE: 20,
    THRUST_POWER: 0.15,
    ROTATION_SPEED: 0.07,
    FRICTION: 0.98, // Space isn't perfect vacuum in games
    PLANET_RADIUS_BASE: 60,
    ORBIT_DISTANCE: 120
};

// =============================================================================
//  INITIALIZATION & ARBOR BRIDGE
// =============================================================================

async function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // Wait for Arbor Bridge to inject
    let attempts = 0;
    const checkBridge = setInterval(async () => {
        if (window.Arbor) {
            clearInterval(checkBridge);
            document.getElementById('loading-status').innerText = "Connected to Knowledge Core.";
            await setupGameLevel();
        } else {
            attempts++;
            if (attempts > 20) {
                // Fallback for development outside Arbor
                clearInterval(checkBridge);
                console.warn("Arbor Bridge not found. Loading Mock Data.");
                setupMockData();
            }
        }
    }, 200);

    // Controls
    setupInput();
    
    // Start Loop
    requestAnimationFrame(gameLoop);
}

async function setupGameLevel() {
    try {
        // 1. Get Curriculum List from Arbor SDK
        const lessons = window.Arbor.content.getList();
        
        if (!lessons || lessons.length === 0) {
            alert("This sector is empty (No lessons found).");
            return;
        }

        document.getElementById('sector-name').innerText = "MODULE SECTOR";
        document.getElementById('total-count').innerText = lessons.length;

        // 2. Generate Galaxy Map (Spiral Layout)
        state.planets = lessons.map((lesson, index) => {
            // Spiral math
            const angle = index * 0.8; // Radians separation
            const distance = 400 + (index * 300); // Expanding outward
            
            return {
                id: lesson.id, // Original Node ID needed for fetching content
                index: index, // Playlist index
                title: lesson.title,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                radius: CONFIG.PLANET_RADIUS_BASE + (Math.random() * 20),
                color: generatePlanetColor(index),
                visited: false,
                ringOffset: Math.random() * Math.PI
            };
        });

        // 3. Generate Starfield
        generateStars();

        // 4. Hide Loading
        loadingScreen.classList.add('hidden');
        loadingScreen.style.display = 'none';

    } catch (e) {
        console.error(e);
        document.getElementById('loading-status').innerText = "Error: " + e.message;
    }
}

function setupMockData() {
    // Fallback for testing index.html directly
    window.Arbor = {
        content: {
            getAt: async (idx) => ({ title: "Mock Lesson", text: "<p>This is a test lesson content.</p>" })
        }
    };
    const mockLessons = Array.from({length: 10}, (_, i) => ({ id: i, title: `Lesson ${i+1}` }));
    
    state.planets = mockLessons.map((l, i) => ({
        id: l.id, index: i, title: l.title,
        x: Math.cos(i) * (400 + i*200),
        y: Math.sin(i) * (400 + i*200),
        radius: 60,
        color: generatePlanetColor(i),
        visited: false,
        ringOffset: 0
    }));
    generateStars();
    loadingScreen.style.display = 'none';
    document.getElementById('total-count').innerText = 10;
}

function generatePlanetColor(index) {
    const hues = [200, 280, 150, 30, 340]; // Blue, Purple, Green, Orange, Red
    const hue = hues[index % hues.length];
    return `hsl(${hue}, 70%, 50%)`;
}

function generateStars() {
    for (let i = 0; i < 1000; i++) {
        state.stars.push({
            x: (Math.random() - 0.5) * 10000,
            y: (Math.random() - 0.5) * 10000,
            size: Math.random() * 2,
            opacity: Math.random()
        });
    }
}

// =============================================================================
//  GAME LOOP & PHYSICS
// =============================================================================

function update() {
    if (state.isLanded) return;

    // 1. Ship Physics
    if (state.ship.rotateLeft) state.ship.angle -= CONFIG.ROTATION_SPEED;
    if (state.ship.rotateRight) state.ship.angle += CONFIG.ROTATION_SPEED;

    if (state.ship.thrust) {
        state.ship.vx += Math.cos(state.ship.angle) * CONFIG.THRUST_POWER;
        state.ship.vy += Math.sin(state.ship.angle) * CONFIG.THRUST_POWER;
    }

    state.ship.vx *= CONFIG.FRICTION;
    state.ship.vy *= CONFIG.FRICTION;

    state.ship.x += state.ship.vx;
    state.ship.y += state.ship.vy;

    // 2. Camera Follow (Smooth Lerp)
    const targetX = state.ship.x - canvas.width / 2;
    const targetY = state.ship.y - canvas.height / 2;
    state.camera.x += (targetX - state.camera.x) * 0.1;
    state.camera.y += (targetY - state.camera.y) * 0.1;

    // 3. Collision / Proximity Check
    let nearestDist = Infinity;
    let nearestPlanet = null;

    state.planets.forEach(p => {
        const dx = state.ship.x - p.x;
        const dy = state.ship.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlanet = p;
        }
    });

    // Check orbit range
    if (nearestPlanet && nearestDist < nearestPlanet.radius + CONFIG.ORBIT_DISTANCE) {
        if (state.activePlanet !== nearestPlanet) {
            state.activePlanet = nearestPlanet;
            // UI Update
            document.getElementById('target-planet').innerText = nearestPlanet.title;
            landingPrompt.style.opacity = 1;
        }
    } else {
        if (state.activePlanet) {
            state.activePlanet = null;
            landingPrompt.style.opacity = 0;
        }
    }

    // 4. Update HUD Data
    const speed = Math.sqrt(state.ship.vx**2 + state.ship.vy**2).toFixed(1);
    document.getElementById('hud-vel').innerText = speed;
    document.getElementById('hud-pos').innerText = `${Math.round(state.ship.x)},${Math.round(state.ship.y)}`;
}

function draw() {
    // Clear Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply Camera
    ctx.translate(-state.camera.x, -state.camera.y);

    // 1. Draw Stars (Parallax optional, keeping simple for performance)
    ctx.fillStyle = '#ffffff';
    state.stars.forEach(star => {
        // Optimization: Only draw if on screen
        if (star.x > state.camera.x && star.x < state.camera.x + canvas.width &&
            star.y > state.camera.y && star.y < state.camera.y + canvas.height) {
            ctx.globalAlpha = star.opacity;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1;

    // 2. Draw Links (Constellation lines between planets)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Draw lines connecting indexes sequentially
    for (let i = 0; i < state.planets.length - 1; i++) {
        ctx.moveTo(state.planets[i].x, state.planets[i].y);
        ctx.lineTo(state.planets[i+1].x, state.planets[i+1].y);
    }
    ctx.stroke();

    // 3. Draw Planets
    state.planets.forEach(p => {
        // Glow
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius * 2);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Body
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = p.visited ? '#10b981' : p.color;
        ctx.lineWidth = p.visited ? 4 : 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Orbit Ring Visual
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 20, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.title, p.x, p.y + p.radius + 30);
        
        // Icon/Number
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '24px monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.visited ? '✓' : (p.index + 1), p.x, p.y);
    });

    // 4. Draw Ship
    ctx.translate(state.ship.x, state.ship.y);
    ctx.rotate(state.ship.angle);

    // Thrust Flame
    if (state.ship.thrust) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-10, 5);
        ctx.lineTo(-30 - Math.random() * 10, 0); // Flickering tail
        ctx.lineTo(-10, -5);
        ctx.fill();
    }

    // Ship Body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-15, 12);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-15, -12);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(-2, 0, 4, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// =============================================================================
//  INPUT & ACTIONS
// =============================================================================

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (state.isLanded) {
            if (e.key === 'Escape') liftOff();
            return;
        }
        
        switch(e.key) {
            case 'ArrowUp': case 'w': state.ship.thrust = true; break;
            case 'ArrowLeft': case 'a': state.ship.rotateLeft = true; break;
            case 'ArrowRight': case 'd': state.ship.rotateRight = true; break;
            case ' ': if (state.activePlanet) landOnPlanet(); break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowUp': case 'w': state.ship.thrust = false; break;
            case 'ArrowLeft': case 'a': state.ship.rotateLeft = false; break;
            case 'ArrowRight': case 'd': state.ship.rotateRight = false; break;
        }
    });
    
    // UI Button Binding
    btnLiftoff.onclick = liftOff;
}

async function landOnPlanet() {
    state.isLanded = true;
    landingPrompt.style.opacity = 0;
    
    // Show Modal
    lessonModal.classList.remove('lesson-closed');
    lessonModal.classList.add('lesson-open');
    
    lessonContentDiv.innerHTML = '<div class="text-center p-12 text-blue-400 animate-pulse">DOWNLOADING DATA STREAM...</div>';

    try {
        // Fetch Content via Bridge
        const lessonData = await window.Arbor.content.getAt(state.activePlanet.index);
        
        // Render Content
        // Note: lessonData.text is simplified plain text, lessonData.raw is raw markdown/html.
        // We can check if `window.Arbor.ai` exists to summarize?
        
        let html = `<h1 class="text-3xl font-black mb-4 text-white">${lessonData.title}</h1>`;
        
        // Convert newlines to breaks for simple rendering if no markdown parser
        // (Arbor usually sends cleaned HTML-like strings or raw markdown)
        // For robustness, we handle simple text formatting
        const body = lessonData.text.split('\n').map(p => `<p>${p}</p>`).join('');
        
        html += body;
        lessonContentDiv.innerHTML = html;
        
        // Mark as visited
        if (!state.activePlanet.visited) {
            state.activePlanet.visited = true;
            state.visitedCount++;
            document.getElementById('visited-count').innerText = state.visitedCount;
            
            // Give XP
            if (window.Arbor.game && window.Arbor.game.addXP) {
                window.Arbor.game.addXP(20);
            }
        }

    } catch(e) {
        lessonContentDiv.innerHTML = `<div class="text-red-500 font-bold">DATA CORRUPTION: ${e.message}</div>`;
    }
}

function liftOff() {
    state.isLanded = false;
    lessonModal.classList.remove('lesson-open');
    lessonModal.classList.add('lesson-closed');
    
    // Push ship away slightly to avoid instant re-dock
    state.ship.vx += Math.cos(state.ship.angle) * 2;
    state.ship.vy += Math.sin(state.ship.angle) * 2;
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Start
init();
