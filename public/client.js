const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io({ transports: ['websocket'], upgrade: false });

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0){
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
});

const WORLD_SIZE = 2000;
const player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: 15, speed: 0.1 };

let gameState = { captureZones: [], attackingPlayers: [], projectiles: [], bossMarker: { active: false }, players: {} };

// Variables para la INTERPOLACIÓN (Movimiento Suave)
let renderPlayers = {};
let renderBoss = null;

socket.on('update', (state) => {
    gameState = state;

    // Preparamos a los jugadores para el movimiento suave
    for (let id in state.players) {
        if (!renderPlayers[id]) renderPlayers[id] = { ...state.players[id], x: state.players[id].x, y: state.players[id].y };
        renderPlayers[id].targetX = state.players[id].x;
        renderPlayers[id].targetY = state.players[id].y;
        renderPlayers[id].hp = state.players[id].hp;
        renderPlayers[id].maxHp = state.players[id].maxHp;
        renderPlayers[id].radius = state.players[id].radius;
        renderPlayers[id].color = state.players[id].color;
    }
    for (let id in renderPlayers) {
        if (!state.players[id]) delete renderPlayers[id];
    }

    // Preparamos al jefe para el movimiento suave
    if (state.boss && state.boss.isAlive) {
        if (!renderBoss) renderBoss = { ...state.boss, x: state.boss.x, y: state.boss.y };
        renderBoss.targetX = state.boss.x;
        renderBoss.targetY = state.boss.y;
        renderBoss.hp = state.boss.hp;
        renderBoss.maxHp = state.boss.maxHp;
        renderBoss.isShielded = state.boss.isShielded;
        renderBoss.isAlive = state.boss.isAlive;
        renderBoss.radius = state.boss.radius;
    } else {
        renderBoss = null;
    }
});

function drawGrid() {
    ctx.strokeStyle = '#1a1a24';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const offsetX = player.x % gridSize;
    const offsetY = player.y % gridSize;

    ctx.beginPath();
    for (let x = -offsetX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = -offsetY; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

function drawBar(drawX, drawY, hp, maxHp, width = 40) {
    if(hp === undefined || maxHp === undefined) return;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(drawX - width/2, drawY + 25, width, 5);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(drawX - width/2, drawY + 25, width * (Math.max(0, hp) / maxHp), 5);
}

function drawPlayer(x, y, radius, color, isMe, hp, maxHp) {
    const drawX = isMe ? canvas.width / 2 : (canvas.width / 2) + (x - player.x);
    const drawY = isMe ? canvas.height / 2 : (canvas.height / 2) + (y - player.y);

    ctx.beginPath();
    ctx.arc(drawX, drawY, radius || 15, 0, Math.PI * 2);
    ctx.fillStyle = color || '#fff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = color || '#fff';
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    if (hp !== undefined) drawBar(drawX, drawY, hp, maxHp);
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. MOVIMIENTO LOCAL FLUIDO (Velocidad Constante Real)
    const dx = mouse.x - (canvas.width / 2);
    const dy = mouse.y - (canvas.height / 2);
    const distMouse = Math.hypot(dx, dy);

    // Solo nos movemos si el mouse no está exactamente en el centro (evita tiritones)
    if (distMouse > 15) {
        const angle = Math.atan2(dy, dx);
        const MAX_SPEED = 6; // Velocidad fija y controlada (¡Ajusta este número si quieres ser más rápido o lento!)
        player.x += Math.cos(angle) * MAX_SPEED;
        player.y += Math.sin(angle) * MAX_SPEED;
    }

    player.x = Math.max(0, Math.min(WORLD_SIZE, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE, player.y));

    // Susurramos al servidor cada 50ms para no ahogarlo
    if (!player.lastEmit || Date.now() - player.lastEmit > 50) {
        socket.emit('move', { x: player.x, y: player.y });
        player.lastEmit = Date.now();
    }

    // 2. DIBUJAR FONDO
    drawGrid();

    // 3. DIBUJAR ZONAS
    if (Array.isArray(gameState.captureZones)) {
        gameState.captureZones.forEach(zone => {
            const drawX = (canvas.width / 2) + (zone.x - player.x);
            const drawY = (canvas.height / 2) + (zone.y - player.y);
            
            let occupied = false;
            for (let id in gameState.players) {
                let p = gameState.players[id];
                if (p.x > zone.x && p.x < zone.x + zone.size && p.y > zone.y && p.y < zone.y + zone.size) occupied = true;
            }

            ctx.strokeStyle = occupied ? '#00ffcc' : '#555';
            ctx.lineWidth = 3;
            ctx.shadowBlur = occupied ? 15 : 0;
            ctx.shadowColor = '#00ffcc';
            ctx.strokeRect(drawX, drawY, zone.size, zone.size);
            ctx.shadowBlur = 0;
        });
    }

    // 4. DIBUJAR JEFE (Con Interpolación Suave)
    if (renderBoss) {
        // MAGIA: Deslizar al jefe a su posición real en lugar de teletransportarlo
        renderBoss.x += (renderBoss.targetX - renderBoss.x) * 0.3;
        renderBoss.y += (renderBoss.targetY - renderBoss.y) * 0.3;

        const drawX = (canvas.width / 2) + (renderBoss.x - player.x);
        const drawY = (canvas.height / 2) + (renderBoss.y - player.y);

        if (Array.isArray(gameState.attackingPlayers)) {
            gameState.attackingPlayers.forEach(id => {
                if (renderPlayers[id]) {
                    let p = renderPlayers[id];
                    const px = id === socket.id ? canvas.width/2 : (canvas.width/2) + (p.x - player.x);
                    const py = id === socket.id ? canvas.height/2 : (canvas.height/2) + (p.y - player.y);
                    
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(drawX, drawY);
                    ctx.strokeStyle = '#ff00ff';
                    ctx.lineWidth = 3;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#ff00ff';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            });
        }

        ctx.beginPath();
        ctx.arc(drawX, drawY, renderBoss.radius || 60, 0, Math.PI * 2);
        ctx.fillStyle = renderBoss.isShielded ? '#333' : '#ff0055';
        ctx.fill();
        
        if (renderBoss.isShielded) {
            ctx.beginPath();
            ctx.arc(drawX, drawY, (renderBoss.radius || 60) + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00aaff';
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        drawBar(drawX, drawY - 40, renderBoss.hp, renderBoss.maxHp, 80);
    }

    // 5. DIBUJAR MARCADOR (HITO)
    if (gameState.bossMarker && gameState.bossMarker.active) {
        const drawX = (canvas.width / 2) + (gameState.bossMarker.x - player.x);
        const drawY = (canvas.height / 2) + (gameState.bossMarker.y - player.y);
        
        ctx.beginPath();
        ctx.arc(drawX, drawY, 40, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 30 + Math.sin(Date.now() / 100) * 20;
        ctx.shadowColor = '#ffd700';
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#ffd700';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("HITO ÉPICO", drawX, drawY - 60);
    }

    // 6. DIBUJAR PROYECTILES (Con Predicción a 60 FPS)
    if (Array.isArray(gameState.projectiles)) {
        gameState.projectiles.forEach(proj => {
            // MAGIA: Movemos la bala localmente a 60 FPS mientras el servidor respira
            proj.x += proj.vx * 0.33; 
            proj.y += proj.vy * 0.33;

            const drawX = (canvas.width / 2) + (proj.x - player.x);
            const drawY = (canvas.height / 2) + (proj.y - player.y);
            ctx.beginPath();
            ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3300';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3300';
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }

    // 7. DIBUJAR JUGADORES (Con Interpolación Suave)
    for (const id in renderPlayers) {
        const p = renderPlayers[id];

        if (id === socket.id) {
            // Chequeo de teletransporte por muerte (Rubber-banding)
            if (p.targetX !== undefined && p.targetY !== undefined) {
                const dist = Math.hypot(player.x - p.targetX, player.y - p.targetY);
                if (dist > 500) { player.x = p.targetX; player.y = p.targetY; }
            }
            drawPlayer(player.x, player.y, p.radius, p.color, true, p.hp, p.maxHp);
        } else {
            // MAGIA: Deslizamos a los enemigos suavemente a su posición
            if (p.targetX !== undefined && p.targetY !== undefined) {
                p.x += (p.targetX - p.x) * 0.3;
                p.y += (p.targetY - p.y) * 0.3;
                drawPlayer(p.x, p.y, p.radius, p.color, false, p.hp, p.maxHp);
            }
        }
    }

    // 8. INDICADOR DE VERSIÓN
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText("Versión: 1.5 - Motor Suave (Interpolación)", canvas.width - 20, canvas.height - 20);

    requestAnimationFrame(loop);
}

loop();