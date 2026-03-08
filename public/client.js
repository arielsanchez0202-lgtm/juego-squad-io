const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io({ transports: ['websocket'], upgrade: false });

let isPlaying = false;
const startMenu = document.getElementById('startMenu');
const playerNameInput = document.getElementById('playerNameInput');
const playButton = document.getElementById('playButton');

playButton.addEventListener('click', () => {
    socket.emit('join', playerNameInput.value); 
    startMenu.style.display = 'none'; 
    isPlaying = true; 
});
playerNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') playButton.click(); });

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

// NUEVO: Lógica del Parry (Escudo)
let isParrying = false;
let parryCooldown = 0;

window.addEventListener('keydown', (e) => {
    if (isPlaying && e.code === 'Space') {
        if (Date.now() > parryCooldown) {
            isParrying = true;
            socket.emit('parry', true);
            
            // El parry dura 400 milisegundos
            setTimeout(() => {
                isParrying = false;
                socket.emit('parry', false);
            }, 400);

            // Tienes que esperar 1.5 segundos para volver a usarlo
            parryCooldown = Date.now() + 1500;
        }
    }
});

const WORLD_SIZE = 2000;
const player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, radius: 15, speed: 0.1 };

let gameState = { projectiles: [], bossMarker: { active: false }, players: {} };
let renderPlayers = {};
let renderBoss = null;

socket.on('update', (state) => {
    gameState = state;
    for (let id in state.players) {
        if (!renderPlayers[id]) renderPlayers[id] = { ...state.players[id], x: state.players[id].x, y: state.players[id].y };
        renderPlayers[id].targetX = state.players[id].x; renderPlayers[id].targetY = state.players[id].y;
        renderPlayers[id].hp = state.players[id].hp; renderPlayers[id].maxHp = state.players[id].maxHp;
        renderPlayers[id].radius = state.players[id].radius; renderPlayers[id].color = state.players[id].color;
        renderPlayers[id].name = state.players[id].name; renderPlayers[id].score = state.players[id].score;
        renderPlayers[id].isParrying = state.players[id].isParrying;
    }
    for (let id in renderPlayers) { if (!state.players[id]) delete renderPlayers[id]; }

    if (state.boss && state.boss.isAlive) {
        if (!renderBoss) renderBoss = { ...state.boss, x: state.boss.x, y: state.boss.y };
        renderBoss.targetX = state.boss.x; renderBoss.targetY = state.boss.y;
        renderBoss.hp = state.boss.hp; renderBoss.maxHp = state.boss.maxHp;
        renderBoss.radius = state.boss.radius; renderBoss.isAlive = state.boss.isAlive;
    } else { renderBoss = null; }
});

function drawGrid() {
    ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = 1; const gridSize = 50;
    const offsetX = player.x % gridSize; const offsetY = player.y % gridSize;
    ctx.beginPath();
    for (let x = -offsetX; x < canvas.width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = -offsetY; y < canvas.height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();
}

function drawBar(drawX, drawY, hp, maxHp, width = 40) {
    if(hp === undefined || maxHp === undefined) return;
    ctx.fillStyle = '#ff0000'; ctx.fillRect(drawX - width/2, drawY + 25, width, 5);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(drawX - width/2, drawY + 25, width * (Math.max(0, hp) / maxHp), 5);
}

function drawPlayer(x, y, radius, color, isMe, hp, maxHp, name, parrying) {
    const drawX = isMe ? canvas.width / 2 : (canvas.width / 2) + (x - player.x);
    const drawY = isMe ? canvas.height / 2 : (canvas.height / 2) + (y - player.y);

    if (name) {
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
        ctx.shadowBlur = 4; ctx.shadowColor = '#000000'; ctx.fillText(name, drawX, drawY - 25); ctx.shadowBlur = 0;
    }

    // Dibujar el escudo de Parry si está activo
    if (parrying) {
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.beginPath(); ctx.arc(drawX, drawY, radius || 15, 0, Math.PI * 2);
    ctx.fillStyle = color || '#fff'; ctx.shadowBlur = 20; ctx.shadowColor = color || '#fff';
    ctx.fill(); ctx.closePath(); ctx.shadowBlur = 0;

    if (hp !== undefined) drawBar(drawX, drawY, hp, maxHp);
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isPlaying) {
        const dx = mouse.x - (canvas.width / 2); const dy = mouse.y - (canvas.height / 2);
        const distMouse = Math.hypot(dx, dy);
        if (distMouse > 15) {
            const angle = Math.atan2(dy, dx); const MAX_SPEED = 6;
            player.x += Math.cos(angle) * MAX_SPEED; player.y += Math.sin(angle) * MAX_SPEED;
        }
        player.x = Math.max(0, Math.min(WORLD_SIZE, player.x)); player.y = Math.max(0, Math.min(WORLD_SIZE, player.y));
        if (!player.lastEmit || Date.now() - player.lastEmit > 50) {
            socket.emit('move', { x: player.x, y: player.y }); player.lastEmit = Date.now();
        }
    }

    drawGrid();

    if (renderBoss) {
        renderBoss.x += (renderBoss.targetX - renderBoss.x) * 0.3; renderBoss.y += (renderBoss.targetY - renderBoss.y) * 0.3;
        const drawX = (canvas.width / 2) + (renderBoss.x - player.x); const drawY = (canvas.height / 2) + (renderBoss.y - player.y);
        
        ctx.beginPath(); ctx.arc(drawX, drawY, renderBoss.radius || 60, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0055'; ctx.shadowBlur = 30; ctx.shadowColor = '#ff0055'; 
        ctx.fill(); ctx.shadowBlur = 0;
        
        drawBar(drawX, drawY - 40, renderBoss.hp, renderBoss.maxHp, 80);
    }

    if (Array.isArray(gameState.projectiles)) {
        gameState.projectiles.forEach(proj => {
            proj.x += proj.vx * 0.33; proj.y += proj.vy * 0.33;
            const drawX = (canvas.width / 2) + (proj.x - player.x); const drawY = (canvas.height / 2) + (proj.y - player.y);
            
            ctx.beginPath(); ctx.arc(drawX, drawY, 5, 0, Math.PI * 2);
            // Si la bala fue rebotada, se vuelve Verde/Cyan
            ctx.fillStyle = proj.reflectedBy ? '#00ffcc' : '#ff3300'; 
            ctx.shadowBlur = 10; ctx.shadowColor = proj.reflectedBy ? '#00ffcc' : '#ff3300';
            ctx.fill(); ctx.shadowBlur = 0;
        });
    }

    if (isPlaying) {
        for (const id in renderPlayers) {
            const p = renderPlayers[id];
            if (id === socket.id) {
                if (p.targetX !== undefined && p.targetY !== undefined) {
                    const dist = Math.hypot(player.x - p.targetX, player.y - p.targetY);
                    if (dist > 500) { player.x = p.targetX; player.y = p.targetY; }
                }
                drawPlayer(player.x, player.y, p.radius, p.color, true, p.hp, p.maxHp, p.name, isParrying);
            } else {
                if (p.targetX !== undefined && p.targetY !== undefined) {
                    p.x += (p.targetX - p.x) * 0.3; p.y += (p.targetY - p.y) * 0.3;
                    drawPlayer(p.x, p.y, p.radius, p.color, false, p.hp, p.maxHp, p.name, p.isParrying);
                }
            }
        }
        
        const myPlayer = renderPlayers[socket.id];
        if (myPlayer) {
            ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left';
            ctx.shadowBlur = 5; ctx.shadowColor = '#000';
            ctx.fillText(`Puntos: ${myPlayer.score}`, 20, 40);
            
            // UI del Cooldown del Parry
            const timeToParry = Math.max(0, parryCooldown - Date.now());
            ctx.font = '16px Arial';
            ctx.fillStyle = timeToParry === 0 ? '#00ffcc' : '#ff3300';
            ctx.fillText(timeToParry === 0 ? `[ESPACIO] Parry Listo` : `Recargando Parry...`, 20, 70);
            ctx.shadowBlur = 0;
        }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.font = '16px Arial'; ctx.textAlign = 'right';
    ctx.fillText("Versión: Prototipo Parry", canvas.width - 20, canvas.height - 20);

    requestAnimationFrame(loop);
}

loop();