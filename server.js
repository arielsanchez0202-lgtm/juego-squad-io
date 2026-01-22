const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const MAPA_W = 1200;
const MAPA_H = 800;

// --- CONFIGURACIÓN DE CLASES ---
const CLASES = {
    'tanque': { hp: 300, velocidad: 3,  dano: 8,  radio: 30, color: '#3498db', reload: 15 }, // Lento y duro
    'sniper': { hp: 80,  velocidad: 6,  dano: 40, radio: 15, color: '#f1c40f', reload: 40 }, // Rápido y letal
    'medico': { hp: 120, velocidad: 5,  dano: 10, radio: 20, color: '#2ecc71', reload: 10 }  // Cura rápido
};

const TIENDA = {
    'dano':   { costo: 150, nombre: "Daño (+10%)" },
    'speed':  { costo: 100, nombre: "Motor (+1)" }
};

// --- ENTIDADES ---
class Entidad {
    constructor(x, y, radio, color) {
        this.x = x; this.y = y; this.radio = radio; this.color = color;
        this.borrar = false;
    }
}

class Jugador extends Entidad {
    constructor(id) {
        super(Math.random() * 200, Math.random() * 200, 20, 'white');
        this.id = id;
        this.clase = null; // Aún no elige
        this.score = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.velocidad = 0; // No se mueve hasta elegir
        this.dano = 0;
        this.cooldown = 0; // Tiempo entre disparos
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
        this.vx = Math.cos(angulo) * 12;
        this.vy = Math.sin(angulo) * 12;
        this.idDueno = idDueno;
        this.dano = dano;
        this.esSanadora = esSanadora; // ¿Cura?
        this.distancia = 0;
    }

    mover() {
        this.x += this.vx; this.y += this.vy;
        this.distancia += 12;
        if (this.distancia > 1200) this.borrar = true;
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
        // Buscar objetivo más cercano que ya haya elegido clase
        let target = null;
        let minD = 9999;
        
        for(let id in jugadores){
            let j = jugadores[id];
            if(!j.clase) continue; // Ignorar fantasmas
            let d = Math.sqrt((j.x-this.x)**2 + (j.y-this.y)**2);
            if(d < minD){ minD = d; target = j; }
        }

        if(target){
            let ang = Math.atan2(target.y - this.y, target.x - this.x);
            this.x += Math.cos(ang) * this.velocidad;
            this.y += Math.sin(ang) * this.velocidad;
        }

        // Ataques
        this.tiempo++;
        // Espiral infernal
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

io.on('connection', (socket) => {
    jugadores[socket.id] = new Jugador(socket.id);

    // ELEGIR CLASE
    socket.on('elegirClase', (tipo) => {
        if(jugadores[socket.id]) jugadores[socket.id].asignarClase(tipo);
    });

    socket.on('comprar', (item) => {
        let j = jugadores[socket.id];
        if(j && j.clase && TIENDA[item] && j.score >= TIENDA[item].costo) {
            j.score -= TIENDA[item].costo;
            if(item === 'dano') j.dano *= 1.1; 
            if(item === 'speed') j.velocidad += 1;
        }
    });

    socket.on('movimiento', (d) => {
        let j = jugadores[socket.id];
        if(j && j.clase) { j.x = d.x; j.y = d.y; }
    });

    socket.on('disparar', (angulo) => {
        let j = jugadores[socket.id];
        if (j && j.clase && j.cooldown <= 0) {
            let esSanadora = (j.clase === 'medico');
            let colorBala = esSanadora ? '#2ecc71' : 'yellow';
            
            balas.push(new Bala(j.x, j.y, angulo, socket.id, colorBala, j.dano, esSanadora));
            j.cooldown = j.maxCooldown; // Reiniciar recarga
        }
    });

    socket.on('disconnect', () => { delete jugadores[socket.id]; });
});

setInterval(() => {
    // Cooldowns de disparo
    for(let id in jugadores) {
        if(jugadores[id].cooldown > 0) jugadores[id].cooldown--;
    }

    if(jefe.hp > 0) jefe.pensar(jugadores);
    else {
        // JEFE MUERTO
        io.emit('mensajeGlobal', "¡VICTORIA! RONDA COMPLETADA");
        for(let id in jugadores) jugadores[id].score += 500;
        jefe.maxHp *= 1.2; jefe.hp = jefe.maxHp; jefe.velocidad += 0.2;
        jefe.x = MAPA_W/2; jefe.y = MAPA_H/2;
        balas = [];
    }

    // Físicas
    for (let i = balas.length - 1; i >= 0; i--) {
        let b = balas[i];
        b.mover();

        // BALAS JEFE
        if(b.idDueno === 'BOSS'){
            for(let id in jugadores){
                let j = jugadores[id];
                if(!j.clase) continue;
                if(Math.sqrt((b.x-j.x)**2 + (b.y-j.y)**2) < j.radio + 5){
                    j.hp -= b.dano;
                    b.borrar = true;
                }
            }
        } 
        // BALAS JUGADOR
        else {
            // Impacto contra Jefe
            if(Math.sqrt((b.x-jefe.x)**2 + (b.y-jefe.y)**2) < jefe.radio + 10){
                jefe.hp -= b.dano;
                b.borrar = true;
                if(jugadores[b.idDueno]) jugadores[b.idDueno].score += 5;
            }
            
            // Impacto Bala Sanadora -> Aliado
            if(b.esSanadora) {
                for(let id in jugadores){
                    let j = jugadores[id];
                    // Si choca con un aliado (que no sea yo mismo)
                    if(id !== b.idDueno && Math.sqrt((b.x-j.x)**2 + (b.y-j.y)**2) < j.radio + 10){
                        j.hp = Math.min(j.hp + b.dano, j.maxHp); // Curar
                        b.borrar = true;
                        // Ganar puntos por curar (¡Incentivo!)
                        if(jugadores[b.idDueno]) jugadores[b.idDueno].score += 10;
                    }
                }
            }
        }
        if(b.borrar) balas.splice(i, 1);
    }

    // Respawn
    for(let id in jugadores){
        if(jugadores[id].clase && jugadores[id].hp <= 0){
            jugadores[id].clase = null; // Volver a elegir clase
            jugadores[id].score = Math.floor(jugadores[id].score / 2);
            jugadores[id].x = -1000; // Esconder
            io.to(id).emit('muerte', "HAS MUERTO");
        }
    }

    io.emit('estado', { jugadores, balas, jefe });
}, 1000/60);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});