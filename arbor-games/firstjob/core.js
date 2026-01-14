
/**
 * CORE.JS
 * Infrastructure: Config, Audio, Input, Graphics, Particles, and Floating Text.
 */

export const CONFIG = {
    W: 320,
    H: 240,
    TILE: 16,
    MOVE_DELAY: 150,
    ANIM_SPEED: 0.2,
    SHIFT_DURATION: 3000 // Frames (~50 seconds of real time per shift)
};

// Default Palette (Corporate)
export const Palette = {
    bg: '#020617',
    text: '#22d3ee', // Cyan
    hero: '#3b82f6',
    wall: '#334155',
    floor: '#1e293b',
    floor_cafe: '#4a044e',
    desk: '#b45309',
    machine: '#94a3b8',
    plant: '#22c55e',
    stress_low: '#22c55e',
    stress_med: '#facc15',
    stress_high: '#ef4444',
    phone_bg: '#1e293b',
    phone_screen: '#0f172a'
};

export const Themes = {
    corporate: { bg: '#020617', text: '#22d3ee', hero: '#3b82f6', wall: '#334155', floor: '#1e293b', floor_cafe: '#4a044e', desk: '#b45309', machine: '#94a3b8', plant: '#22c55e', phone_bg: '#1e293b', phone_screen: '#0f172a' },
    lab: { bg: '#0f172a', text: '#38bdf8', hero: '#f8fafc', wall: '#cbd5e1', floor: '#475569', floor_cafe: '#64748b', desk: '#e2e8f0', machine: '#94a3b8', plant: '#4ade80', phone_bg: '#1e293b', phone_screen: '#0f172a' },
    studio: { bg: '#292524', text: '#fdba74', hero: '#fb923c', wall: '#78350f', floor: '#44403c', floor_cafe: '#57534e', desk: '#d97706', machine: '#a8a29e', plant: '#84cc16', phone_bg: '#451a03', phone_screen: '#292524' },
    industrial: { bg: '#042f2e', text: '#4ade80', hero: '#2dd4bf', wall: '#134e4a', floor: '#064e3b', floor_cafe: '#14532d', desk: '#65a30d', machine: '#71717a', plant: '#bef264', phone_bg: '#115e59', phone_screen: '#042f2e' }
};

export function setTheme(themeName) {
    const t = Themes[themeName] || Themes.corporate;
    Object.assign(Palette, t);
}

/* --- PARTICLES & FX --- */
export class ParticleSystem {
    constructor() { this.particles = []; }
    
    spawn(x, y, color, count = 5) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color || '#fff',
                size: Math.random() * 3 + 1
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if(p.life <= 0) this.particles.splice(i, 1);
        }
    }
}

export class TextManager {
    constructor() { this.texts = []; }

    spawn(x, y, text, color = '#fff') {
        this.texts.push({ x, y, text, color, life: 1.0, vy: -0.5 });
    }

    update() {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.y += t.vy;
            t.life -= 0.02;
            if(t.life <= 0) this.texts.splice(i, 1);
        }
    }
}

/* --- AUDIO ENGINE --- */
export class AudioSynth {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination);
    }
    play(freq, type, dur, vol = 0.1) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    }
    sfxMove() { this.play(100, 'triangle', 0.05); }
    sfxBump() { this.play(60, 'sawtooth', 0.1); }
    sfxSelect() { this.play(440, 'square', 0.1); }
    sfxPhone() { this.play(600, 'square', 0.1, 0.1); setTimeout(() => this.play(800, 'square', 0.1, 0.1), 100); }
    sfxSuccess() { this.play(500, 'sine', 0.1); setTimeout(()=>this.play(750, 'sine', 0.2), 100); }
    sfxError() { this.play(150, 'sawtooth', 0.2); setTimeout(()=>this.play(100, 'sawtooth', 0.2), 100); }
    sfxCash() { this.play(1200, 'sine', 0.05, 0.1); setTimeout(()=>this.play(1500, 'sine', 0.1, 0.1), 50); }
    sfxEat() { this.play(200, 'sawtooth', 0.1); setTimeout(()=>this.play(250, 'sawtooth', 0.1), 100); }
    sfxBurnout() { this.play(100, 'sawtooth', 1.0, 0.5); setTimeout(()=>this.play(80, 'sawtooth', 1.0, 0.5), 200); }
}

/* --- INPUT SYSTEM --- */
export class Input {
    constructor() {
        this.keys = { UP:false, DOWN:false, LEFT:false, RIGHT:false, A:false, B:false };
        window.addEventListener('keydown', e => this.onKey(e, true));
        window.addEventListener('keyup', e => this.onKey(e, false));
        this.bindBtn('btn-up', 'UP'); this.bindBtn('btn-down', 'DOWN');
        this.bindBtn('btn-left', 'LEFT'); this.bindBtn('btn-right', 'RIGHT');
        this.bindBtn('btn-a', 'A'); this.bindBtn('btn-b', 'B');
    }
    onKey(e, isDown) {
        if (document.activeElement.tagName === 'INPUT') {
            if (e.key === 'Enter' && isDown) { const btn = document.getElementById('btn-submit-task'); if (btn) btn.click(); }
            return; 
        }
        const map = { 'ArrowUp': 'UP', 'w': 'UP', 'ArrowDown': 'DOWN', 's': 'DOWN', 'ArrowLeft': 'LEFT', 'a': 'LEFT', 'ArrowRight': 'RIGHT', 'd': 'RIGHT', 'Enter': 'A', 'z': 'A', ' ': 'A', 'Escape': 'B', 'x': 'B' };
        if(map[e.key]) { e.preventDefault(); this.keys[map[e.key]] = isDown; this.updateVisuals(map[e.key], isDown); }
    }
    bindBtn(id, key) {
        const el = document.getElementById(id); if(!el) return;
        const set = (active) => { this.keys[key] = active; active ? el.classList.add('active') : el.classList.remove('active'); };
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
        el.addEventListener('pointerup', (e) => { e.preventDefault(); set(false); });
        el.addEventListener('pointerleave', (e) => { e.preventDefault(); set(false); });
    }
    updateVisuals(key, active) {
        const map = { 'UP':'btn-up', 'DOWN':'btn-down', 'LEFT':'btn-left', 'RIGHT':'btn-right', 'A':'btn-a', 'B':'btn-b'};
        const el = document.getElementById(map[key]);
        if(el) { active ? el.classList.add('active') : el.classList.remove('active'); }
    }
    consume(key) { if (this.keys[key]) { this.keys[key] = false; this.updateVisuals(key, false); return true; } return false; }
}

/* --- GRAPHICS GENERATOR --- */
export class SpriteGen {
    static create(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
    static get hero() {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(3, 14, 10, 2);
            ctx.fillStyle = '#0f172a'; ctx.fillRect(4, 10, 8, 5); 
            ctx.fillStyle = '#f8fafc'; ctx.fillRect(4, 8, 8, 4);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(7, 8, 2, 4); 
            ctx.fillStyle = '#fca5a5'; ctx.fillRect(4, 2, 8, 7);
            ctx.fillStyle = Palette.hero; ctx.fillRect(4, 1, 8, 3); ctx.fillRect(3, 2, 2, 3);
        });
    }
    static human(shirtColor, hairColor, isVendor = false) {
        return this.create(16, 16, (ctx) => {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(3, 14, 10, 2);
            ctx.fillStyle = shirtColor; ctx.fillRect(4, 8, 8, 6); 
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(7, 8, 2, 4);
            ctx.fillStyle = '#fca5a5'; ctx.fillRect(4, 2, 8, 6);
            ctx.fillStyle = hairColor; ctx.fillRect(4, 1, 8, 3);
            if (isVendor) { ctx.fillStyle = '#fff'; ctx.fillRect(5, 9, 6, 5); ctx.fillRect(4, 0, 8, 2); }
            ctx.fillRect(3, 2, 2, 3); 
        });
    }
    static get recruiterFace() {
        return this.create(64, 64, (ctx) => {
             ctx.fillStyle = '#eab308'; ctx.fillRect(16, 10, 32, 40);
             ctx.fillStyle = '#1e293b'; ctx.fillRect(10, 50, 44, 14); ctx.fillStyle = '#fff'; ctx.fillRect(28, 50, 8, 14); ctx.fillStyle = '#ef4444'; ctx.fillRect(30, 50, 4, 10);
             ctx.fillStyle = '#475569'; ctx.fillRect(14, 6, 36, 10); ctx.fillRect(12, 10, 4, 12);
             ctx.fillStyle = '#000'; ctx.fillRect(20, 24, 6, 4); ctx.fillRect(38, 24, 6, 4);
             ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(18, 22, 10, 8); ctx.strokeRect(36, 22, 10, 8); ctx.beginPath(); ctx.moveTo(28, 26); ctx.lineTo(36, 26); ctx.stroke();
             ctx.fillRect(24, 40, 16, 2);
        });
    }
    static get tiles() {
        const c = document.createElement('canvas'); c.width = 192; c.height = 16; const ctx = c.getContext('2d');
        ctx.fillStyle = Palette.floor; ctx.fillRect(0,0,16,16); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(4,4,8,8);
        ctx.fillStyle = Palette.wall; ctx.fillRect(16,0,16,16); ctx.fillStyle = Palette.bg; ctx.fillRect(16, 0, 16, 2); ctx.fillRect(16, 14, 16, 2);
        ctx.fillStyle = Palette.floor; ctx.fillRect(32,0,16,16); ctx.fillStyle = Palette.desk; ctx.fillRect(34, 4, 12, 10); ctx.fillStyle = '#78350f'; ctx.fillRect(34, 14, 12, 2); ctx.fillStyle = '#fff'; ctx.fillRect(36, 6, 4, 3); 
        ctx.fillStyle = Palette.wall; ctx.fillRect(48,0,16,16); for(let i=0;i<4;i++) { ctx.fillStyle=Palette.floor; ctx.fillRect(48, i*4, 16, 1); } ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.fillText('^', 52, 10);
        ctx.fillStyle = Palette.wall; ctx.fillRect(64,0,16,16); ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.fillText('v', 68, 10);
        ctx.drawImage(c, 32, 0, 16, 16, 80, 0, 16, 16); ctx.fillStyle = '#333'; ctx.fillRect(88, 6, 6, 4);
        ctx.fillStyle = Palette.floor_cafe; ctx.fillRect(96, 0, 16, 16); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(96,0,8,8); ctx.fillRect(104,8,8,8);
        ctx.fillStyle = Palette.floor_cafe; ctx.fillRect(128,0,16,16); ctx.fillStyle = Palette.machine; ctx.fillRect(128, 4, 16, 12); ctx.fillStyle = '#fff'; ctx.fillRect(128, 4, 16, 2); 
        ctx.fillStyle = Palette.floor; ctx.fillRect(144, 0, 16, 16); ctx.fillStyle = '#78350f'; ctx.fillRect(148, 10, 8, 4); ctx.fillStyle = Palette.plant; ctx.beginPath(); ctx.arc(152, 8, 5, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = Palette.floor; ctx.fillRect(160, 0, 16, 16); ctx.fillStyle = Palette.machine; ctx.fillRect(162, 4, 12, 10); ctx.fillStyle = '#fff'; ctx.fillRect(166, 2, 4, 2); 
        ctx.fillStyle = Palette.floor_cafe; ctx.fillRect(176, 0, 16, 16); ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(184, 8, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(184, 8, 4, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
        return c;
    }
}
