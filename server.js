const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const MAPA_W = 1200;
const MAPA_H = 800;

// --- CONFIGURACIÓN DE CLASES ---
const CLASES = {
    'tanque': { hp: 300, velocidad: 3,  dano: 8,  radio: 30, color: '#3498db', reload: 15 },
    'sniper': { hp: 80,  velocidad: 6,  dano: 40, radio: 15, color: '#f1c40f', reload: 40 },
    'medico': { hp: 120, velocidad: 5,  dano: 10, radio: 20, color: '#2ecc71', reload: 10 } 
};

const TIENDA = {
    'dano':   { costo: 150, nombre: "Daño (+10%)" },
    'speed':  { costo: 100, nombre: "Motor (+1)" }
};

class Entidad {
    constructor(x, y, radio, color) {
        this.x = x; this.y = y; this.radio = radio; this.color = color;
        this.borrar = false;
        this.hitTimer = 0;
    }
}

class Jugador extends Entidad {
    constructor(id) {
        super(Math.random() * 200, Math.random() * 200, 20, 'white');
        this.id = id;
        this.nombre = null;
        this.lastWords = null;
        this.clase = null;
        this.score = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.velocidad = 0;
        this.dano = 0;
        this.cooldown = 0;
        this.maxCooldown = 0;
    }

    asignarClase(tipo) {
        const c = CLASES[tipo];
        if(!c) return;
        this.clase = tipo;
        this.hp = c.hp;
        this.maxHp = c.hp;
        this.velocidad = c.velocidad;
        this.dano = c.dano;
        this.radio = c.radio;
        this.color = c.color;
        this.maxCooldown = c.reload;
    }
}

class Bala extends Entidad {
    constructor(x, y, angulo, idDueno, color, dano, esSanadora) {
        super(x, y, 8, color);
        this.id = Math.random();
        this.vx = Math.cos(angulo) * 36;
        this.vy = Math.sin(angulo) * 36;
        this.idDueno = idDueno;
        this.dano = dano;
        this.esSanadora = esSanadora;
        this.distancia = 0;
    }

    mover() {
        this.x += this.vx; this.y += this.vy;
        this.distancia += 36;
        if (this.distancia > 1200 || this.x < 0 || this.x > MAPA_W || this.y < 0 || this.y > MAPA_H) {
            this.borrar = true;
        }
    }
}

class Jefe extends Entidad {
    constructor() {
        super(MAPA_W/2, MAPA_H/2, 90, '#e74c3c');
        this.hp = 3000;
        this.maxHp = 3000;
        this.velocidad = 1.5;
        this.tiempo = 0;
    }

    pensar(jugadores) {
        let target = null;
        let minD = 9999;
        
        for(let id in jugadores){
            let j = jugadores[id];
            if(!j.clase) continue;
            let d = Math.sqrt((j.x-this.x)**2 + (j.y-this.y)**2);
            if(d < minD){ minD = d; target = j; }
        }

        if(target){
            let ang = Math.atan2(target.y - this.y, target.x - this.x);
            this.x += Math.cos(ang) * this.velocidad;
            this.y += Math.sin(ang) * this.velocidad;

            // Evitar que el jefe salga del mapa
            this.x = Math.max(this.radio, Math.min(MAPA_W - this.radio, this.x));
            this.y = Math.max(this.radio, Math.min(MAPA_H - this.radio, this.y));
        }

        this.tiempo++;
        if(this.tiempo % 120 === 0) {
            for(let i=0; i<8; i++) {
                balas.push(new Bala(this.x, this.y, (Math.PI*2/8)*i + this.tiempo, 'BOSS', 'red', 20, false));
            }
        }
    }
}

let jugadores = {};
let balas = [];
let jefe = new Jefe();

function getTop5Leaderboard() {
    return Object.entries(jugadores)
        .filter(([, j]) => j.clase)
        .map(([id, j]) => ({ id, nombre: j.nombre || 'Piloto', score: j.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

io.on('connection', (socket) => {
    jugadores[socket.id] = new Jugador(socket.id);

    socket.on('elegirClase', (data) => {
        const j = jugadores[socket.id];
        if (!j) return;
        const tipo = typeof data === 'string' ? data : (data?.clase || data);
        const nombre = (typeof data === 'object' && data?.nombre) ? String(data.nombre).trim().slice(0, 10) : '';
        const lastWords = (typeof data === 'object' && data?.lastWords) ? String(data.lastWords).trim().slice(0, 30) : '';
        j.nombre = nombre || 'Piloto X';
        j.lastWords = lastWords || undefined;
        j.asignarClase(tipo);
    });

    socket.on('comprar', (item) => {
        let j = jugadores[socket.id];
        if(j && j.clase && TIENDA[item] && j.score >= TIENDA[item].costo) {
            j.score -= TIENDA[item].costo;
            if(item === 'dano') j.dano *= 1.1; 
            if(item === 'speed') j.velocidad += 1;
            socket.emit('compraOk');
        }
    });

    socket.on('movimiento', (d) => {
        let j = jugadores[socket.id];
        if(j && j.clase) { 
            // NUEVO: Limitar movimiento dentro del mapa (Colisión con los bordes)
            j.x = Math.max(j.radio, Math.min(MAPA_W - j.radio, d.x));
            j.y = Math.max(j.radio, Math.min(MAPA_H - j.radio, d.y));
        }
    });

    socket.on('disparar', (angulo) => {
        let j = jugadores[socket.id];
        if (j && j.clase && j.cooldown <= 0) {
            let esSanadora = (j.clase === 'medico');
            let colorBala = esSanadora ? '#2ecc71' : 'yellow';
            
            balas.push(new Bala(j.x, j.y, angulo, socket.id, colorBala, j.dano, esSanadora));
            j.cooldown = j.maxCooldown; 
        }
    });

    socket.on('disconnect', () => { delete jugadores[socket.id]; });
});

setInterval(() => {
    for(let id in jugadores) {
        if(jugadores[id].cooldown > 0) jugadores[id].cooldown--;
    }

    if(jefe.hp > 0) jefe.pensar(jugadores);
    else {
        io.emit('mensajeGlobal', "¡VICTORIA! RONDA COMPLETADA");
        for(let id in jugadores) jugadores[id].score += 500;
        jefe.maxHp *= 1.2; jefe.hp = jefe.maxHp; jefe.velocidad += 0.2;
        jefe.x = MAPA_W/2; jefe.y = MAPA_H/2;
        balas = [];
    }

    for (let i = balas.length - 1; i >= 0; i--) {
        let b = balas[i];
        b.mover();

        if(b.idDueno === 'BOSS'){
            for(let id in jugadores){
                let j = jugadores[id];
                if(!j.clase) continue;
                if(Math.sqrt((b.x-j.x)**2 + (b.y-j.y)**2) < j.radio + 5){
                    j.hp -= b.dano;
                    b.borrar = true;
                    io.emit('impacto', { x: b.x, y: b.y, color: j.color });
                    break;
                }
            }
        } 
        else {
            if(Math.sqrt((b.x-jefe.x)**2 + (b.y-jefe.y)**2) < jefe.radio + 10){
                jefe.hp -= b.dano;
                b.borrar = true;
                if(jugadores[b.idDueno]) jugadores[b.idDueno].score += 5;
                io.emit('impacto', { x: b.x, y: b.y, color: jefe.color });
            }
            else if(b.esSanadora) {
                for(let id in jugadores){
                    let j = jugadores[id];
                    if(id !== b.idDueno && Math.sqrt((b.x-j.x)**2 + (b.y-j.y)**2) < j.radio + 10){
                        j.hp = Math.min(j.hp + b.dano, j.maxHp); 
                        b.borrar = true;
                        if(jugadores[b.idDueno]) jugadores[b.idDueno].score += 10;
                    }
                }
            }
        }
        if(b.borrar) balas.splice(i, 1);
    }

    // Colisión Jefe vs Jugadores
    if(jefe.hp > 0) {
        for(let id in jugadores) {
            const jugador = jugadores[id];
            if(!jugador.clase) continue;
            
            const dist = Math.hypot(jefe.x - jugador.x, jefe.y - jugador.y);
            if(dist < (jefe.radio + jugador.radio)) {
                jugador.hp -= 2;
            }
        }
    }

    for(let id in jugadores){
        if(jugadores[id].clase && jugadores[id].hp <= 0){
            const muerteX = jugadores[id].x;
            const muerteY = jugadores[id].y;
            io.emit('mensajeMuerte', { x: muerteX, y: muerteY, texto: jugadores[id].lastWords || "R.I.P." });
            jugadores[id].clase = null; 
            jugadores[id].score = Math.floor(jugadores[id].score / 2);
            jugadores[id].x = -1000; 
            io.to(id).emit('muerte', "HAS MUERTO");
        }
    }

    io.emit('estado', { jugadores, balas, jefe, leaderboard: getTop5Leaderboard() });
}, 1000 / 20);

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0',() => {
  console.log(`Servidor accesible en: http://192.168.100.22:${PORT}`);
});
