const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ['websocket'] });

app.use(express.static('public'));

const WORLD_SIZE = 2000;
const players = {};
let projectiles = [];

let boss = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, hp: 10000, maxHp: 10000, radius: 60, isAlive: true };
let bossMarker = { active: false, x: 0, y: 0, timer: 0 };
let tickCounter = 0;

io.on('connection', (socket) => {
    socket.on('join', (playerName) => {
        const randomColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        players[socket.id] = {
            name: playerName.trim().substring(0, 12) || "Anónimo",
            x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE,
            radius: 15, color: randomColor, hp: 100, maxHp: 100, score: 0,
            isParrying: false // NUEVO: Estado de bloqueo
        };
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            if (players[socket.id].ignoreMovesUntil && Date.now() < players[socket.id].ignoreMovesUntil) return;
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
        }
    });

    // NUEVO: Escuchar cuando el jugador activa el Parry
    socket.on('parry', (isParrying) => {
        if (players[socket.id]) players[socket.id].isParrying = isParrying;
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    tickCounter++;

    if (boss.isAlive) {
        // El Jefe dispara proyectiles (ahora un poco más rápido para probar el Parry)
        if (tickCounter % 12 === 0) {
            for (let i = 0; i < 8; i++) {
                let angle = (i * Math.PI / 4) + (tickCounter * 0.1); 
                projectiles.push({ 
                    x: boss.x, y: boss.y, 
                    vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, 
                    life: 150, reflectedBy: null // Saber si la bala fue devuelta
                });
            }
        }
    } else {
        if (bossMarker.active) {
            bossMarker.timer--;
            if (bossMarker.timer <= 0) { bossMarker.active = false; boss.isAlive = true; boss.hp = boss.maxHp; }
        }
    }

    // FÍSICA Y COLISIONES DE PROYECTILES
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let proj = projectiles[i];
        proj.x += proj.vx; proj.y += proj.vy; proj.life--;

        if (proj.life <= 0) { projectiles.splice(i, 1); continue; }

        // 1. ¿La bala rebotada golpeó al Jefe?
        if (proj.reflectedBy && boss.isAlive) {
            let distToBoss = Math.hypot(boss.x - proj.x, boss.y - proj.y);
            if (distToBoss < boss.radius + 5) {
                boss.hp -= 150; // Daño MASIVO por hacer buen parry
                if (players[proj.reflectedBy]) players[proj.reflectedBy].score += 50;
                projectiles.splice(i, 1);
                if (boss.hp <= 0) {
                    boss.isAlive = false;
                    bossMarker = { active: true, x: boss.x, y: boss.y, timer: 450 }; 
                }
                continue;
            }
        }

        // 2. ¿La bala golpeó a un Jugador?
        let hitPlayer = false;
        for (let id in players) {
            let p = players[id];
            let dist = Math.hypot(p.x - proj.x, p.y - proj.y);
            
            if (dist < p.radius + 5) {
                if (p.isParrying && proj.reflectedBy !== id) {
                    // ¡PARRY EXITOSO! Rebotamos la bala hacia atrás más rápido
                    proj.vx *= -1.5; 
                    proj.vy *= -1.5;
                    proj.reflectedBy = id; // La bala ahora es tuya
                    proj.life = 100; // Renovar vida de la bala
                } else if (!proj.reflectedBy || proj.reflectedBy !== id) {
                    // Si no estás haciendo parry y la bala no es tuya, te hace daño
                    p.hp -= 20; 
                    hitPlayer = true;
                    if (p.hp <= 0) {
                        p.x = Math.random() * WORLD_SIZE; p.y = Math.random() * WORLD_SIZE; p.hp = p.maxHp;
                        p.ignoreMovesUntil = Date.now() + 500; 
                    }
                }
                break;
            }
        }
        if (hitPlayer) { projectiles.splice(i, 1); continue; }
    }

    // Regeneración pasiva
    if (tickCounter % 20 === 0) {
        for (let id in players) {
            let p = players[id];
            if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 5);
        }
    }

    io.emit('update', { players, boss, projectiles, bossMarker });
}, 1000 / 20);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🚀 Servidor Prototipo Parry en http://localhost:${PORT}`); });