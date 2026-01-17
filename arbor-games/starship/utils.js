
/**
 * UTILS.JS
 * Helper functions and Procedural Art Generation
 */

export class InputManager {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            this.keys[e.key.toLowerCase()] = true; // Handle Z/z
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    // New helper for Touch UI to drive input state
    setKey(key, isActive) {
        this.keys[key] = isActive;
        if (key.length === 1) {
            this.keys[key.toLowerCase()] = isActive;
            this.keys[key.toUpperCase()] = isActive;
        }
    }

    consume(k) {
        if (this.keys[k]) {
            this.keys[k] = false;
            return true;
        }
        return false;
    }

    reset() {
        this.keys = {};
    }
}

export class SeededRandom {
    constructor(seed) {
        this.seed = this.hashString(seed || "arbor");
    }
    hashString(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
        return hash;
    }
    next() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
    range(min, max) { return min + this.next() * (max - min); }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    
    // Simple 1D noise for terrain
    noise(x) {
        const i = Math.floor(x);
        const f = x - i;
        const w = f * f * (3 - 2 * f);
        const s = Math.sin((i * 12.9898) * 43758.5453) * 10000;
        const n1 = s - Math.floor(s);
        const s2 = Math.sin(((i + 1) * 12.9898) * 43758.5453) * 10000;
        const n2 = s2 - Math.floor(s2);
        return n1 * (1 - w) + n2 * w;
    }
}

export function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y);
}

// --- VISUAL GENERATORS ---

export const ArtGen = {
    // Creates a cached canvas for a planet to avoid re-drawing noise every frame
    createPlanetTexture: (radius, colorBase, seed) => {
        const size = radius * 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const rng = new SeededRandom(seed);

        const cx = radius;
        const cy = radius;

        // 1. Base Gradient (Spherical look)
        const grad = ctx.createRadialGradient(cx - radius*0.3, cy - radius*0.3, radius*0.1, cx, cy, radius);
        grad.addColorStop(0, colorBase);
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();

        // 2. Procedural Noise (Bands/Craters)
        ctx.globalCompositeOperation = 'overlay';
        for(let i=0; i<40; i++) {
            const w = rng.range(radius * 0.2, radius * 1.5);
            const h = rng.range(radius * 0.05, radius * 0.2);
            const x = rng.range(0, size);
            const y = rng.range(0, size);
            const rot = rng.range(-0.5, 0.5);
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.fillStyle = rng.next() > 0.5 ? '#ffffff33' : '#00000033';
            ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // 3. Atmosphere Glow (Outer Ring)
        ctx.globalCompositeOperation = 'source-over';
        // Mask outside circle
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();
        
        // Return generated image
        return canvas;
    },

    createNebulaBackground: (w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#020617';
        ctx.fillRect(0,0,w,h);

        // Nebula Clouds
        for(let i=0; i<20; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 300 + 100;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            const hue = Math.floor(Math.random() * 60) + 200; // Blue/Purple range
            grad.addColorStop(0, `hsla(${hue}, 70%, 20%, 0.1)`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        }
        
        // Stars
        ctx.globalCompositeOperation = 'source-over';
        for(let i=0; i<500; i++) {
            ctx.fillStyle = Math.random() > 0.9 ? '#a5f3fc' : '#fff';
            ctx.globalAlpha = Math.random();
            const sz = Math.random() * 1.5;
            ctx.beginPath(); ctx.arc(Math.random()*w, Math.random()*h, sz, 0, Math.PI*2); ctx.fill();
        }

        return canvas;
    }
};

// Procedural Sprite Drawer
export const Sprites = {
    drawShipLanded: (ctx, x, y) => {
        ctx.save();
        ctx.translate(x, y);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(32, 60, 25, 5, 0, 0, Math.PI*2); ctx.fill();

        // Legs
        ctx.fillStyle = '#475569';
        ctx.beginPath(); ctx.moveTo(10, 40); ctx.lineTo(0, 60); ctx.lineTo(8, 60); ctx.lineTo(20, 40); ctx.fill();
        ctx.beginPath(); ctx.moveTo(54, 40); ctx.lineTo(64, 60); ctx.lineTo(56, 60); ctx.lineTo(44, 40); ctx.fill();

        // Main Hull - Sleek
        const grad = ctx.createLinearGradient(0, 0, 64, 60);
        grad.addColorStop(0, '#e2e8f0');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(32, 0); // Tip
        ctx.quadraticCurveTo(64, 30, 54, 55); // Right curve
        ctx.lineTo(10, 55); // Bottom
        ctx.quadraticCurveTo(0, 30, 32, 0); // Left curve
        ctx.closePath();
        ctx.fill();
        
        // Detail Lines
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(32, 55); ctx.stroke();

        // Cockpit
        ctx.fillStyle = '#0ea5e9';
        ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(32, 25, 8, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        
        // Cockpit Glint
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(30, 23, 2, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    },

    drawAstronaut: (ctx, x, y, facing, state, frame) => {
        ctx.save();
        ctx.translate(x + 16, y + 24); // Pivot center
        ctx.scale(facing, 1);
        
        // Bobbing Animation
        let bob = 0;
        if (state === 'run') bob = Math.sin(frame * 0.4) * 2;
        if (state === 'idle') bob = Math.sin(frame * 0.05) * 1;
        
        // Run Tilt
        if (state === 'run') ctx.rotate(0.1);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, 24, 10, 3, 0, 0, Math.PI*2); ctx.fill();

        // Back Leg
        ctx.fillStyle = '#94a3b8';
        if (state === 'run') {
            const off = Math.sin(frame * 0.4 + Math.PI) * 6;
            ctx.beginPath(); ctx.roundRect(-6 + off, 10, 6, 14, 3); ctx.fill();
        } else {
            ctx.beginPath(); ctx.roundRect(-6, 10, 6, 14, 3); ctx.fill();
        }

        ctx.translate(0, bob);

        // Body
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.roundRect(-9, -8, 18, 20, 4); ctx.fill();
        
        // Backpack
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.roundRect(-13, -6, 4, 16, 2); ctx.fill();

        // Helmet
        const hGrad = ctx.createRadialGradient(-3, -13, 2, 0, -10, 12);
        hGrad.addColorStop(0, '#ffffff');
        hGrad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = hGrad; 
        ctx.beginPath(); ctx.arc(0, -10, 11, 0, Math.PI*2); ctx.fill();
        
        // Visor
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.roundRect(2, -13, 9, 6, 2); ctx.fill();
        ctx.shadowBlur = 0;
        
        // Front Leg
        ctx.fillStyle = '#cbd5e1';
        if (state === 'run') {
            const off = Math.sin(frame * 0.4) * 6;
            ctx.beginPath(); ctx.roundRect(-2 + off, 10, 6, 14, 3); ctx.fill();
        } else {
            ctx.beginPath(); ctx.roundRect(0, 10, 6, 14, 3); ctx.fill();
        }
        
        // Arm
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.roundRect(-4, 0, 12, 5, 2); ctx.fill();
        
        // Gun
        ctx.fillStyle = '#334155';
        ctx.fillRect(6, -1, 8, 4);
        ctx.fillStyle = '#ef4444'; // Red tip
        ctx.fillRect(12, -1, 2, 2);

        ctx.restore();
    },

    drawAlien: (ctx, x, y, color, height, frame) => {
        const bob = Math.sin(frame * 0.1) * 3;
        ctx.save();
        ctx.translate(x, y + bob);
        
        // Glow
        ctx.shadowColor = color; ctx.shadowBlur = 15;
        
        // Robe (Gradient)
        const grad = ctx.createLinearGradient(0,0,0,height);
        grad.addColorStop(0, color);
        grad.addColorStop(1, '#000');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.quadraticCurveTo(32, height/2, 28, height);
        ctx.quadraticCurveTo(16, height-5, 4, height);
        ctx.quadraticCurveTo(0, height/2, 16, 0);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Head
        ctx.fillStyle = '#dcfce7'; // Pale green
        ctx.beginPath(); ctx.ellipse(16, 0, 12, 16, 0, 0, Math.PI*2); ctx.fill();
        
        // Eyes (Black voids)
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(12, 2, 3, 5, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(20, 2, 3, 5, -0.2, 0, Math.PI*2); ctx.fill();

        // Staff
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(28, 10); ctx.lineTo(28, height); ctx.stroke();
        // Staff Orb
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(28, 8, 3, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    },

    drawBlob: (ctx, x, y, color) => {
        // Gooey effect
        ctx.fillStyle = color;
        ctx.shadowColor = color; ctx.shadowBlur = 5;
        ctx.beginPath();
        // Aggressive spikes
        ctx.moveTo(x+16, y);
        ctx.lineTo(x+26, y+10);
        ctx.lineTo(x+32, y+24);
        ctx.lineTo(x+16, y+32);
        ctx.lineTo(x, y+24);
        ctx.lineTo(x+6, y+10);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Angry Eyes
        ctx.fillStyle = '#000';
        // Left
        ctx.beginPath(); ctx.moveTo(x+8, y+12); ctx.lineTo(x+14, y+18); ctx.lineTo(x+8, y+18); ctx.fill();
        // Right
        ctx.beginPath(); ctx.moveTo(x+24, y+12); ctx.lineTo(x+18, y+18); ctx.lineTo(x+24, y+18); ctx.fill();
        
        ctx.fillStyle = '#fff'; // pupils
        ctx.fillRect(x+10, y+15, 2, 2);
        ctx.fillRect(x+20, y+15, 2, 2);
    },

    drawHut: (ctx, x, y, w, h, baseColor) => {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(w/2, h, w/2 + 10, 10, 0, 0, Math.PI*2); ctx.fill();

        // Main Dome
        const grad = ctx.createLinearGradient(0,0,0,h);
        grad.addColorStop(0, '#475569'); // Slate
        grad.addColorStop(1, '#1e293b'); // Dark Slate
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(0, 0, w/2, 0); // Left curve up
        ctx.quadraticCurveTo(w, 0, w, h); // Right curve down
        ctx.fill();

        // Banding/Plating
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(5, h-10); ctx.quadraticCurveTo(w/2, h-30, w-5, h-10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15, h-40); ctx.quadraticCurveTo(w/2, h-60, w-15, h-40); ctx.stroke();

        // Doorway
        ctx.fillStyle = '#0f172a'; // Dark void
        ctx.beginPath();
        ctx.ellipse(w/2, h, 15, 25, 0, Math.PI, 0); 
        ctx.fill();
        
        // Glow inside door
        ctx.fillStyle = 'rgba(250, 204, 21, 0.2)'; // Yellow glow
        ctx.beginPath();
        ctx.ellipse(w/2, h, 10, 20, 0, Math.PI, 0); 
        ctx.fill();
        
        // Antenna
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, -15); ctx.stroke();
        ctx.fillStyle = baseColor; 
        ctx.beginPath(); ctx.arc(w/2, -15, 3, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    }
};
