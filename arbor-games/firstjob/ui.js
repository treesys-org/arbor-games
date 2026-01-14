
/**
 * UI.JS
 * Rendering, HUD, and Visual Effects.
 */
import { CONFIG, Palette } from './core.js';

export class GameUI {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.shakeTimer = 0;
        this.shakeAmount = 0;
    }

    triggerShake(amount) {
        this.shakeAmount = amount;
        this.shakeTimer = 10;
    }

    draw() {
        // Clear
        this.ctx.fillStyle = Palette.bg;
        this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);

        // Shake Effect
        let sx = 0, sy = 0;
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
            sx = (Math.random() - 0.5) * this.shakeAmount;
            sy = (Math.random() - 0.5) * this.shakeAmount;
        }

        this.ctx.save();
        this.ctx.translate(sx, sy);

        if(this.game.state === 'PROLOGUE') { this.drawPrologue(); }
        else if(this.game.state.startsWith('INTERVIEW')) { this.drawVideoCall(); }
        else if(this.game.state === 'GAMEOVER') { this.drawGameOver(); }
        else if(this.game.state === 'CONNECTING_CALL' || this.game.state === 'LOADING' || this.game.state === 'LOADING_TASK') {
            this.drawLoading(this.game.state === 'CONNECTING_CALL' ? this.game.getLine('CONNECTING') : this.game.getLine('LOADING'));
        }
        else {
            this.drawWorld();
            if (this.game.state !== 'TYPING_TASK') {
                this.drawHUD();
                this.drawPhone();
                if(this.game.shop.active) this.drawShop();
            }
        }
        
        // Stress Overlay (Red Tint)
        const stressPct = this.game.stress / this.game.maxStress;
        if (stressPct > 0.5) {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${ (stressPct - 0.5) * 0.3 })`;
            this.ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
        }

        this.ctx.restore();
    }

    drawWorld() {
        this.ctx.save();
        this.ctx.translate(-Math.floor(this.game.camera.x), -Math.floor(this.game.camera.y));

        const f = this.game.building.floors[this.game.player.z];
        
        // CULLING
        const tSize = CONFIG.TILE;
        const startX = Math.max(0, Math.floor(this.game.camera.x / tSize));
        const startY = Math.max(0, Math.floor(this.game.camera.y / tSize));
        const endX = Math.min(f.map[0].length, startX + (CONFIG.W / tSize) + 2);
        const endY = Math.min(f.map.length, startY + (CONFIG.H / tSize) + 2);

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                const t = f.map[y][x];
                let spriteX = t * 16;
                this.ctx.drawImage(this.game.sprites.tiles, spriteX, 0, 16, 16, x*tSize, y*tSize, tSize, tSize);
            }
        }

        if (f.npcs) {
            f.npcs.forEach(npc => {
                // Basic Culling for NPCs
                if(npc.vx < this.game.camera.x - 32 || npc.vx > this.game.camera.x + CONFIG.W) return;

                const bob = Math.sin(this.game.frame * 0.2) * 2;
                let sprite = this.game.getHumanSprite(npc.shirt || '#64748b', npc.hair || '#000', npc.isVendor);
                
                this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                this.ctx.fillRect(npc.vx+2, npc.vy+12, 12, 4);
                this.ctx.drawImage(sprite, npc.vx, npc.vy + bob);
                
                if(npc === this.game.phone.targetNPC) {
                    const yOff = Math.sin(this.game.frame * 0.3) * 3;
                    this.ctx.fillStyle = '#ef4444'; 
                    this.ctx.fillRect(npc.vx+4, npc.vy - 14 + yOff, 8, 8);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 8px monospace';
                    this.ctx.fillText("!", npc.vx + 6, npc.vy - 7 + yOff);
                }
            });
        }

        // Draw Particles in world space
        this.game.particles.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        // Draw Floating Text in world space
        this.ctx.font = '10px "Chakra Petch"';
        this.game.floatingTexts.texts.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.fillText(t.text, t.x, t.y);
        });

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(this.game.player.vx+2, this.game.player.vy+12, 12, 4);
        this.ctx.drawImage(this.game.sprites.hero, this.game.player.vx, this.game.player.vy);
        
        this.ctx.restore();
    }

    drawHUD() {
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
        this.ctx.fillRect(0,0,CONFIG.W, 24);
        this.ctx.fillStyle = Palette.text;
        this.ctx.font = '10px "Chakra Petch", monospace';
        this.ctx.fillText(`$${this.game.money}`, 10, 15);
        
        // Stress
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(60, 6, 60, 6); 
        const stressPct = Math.min(1, this.game.stress / this.game.maxStress);
        let stressColor = stressPct > 0.8 ? Palette.stress_high : (stressPct > 0.5 ? Palette.stress_med : Palette.stress_low);
        this.ctx.fillStyle = stressColor;
        this.ctx.fillRect(61, 7, 58 * stressPct, 4); 
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '8px monospace';
        this.ctx.fillText("STRS", 60, 20);

        // Shift Clock
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(140, 6, 60, 6);
        const timePct = Math.min(1, this.game.shiftTimer / CONFIG.SHIFT_DURATION);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillRect(141, 7, 58 * timePct, 4);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText("TIME", 140, 20);
        
        // Elevator Panel
        const panelW = 40;
        const panelX = CONFIG.W - panelW;
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        this.ctx.fillRect(panelX, 24, panelW, CONFIG.H - 24);
        this.ctx.strokeStyle = '#334155';
        this.ctx.beginPath(); this.ctx.moveTo(panelX, 24); this.ctx.lineTo(panelX, CONFIG.H); this.ctx.stroke();

        this.ctx.textAlign = 'center';
        this.ctx.font = '8px monospace';
        for(let i = this.game.building.floors.length - 1; i >= 0; i--) {
            const y = 34 + ((this.game.building.floors.length - 1 - i) * 16);
            if (this.game.player.z === i) {
                this.ctx.fillStyle = Palette.text;
                this.ctx.fillRect(panelX + 4, y - 6, panelW - 8, 12);
                this.ctx.fillStyle = '#000';
            } else {
                this.ctx.fillStyle = '#64748b';
            }
            let label = i === 0 ? this.game.getLine('LOBBY') : (i === 1 ? this.game.getLine('CAFE') : `F-${i}`);
            this.ctx.fillText(label, panelX + (panelW/2), y + 2);
        }
        this.ctx.textAlign = 'left';

        // Toast
        if(this.game.msg.timer > 0) {
            this.game.msg.timer--;
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, CONFIG.H-30, CONFIG.W-panelW, 30);
            this.ctx.fillStyle = '#facc15';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.game.msg.text, (CONFIG.W-panelW)/2, CONFIG.H-12);
            this.ctx.textAlign = 'left';
        }
    }

    drawPhone() {
        if (this.game.phone.ringing) {
            const floatY = Math.sin(this.game.frame * 0.15) * 2;
            this.ctx.fillStyle = '#ef4444';
            const w = 60, h = 40;
            const px = CONFIG.W - 80, py = CONFIG.H - 60;
            this.ctx.fillRect(px, py + floatY, w, h);
            this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 3; this.ctx.strokeRect(px, py + floatY, w, h);
            this.ctx.fillStyle = '#fff'; this.ctx.font = '10px "Chakra Petch"'; this.ctx.textAlign = 'center';
            this.ctx.fillText(this.game.getLine('INCOMING_CALL'), px + w/2, py + 15 + floatY);
            const scale = 1 + Math.sin(this.game.frame * 0.1) * 0.1;
            this.ctx.font = `bold ${10 * scale}px monospace`;
            this.ctx.fillText(this.game.getLine('PRESS_A'), px + w/2, py + 30 + floatY);
            this.ctx.textAlign = 'left';
            return;
        }

        if (this.game.phone.active) {
            const w = 160; const h = 100;
            const x = (CONFIG.W/2) - (w/2); const y = (CONFIG.H/2) - (h/2);
            this.ctx.fillStyle = Palette.phone_bg; this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeStyle = '#334155'; this.ctx.strokeRect(x,y,w,h);
            this.ctx.fillStyle = Palette.phone_screen; this.ctx.fillRect(x+10, y+10, w-20, h-20);
            this.ctx.fillStyle = Palette.text; this.ctx.font = '10px "Chakra Petch"';
            this.ctx.fillText(this.game.getLine('FROM', {caller: this.game.phone.caller}), x+15, y+25);
            this.ctx.fillStyle = '#fff'; this.ctx.font = '9px monospace';
            const words = this.game.phone.msg.split(' ');
            let line = ""; let ly = y + 45;
            for(let word of words) {
                if ((line + word).length * 5 > w-30) { this.ctx.fillText(line, x+15, ly); line = word + " "; ly += 12; } else line += word + " ";
            }
            this.ctx.fillText(line, x+15, ly);
            this.ctx.fillStyle = '#94a3b8'; this.ctx.textAlign = 'center';
            this.ctx.fillText(`[A] ${this.game.getLine('OK')}`, x + w/2, y + h - 5);
            this.ctx.textAlign = 'left';
        }
    }

    drawShop() {
        const w = 200; const h = 140;
        const x = (CONFIG.W/2) - (w/2); const y = (CONFIG.H/2) - (h/2);
        this.ctx.fillStyle = Palette.floor_cafe; this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = '#fff'; this.ctx.strokeRect(x, y, w, h);
        this.ctx.fillStyle = '#fff'; this.ctx.font = '12px "Chakra Petch"'; this.ctx.textAlign = 'center';
        this.ctx.fillText(this.game.getLine('SHOP_TITLE'), x + w/2, y + 20);
        this.ctx.font = '10px monospace'; this.ctx.textAlign = 'left';
        let iy = y + 40;
        this.game.shop.items.forEach((item, i) => {
            this.ctx.fillStyle = i === this.game.shop.selected ? '#facc15' : '#fff';
            this.ctx.fillText((i===this.game.shop.selected ? "> " : "  ") + item.n, x + 20, iy);
            this.ctx.textAlign = 'right'; this.ctx.fillText(`$${item.cost}`, x + w - 20, iy); this.ctx.textAlign = 'left'; iy += 20;
        });
        const selItem = this.game.shop.items[this.game.shop.selected];
        let effectText = this.game.getLine('EFFECT', {stress: selItem.stress});
        if (selItem.speed) effectText += this.game.getLine('SPEED_BONUS');
        this.ctx.fillStyle = Palette.text; this.ctx.textAlign = 'center'; this.ctx.fillText(effectText, x + w/2, y + h - 30);
        this.ctx.fillStyle = '#94a3b8'; this.ctx.fillText(`[A] ${this.game.getLine('BUY')}   [B] ${this.game.getLine('EXIT')}`, x + w/2, y + h - 10);
        this.ctx.textAlign = 'left';
    }

    drawPrologue() {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        const line = this.game.prologueLines[this.game.prologueIndex];
        this.ctx.fillStyle = Palette.text; this.ctx.textAlign = 'center';
        this.ctx.font = '16px "Chakra Petch"'; this.ctx.fillText(line, CONFIG.W/2, CONFIG.H/2);
        this.ctx.font = '10px monospace'; this.ctx.fillStyle = '#94a3b8';
        if (Math.floor(this.game.frame / 30) % 2 === 0) { this.ctx.fillText(`[${this.game.getLine('PRESS_A')}]`, CONFIG.W/2, CONFIG.H - 40); }
        this.ctx.textAlign = 'left';
    }

    drawVideoCall() {
        this.ctx.fillStyle = Palette.bg; this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        this.ctx.fillStyle = Palette.floor; this.ctx.fillRect(40, 20, CONFIG.W-80, 140);
        this.ctx.strokeStyle = '#475569'; this.ctx.strokeRect(40, 20, CONFIG.W-80, 140);
        const faceX = (CONFIG.W/2) - 32; this.ctx.drawImage(this.game.sprites.recruiter, faceX, 50);
        this.ctx.fillStyle = '#ef4444'; this.ctx.beginPath(); this.ctx.arc(50, 30, 3, 0, Math.PI*2); this.ctx.fill();
        this.ctx.fillStyle = '#fff'; this.ctx.font = '8px monospace'; this.ctx.fillText("REC", 58, 33);
        this.ctx.fillText(this.game.data.company.toUpperCase() + " HR", 50, 130); 
        const cx = CONFIG.W/2; this.ctx.fillStyle = Palette.text; this.ctx.textAlign = 'center'; this.ctx.font = '10px "Chakra Petch"';
        if (this.game.state === 'INTERVIEW_FEEDBACK') {
             this.ctx.fillStyle = '#facc15'; this.ctx.fillText(this.game.lastInterviewFeedback, cx, 150);
             this.ctx.fillStyle = '#fff'; if (Math.floor(this.game.frame / 30) % 2 === 0) { this.ctx.fillText(`[${this.game.getLine('PRESS_A')}]`, cx, 170); }
        }
        this.ctx.textAlign = 'left';
    }

    drawLoading(text) {
        this.ctx.fillStyle = '#000'; this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        const cx = CONFIG.W/2; const cy = CONFIG.H/2; const t = this.game.frame * 0.1;
        this.ctx.strokeStyle = Palette.text; this.ctx.beginPath(); this.ctx.arc(cx, cy, 20, t, t+4); this.ctx.stroke();
        this.ctx.fillStyle = '#fff'; this.ctx.font = '12px "Chakra Petch", monospace'; this.ctx.textAlign = 'center';
        this.ctx.fillText(text, cx, cy + 40); this.ctx.textAlign = 'left';
    }

    drawGameOver() {
        this.ctx.fillStyle = '#450a0a'; this.ctx.fillRect(0,0,CONFIG.W,CONFIG.H);
        this.ctx.fillStyle = '#fff'; this.ctx.textAlign = 'center';
        this.ctx.font = '20px "Chakra Petch"'; this.ctx.fillText(this.game.getLine('GAME_OVER'), CONFIG.W/2, CONFIG.H/2 - 20);
        this.ctx.font = '12px monospace'; this.ctx.fillStyle = '#fca5a5';
        this.ctx.fillText(this.game.msg.text, CONFIG.W/2, CONFIG.H/2 + 10);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillText(`Final Score: ${this.game.score}`, CONFIG.W/2, CONFIG.H/2 + 30);
        if (Math.floor(this.game.frame/30) % 2 === 0) {
            this.ctx.fillStyle = '#fff'; this.ctx.fillText(this.game.getLine('RESTART'), CONFIG.W/2, CONFIG.H/2 + 60);
        }
        this.ctx.textAlign = 'left';
    }
}
