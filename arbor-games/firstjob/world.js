
/**
 * WORLD.JS
 * Procedural generation, Map Management, and NPC Logic.
 */

import { CONFIG } from './core.js';

export class Building {
    constructor() {
        this.floors = [];
        this.w = 20; 
        this.h = 15; 
    }

    generate(deptNames) {
        // Floor 0: Lobby
        this.floors.push(this.makeLobby());
        
        // Floor 1: Cafeteria (Fixed)
        this.floors.push(this.makeCafeteria(1, "COMEDOR"));

        // Floors 2+: Offices
        deptNames.forEach((n, i) => this.floors.push(this.makeOffice(i+2, n)));
    }

    makeLobby() {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1); 
        this.fill(map, 1,1,this.w-2,this.h-2, 0); 
        this.fill(map, 8, 4, 4, 1, 2); // Reception Desk
        
        const npcs = [];
        npcs.push({x: 10, y: 3, role: 'Receptionist', phrase: "Bienvenido a Arbor Corp.", color: '#ef4444'});

        map[2][this.w-3] = 3; // Stairs UP
        map[this.h-3][2] = 9; // Plant
        map[this.h-3][this.w-3] = 9; // Plant

        return { z:0, name:"LOBBY", map, npcs, spawns:{ up:{x:this.w-3, y:3}, down:{x:10, y:6} } };
    }

    makeCafeteria(z, name) {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1);
        this.fill(map, 1,1,this.w-2,this.h-2, 6); // Checker floor
        
        // Counter
        this.fill(map, 8, 4, 6, 1, 8); 

        // Tables
        for(let y=7; y<this.h-3; y+=3) {
            for(let x=4; x<this.w-4; x+=3) {
                 map[y][x] = 11; 
            }
        }
        
        const npcs = [];
        // Vendor
        npcs.push({
            x: 11, y: 3, 
            role: 'Vendor', 
            phrase: "¿Algo de comer?", 
            isVendor: true,
            color: '#ec4899', 
            hair: '#facc15'
        });

        // Some people eating
        for(let i=0; i<3; i++) {
             npcs.push({
                x: 4 + (i*4), y: 8,
                role: 'Eating',
                shirt: '#64748b', hair:'#000',
                moveTimer: 0
             });
        }

        map[2][this.w-3] = 3; // Up
        map[2][2] = 4; // Down
        
        return { z, name, map, npcs, spawns:{ up:{x:this.w-3, y:3}, down:{x:2, y:3} } };
    }

    makeOffice(z, name) {
        const map = this.blankMap();
        this.fill(map, 0,0,this.w,this.h, 1);
        this.fill(map, 1,1,this.w-2,this.h-2, 0);
        
        // Generate Cubicles
        for(let y=3; y<this.h-3; y+=3) {
            for(let x=3; x<this.w-3; x+=3) {
                if(Math.random() > 0.3) {
                    map[y][x] = 5; 
                    map[y][x+1] = 2; 
                }
            }
        }
        
        // Random Props
        for(let y=2; y<this.h-2; y++) {
            for(let x=2; x<this.w-2; x++) {
                if(map[y][x] === 0 && Math.random() < 0.05) {
                    const props = [9, 10]; 
                    map[y][x] = props[Math.floor(Math.random()*props.length)];
                }
            }
        }

        // NPCs
        const npcs = [];
        const count = 3 + Math.floor(Math.random()*3);
        const shirtColors = ['#64748b', '#ef4444', '#22c55e', '#eab308', '#ec4899', '#3b82f6'];
        const hairColors = ['#000', '#78350f', '#facc15', '#fca5a5'];

        for(let i=0; i<count; i++) {
            let placed = false;
            while(!placed) {
                const rx = 2 + Math.floor(Math.random()*(this.w-4));
                const ry = 2 + Math.floor(Math.random()*(this.h-4));
                if(map[ry][rx] === 0) {
                    npcs.push({
                        id: `npc_${z}_${i}`,
                        x: rx, y: ry, 
                        vx: rx * CONFIG.TILE, vy: ry * CONFIG.TILE, 
                        role: 'Worker', 
                        moveTimer: Math.random() * 100,
                        shirt: shirtColors[Math.floor(Math.random()*shirtColors.length)],
                        hair: hairColors[Math.floor(Math.random()*hairColors.length)],
                        sprite: null,
                        task: null 
                    });
                    placed = true;
                }
            }
        }

        map[2][this.w-3] = 3; // Up
        map[2][2] = 4; // Down
        
        return { z, name, map, npcs, spawns:{ up:{x:this.w-3, y:3}, down:{x:2, y:3} } };
    }

    blankMap() { return Array(this.h).fill().map(() => Array(this.w).fill(0)); }
    fill(map, x, y, w, h, v) { for(let iy=y; iy<y+h; iy++) for(let ix=x; ix<x+w; ix++) map[iy][ix] = v; }
}
