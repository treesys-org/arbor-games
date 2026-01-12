/**
 * ASSETS.JS
 * Procedural Pixel Art Generator
 * Creates game assets on the fly using offscreen canvas to avoid loading external images.
 */

export const Colors = {
    bg: '#2c2c2c',
    board: '#1e3a29',
    boardFrame: '#4a3b32',
    skin: '#fca',
    hair_prof: '#ccc',
    suit_prof: '#374151',
    hair_p1: '#a16207',
    shirt_p1: '#15803d'
};

export class SpriteGen {
    static createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return { c, ctx: c.getContext('2d') };
    }

    static generateProfessor() {
        const { c, ctx } = this.createCanvas(64, 64);
        
        // Body
        ctx.fillStyle = Colors.suit_prof;
        ctx.fillRect(16, 32, 32, 32); // Torso
        
        // Head
        ctx.fillStyle = Colors.skin;
        ctx.fillRect(20, 10, 24, 24);
        
        // Hair (Grey Pompadour)
        ctx.fillStyle = Colors.hair_prof;
        ctx.fillRect(18, 6, 28, 10);
        ctx.fillRect(18, 6, 6, 18);
        
        // Glasses
        ctx.fillStyle = '#000';
        ctx.fillRect(22, 20, 8, 4);
        ctx.fillRect(34, 20, 8, 4);
        ctx.fillStyle = '#fff'; // Glint
        ctx.fillRect(23, 21, 2, 2);
        
        // Tie
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(30, 32, 4, 12);
        
        return c;
    }

    static generateStudent(colorOverride) {
        const { c, ctx } = this.createCanvas(64, 64);
        
        // Body
        ctx.fillStyle = colorOverride || Colors.shirt_p1;
        ctx.fillRect(14, 30, 36, 34);
        
        // Head
        ctx.fillStyle = Colors.skin;
        ctx.fillRect(20, 10, 24, 22);
        
        // Hair
        ctx.fillStyle = Colors.hair_p1;
        ctx.fillRect(18, 8, 28, 8);
        ctx.fillRect(16, 8, 6, 16);
        ctx.fillRect(42, 8, 6, 16);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(24, 18, 4, 4);
        ctx.fillRect(36, 18, 4, 4);
        
        return c;
    }

    static generateBackground(w, h) {
        const { c, ctx } = this.createCanvas(w, h);
        
        // Wall
        ctx.fillStyle = '#e5e5e5';
        ctx.fillRect(0, 0, w, h);
        
        // Floor
        ctx.fillStyle = '#b45309'; // Wood
        ctx.fillRect(0, h * 0.7, w, h * 0.3);
        
        // Floor details
        ctx.fillStyle = '#92400e';
        for(let i=0; i<w; i+=40) ctx.fillRect(i, h*0.7, 2, h*0.3);

        // Blackboard
        ctx.fillStyle = Colors.boardFrame;
        ctx.fillRect(w * 0.15 - 10, h * 0.1 - 10, w * 0.7 + 20, h * 0.45 + 20);
        ctx.fillStyle = Colors.board;
        ctx.fillRect(w * 0.15, h * 0.1, w * 0.7, h * 0.45);

        return c;
    }

    static generateDesk() {
        const { c, ctx } = this.createCanvas(80, 60);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, 10, 80, 50);
        ctx.fillStyle = '#92400e'; // Top
        ctx.fillRect(0, 0, 80, 15);
        ctx.fillStyle = '#000'; // Shadow
        ctx.globalAlpha = 0.2;
        ctx.fillRect(5, 15, 70, 2);
        return c;
    }
}