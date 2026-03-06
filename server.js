const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const WORLD_SIZE = 2000;
const players = {};
let projectiles = [];

let boss = {
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    hp: 10000,
    maxHp: 10000,
    radius: 60,
    isShielded: true,
    isAlive: true
};

let bossMarker = { active: false, x: 0, y: 0, timer: 0 };

const captureZones = [
    { x: boss.x - 50, y: boss.y - 250, size: 100 },
    { x: boss.x - 250, y: boss.y + 150, size: 100 },
    { x: boss.x + 150, y: boss.y + 150, size: 100 }
];

let tickCounter = 0;

io.on('connection', (socket) => {
    console.log(`🟢 Jugador conectado: ${socket.id}`);
    const randomColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
    
    players[socket.id] = {
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        radius: 15,
        color: randomColor,
        hp: 100,
        maxHp: 100
    };

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Jugador desconectado: ${socket.id}`);
        delete players[socket.id];
    });
});

setInterval(() => {
    tickCounter++;
    let attackingPlayers = [];

    if (boss.isAlive) {
        // Verificar zonas de captura
        let zonesOccupied = 0;
        captureZones.forEach(zone => {
            let occupied = false;
            for (let id in players) {
                let p = players[id];
                if (p.x > zone.x && p.x < zone.x + zone.size &&
                    p.y > zone.y && p.y < zone.y + zone.size) {
                    occupied = true;
                    break;
                }
            }
            if (occupied) zonesOccupied++;
        });

        boss.isShielded = (zonesOccupied < 3);

        // Auto-ataque y daño al jefe
        if (!boss.isShielded) {
            for (let id in players) {
                let p = players[id];
                let dist = Math.hypot(p.x - boss.x, p.y - boss.y);
                if (dist < 300) {
                    attackingPlayers.push(id);
                    boss.hp -= 5;
                }
            }
        }

        // Muerte del jefe
        if (boss.hp <= 0) {
            boss.isAlive = false;
            bossMarker = { active: true, x: boss.x, y: boss.y, timer: 450 }; // 15 segundos muerto
        }

        // Ataque del jefe (Proyectiles Bullet Hell)
        if (tickCounter % 15 === 0) {
            for (let i = 0; i < 8; i++) {
                let angle = (i * Math.PI / 4) + (tickCounter * 0.1); // Efecto espiral
                projectiles.push({
                    x: boss.x,
                    y: boss.y,
                    vx: Math.cos(angle) * 8,
                    vy: Math.sin(angle) * 8,
                    life: 100
                });
            }
        }
    } else {
        // Temporizador para revivir al jefe
        if (bossMarker.active) {
            bossMarker.timer--;
            if (bossMarker.timer <= 0) {
                bossMarker.active = false;
                boss.isAlive = true;
                boss.hp = boss.maxHp;
            }
        }
    }

    // Mover proyectiles y procesar colisiones
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let proj = projectiles[i];
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.life--;

        if (proj.life <= 0) {
            projectiles.splice(i, 1);
            continue;
        }

        // Colisión con jugadores
        for (let id in players) {
            let p = players[id];
            let dist = Math.hypot(p.x - proj.x, p.y - proj.y);
            if (dist < p.radius + 5) {
                p.hp -= 20; // Daño al jugador
                projectiles.splice(i, 1); // Destruir bala
                
                // Muerte del jugador (Respawn)
                if (p.hp <= 0) {
                    p.x = Math.random() * WORLD_SIZE;
                    p.y = Math.random() * WORLD_SIZE;
                    p.hp = p.maxHp;
                }
                break;
            }
        }
    }

    io.emit('update', {
        players,
        boss,
        captureZones,
        attackingPlayers,
        projectiles,
        bossMarker
    });
}, 1000 / 20);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo con Combate en http://localhost:${PORT}`);
});