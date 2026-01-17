
/**
 * UTILS.JS
 * Helper functions for RNG and Drawing
 */

// Pseudo-Random Number Generator (Seeded)
export class SeededRandom {
    constructor(seed) {
        this.seed = this.hashString(seed || "arbor");
    }

    // DJB2 Hash
    hashString(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return hash;
    }

    // Returns float 0-1
    next() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    // Range [min, max)
    range(min, max) {
        return min + this.next() * (max - min);
    }
    
    // Choose random from array
    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
    
    // Generate a Hex Color
    color() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(this.next() * 16)];
        }
        return color;
    }
}

// Basic Collision Check (AABB)
export function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || 
             r2.x + r2.w < r1.x || 
             r2.y > r1.y + r1.h || 
             r2.y + r2.h < r1.y);
}

// Sprite Generator (Pixel Art via Canvas)
export const Sprites = {
    astronaut: (color) => {
        const c = document.createElement('canvas'); c.width = 24; c.height = 32; const ctx = c.getContext('2d');
        // Helmet
        ctx.fillStyle = '#fff'; ctx.fillRect(4, 2, 16, 16);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(6, 6, 12, 8); // Visor
        // Body
        ctx.fillStyle = color; ctx.fillRect(4, 18, 16, 12);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(2, 18, 4, 10); ctx.fillRect(18, 18, 4, 10); // Arms
        ctx.fillStyle = '#334155'; ctx.fillRect(6, 30, 4, 2); ctx.fillRect(14, 30, 4, 2); // Feet
        return c;
    },
    alien: (color) => {
        const c = document.createElement('canvas'); c.width = 24; c.height = 24; const ctx = c.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(4, 8, 16, 16); // Body
        ctx.fillRect(2, 4, 4, 4); ctx.fillRect(18, 4, 4, 4); // Ears
        ctx.fillStyle = '#000'; ctx.fillRect(6, 12, 4, 4); ctx.fillRect(14, 12, 4, 4); // Eyes
        ctx.fillStyle = '#fff'; ctx.fillRect(7, 13, 1, 1); ctx.fillRect(15, 13, 1, 1);
        return c;
    },
    enemy: () => {
        const c = document.createElement('canvas'); c.width = 24; c.height = 24; const ctx = c.getContext('2d');
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(12, 12, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(12, 14); ctx.lineTo(16, 8); ctx.fill();
        return c;
    }
};
