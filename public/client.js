const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// FORZAMOS WEBSOCKETS PUROS: Eliminamos el "HTTP Polling" que causa lag en Render
const socket = io({
    transports: ['websocket'],
    upgrade: false
});

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
// Tu cámara local (Tú mandas, no el servidor)
const player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: 15, speed: 0.1 };

let gameState = {
    players: {},
    boss: null,
    captureZones: [],
    attackingPlayers: [],
    projectiles: [],
    bossMarker: { active: false }
};

socket.on('update', (state) => {
    gameState = state;
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

    // 1. MOVIMIENTO LOCAL FLUIDO (Client-Side Prediction)
    player.x += (mouse.x - (canvas.width / 2)) * player.speed;
    player.y += (mouse.y - (canvas.height / 2)) * player.speed;
    player.x = Math.max(0, Math.min(WORLD_SIZE, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE, player.y));

    // Avisamos al servidor dónde estamos
    socket.emit('move', { x: player.x, y: player.y });

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
                if (p.x > zone.x && p.x < zone.x + zone.size && p.y > zone.y && p.y < zone.y + zone.size) {
                    occupied = true;
                }
            }

            ctx.strokeStyle = occupied ? '#00ffcc' : '#555';
            ctx.lineWidth = 3;
            ctx.shadowBlur = occupied ? 15 : 0;
            ctx.shadowColor = '#00ffcc';
            ctx.strokeRect(drawX, drawY, zone.size, zone.size);
            ctx.shadowBlur = 0;
        });
    }

    // 4. DIBUJAR JEFE
    if (gameState.boss && gameState.boss.isAlive) {
        const drawX = (canvas.width / 2) + (gameState.boss.x - player.x);
        const drawY = (canvas.height / 2) + (gameState.boss.y - player.y);

        // Láseres
        if (Array.isArray(gameState.attackingPlayers)) {
            gameState.attackingPlayers.forEach(id => {
                if (gameState.players[id]) {
                    let p = gameState.players[id];
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

        // Cuerpo del Jefe
        ctx.beginPath();
        ctx.arc(drawX, drawY, gameState.boss.radius || 60, 0, Math.PI * 2);
        ctx.fillStyle = gameState.boss.isShielded ? '#333' : '#ff0055';
        ctx.fill();
        
        // Escudo
        if (gameState.boss.isShielded) {
            ctx.beginPath();
            ctx.arc(drawX, drawY, (gameState.boss.radius || 60) + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00aaff';
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        drawBar(drawX, drawY - 40, gameState.boss.hp, gameState.boss.maxHp, 80);
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

    // 6. DIBUJAR PROYECTILES
    if (Array.isArray(gameState.projectiles)) {
        gameState.projectiles.forEach(proj => {
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

    // 7. DIBUJAR JUGADORES (Con corrección de Respawn real)
    if (gameState.players) {
        for (const id in gameState.players) {
            const p = gameState.players[id];
            if (!p) continue; // Protección real contra vacíos

            if (id === socket.id) {
                // Si el servidor dice que estoy MUY lejos (Morí y reaparecí), le hago caso.
                if (p.x !== undefined && p.y !== undefined) {
                    const dist = Math.hypot(player.x - p.x, player.y - p.y);
                    if (dist > 500) { 
                        player.x = p.x; 
                        player.y = p.y;
                    }
                }
                // Me dibujo en el centro de MI pantalla
                drawPlayer(player.x, player.y, p.radius, p.color, true, p.hp, p.maxHp);
            } else {
                // Dibujo a los demás relativos a mí
                if (p.x !== undefined && p.y !== undefined) {
                    drawPlayer(p.x, p.y, p.radius, p.color, false, p.hp, p.maxHp);
                }
            }
        }
    }

    // --- PEGAR ESTO JUSTO ANTES DEL FINAL DEL LOOP ---
    // 8. INDICADOR DE VERSIÓN (Para confirmar despliegues en Render)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Blanco semitransparente
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText("Versión: 1.2 - Motor Predictivo", canvas.width - 20, canvas.height - 20);
    // ------------------------------------------------

    requestAnimationFrame(loop);
}

loop();