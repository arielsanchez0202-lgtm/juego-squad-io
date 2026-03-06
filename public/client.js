const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

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
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
});

const WORLD_SIZE = 2000;
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

function drawBar(x, y, hp, maxHp, width = 40) {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x - width/2, y + 25, width, 5);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(x - width/2, y + 25, width * (hp / maxHp), 5);
}

function drawPlayer(x, y, radius, color, isMe, hp, maxHp) {
    const drawX = isMe ? canvas.width / 2 : (canvas.width / 2) + (x - player.x);
    const drawY = isMe ? canvas.height / 2 : (canvas.height / 2) + (y - player.y);

    ctx.beginPath();
    ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    if (hp !== undefined) drawBar(drawX, drawY, hp, maxHp);
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.x += (mouse.x - (canvas.width / 2)) * player.speed;
    player.y += (mouse.y - (canvas.height / 2)) * player.speed;
    
    player.x = Math.max(0, Math.min(WORLD_SIZE, player.x));
    player.y = Math.max(0, Math.min(WORLD_SIZE, player.y));

    socket.emit('move', { x: player.x, y: player.y });

    drawGrid();

    // Dibujar Zonas
    gameState.captureZones.forEach(zone => {
        const drawX = (canvas.width / 2) + (zone.x - player.x);
        const drawY = (canvas.height / 2) + (zone.y - player.y);
        
        let occupied = false;
        for (let id in gameState.players) {
            let p = gameState.players[id];
            if (p.x > zone.x && p.x < zone.x + zone.size &&
                p.y > zone.y && p.y < zone.y + zone.size) {
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

    // Dibujar Jefe
    if (gameState.boss && gameState.boss.isAlive) {
        const drawX = (canvas.width / 2) + (gameState.boss.x - player.x);
        const drawY = (canvas.height / 2) + (gameState.boss.y - player.y);

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

        ctx.beginPath();
        ctx.arc(drawX, drawY, gameState.boss.radius, 0, Math.PI * 2);
        ctx.fillStyle = gameState.boss.isShielded ? '#333' : '#ff0055';
        ctx.fill();
        
        if (gameState.boss.isShielded) {
            ctx.beginPath();
            ctx.arc(drawX, drawY, gameState.boss.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00aaff';
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        drawBar(drawX, drawY - 40, gameState.boss.hp, gameState.boss.maxHp, 80);
    }

    // Dibujar Marcador del Jefe Muerto (El Hito)
    if (gameState.bossMarker && gameState.bossMarker.active) {
        const drawX = (canvas.width / 2) + (gameState.bossMarker.x - player.x);
        const drawY = (canvas.height / 2) + (gameState.bossMarker.y - player.y);
        
        ctx.beginPath();
        ctx.arc(drawX, drawY, 40, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd700'; // Dorado
        ctx.lineWidth = 5;
        ctx.shadowBlur = 30 + Math.sin(Date.now() / 100) * 20; // Efecto de pulso
        ctx.shadowColor = '#ffd700';
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#ffd700';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("HITO ÉPICO", drawX, drawY - 60);
    }

    // Dibujar Proyectiles
    if (gameState.projectiles) {
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

    // Dibujar Jugadores
    for (const id in gameState.players) {
        const p = gameState.players[id];
        
        if (id === socket.id && p.hp !== undefined) {
            // SOLUCIÓN AL RUBBER-BANDING:
            // Solo sincronizamos la posición local con la del servidor si la distancia 
            // es mayor a 150px (es decir, si el servidor nos mató y nos teletransportó).
            // Para el movimiento normal, el cliente manda de forma fluida.
            const dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist > 150) {
                player.x = p.x; 
                player.y = p.y;
            }
        }
        
        drawPlayer(p.x, p.y, p.radius, p.color, id === socket.id, p.hp, p.maxHp);
    }

    requestAnimationFrame(loop);
}

loop();