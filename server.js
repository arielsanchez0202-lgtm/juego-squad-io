const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const MAPA_W = 3000;
const MAPA_H = 3000;

// --- CONFIGURACIÓN DE CLASES ---
const CLASES = {
    'tanque': { hp: 300, velocidad: 3,  dano: 8,  radio: 30, color: '#3498db', reload: 15 },
    'sniper': { hp: 80,  velocidad: 6,  dano: 40, radio: 15, color: '#f1c40f', reload: 40 },
    'medico': { hp: 120, velocidad: 5,  dano: 10, radio: 20, color: '#2ecc71', reload: 10 } 
};

// --- MUROS DEL ENTORNO ---
const walls = [
    {x: 800, y: 800, w: 300, h: 300},
    {x: 1900, y: 800, w: 300, h: 300},
    {x: 800, y: 1900, w: 300, h: 300},
    {x: 1900, y: 1900, w: 300, h: 300}
];

// --- FUNCIÓN DE COLISIÓN AABB ---
function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
}

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
        super(1500, 1500, 20, 'white'); // Spawn central seguro
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
        this.angle = 0; // ¡CRÍTICO: Añadir ángulo del jugador!
        
        // Sistema de mejoras
        this.skillPoints = 0;
        this.upgrades = {
            dano: { nivel: 0, max: 5 },
            salud: { nivel: 0, max: 5 },
            velocidad: { nivel: 0, max: 5 },
            recarga: { nivel: 0, max: 5 }
        };
        this.lastSkillPointScore = 0;
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
        // ¡CRÍTICO: Inicializar reloadTime!
        this.reloadTime = c.reload;
        this.lastSkillPointScore = 0;
    }
    
    // Sistema de mejoras
    ganarSkillPoints() {
        // Calcular niveles totales ya comprados
        const nivelesComprados = Object.values(this.upgrades).reduce((total, upgrade) => total + upgrade.nivel, 0);
        const maxNivelesTotales = 20; // 4 estadísticas x 5 niveles = 20 niveles máximos
        const maxSkillPoints = maxNivelesTotales - nivelesComprados; // Puntos disponibles restantes
        
        const puntosGanar = Math.floor(this.score / 100) - Math.floor(this.lastSkillPointScore / 100);
        if(puntosGanar > 0 && this.skillPoints < maxSkillPoints && nivelesComprados < maxNivelesTotales) {
            const puntosAAgregar = Math.min(puntosGanar, maxSkillPoints - this.skillPoints);
            this.skillPoints += puntosAAgregar;
            this.lastSkillPointScore = Math.floor(this.score / 100) * 100;
        }
    }
    
    aplicarMejora(tipo) {
        if(this.skillPoints <= 0 || this.upgrades[tipo].nivel >= this.upgrades[tipo].max) {
            return false;
        }
        
        this.skillPoints--;
        this.upgrades[tipo].nivel++;
        
        switch(tipo) {
            case 'dano':
                this.dano *= 1.25; // +25% por nivel (más agresivo)
                break;
            case 'salud':
                this.maxHp *= 1.3; // +30% por nivel (más significativo)
                this.hp = Math.min(this.hp + 30, this.maxHp); // Curar más
                break;
            case 'velocidad':
                this.velocidad *= 1.2; // +20% por nivel (más notorio)
                break;
            case 'recarga':
                this.maxCooldown *= 0.75; // -25% por nivel (más drástico)
                this.reloadTime = this.maxCooldown; // ¡CRÍTICO: Sincronizar reloadTime!
                break;
        }
        return true;
    }
}

class Bala extends Entidad {
    constructor(x, y, angulo, idDueno, color, dano, esSanadora) {
        super(x, y, 8, color);
        this.id = Math.random();
        this.angulo = angulo; // ¡CRÍTICO: Guardar el ángulo!
        this.vx = Math.cos(angulo) * 36;
        this.vy = Math.sin(angulo) * 36;
        this.idDueno = idDueno;
        this.dano = dano;
        this.esSanadora = esSanadora;
        this.distancia = 0;
        this.hitTimer = 0;
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
        super(1500, 1500, 90, '#e74c3c'); // Spawn seguro y central
        this.hp = 3000;
        this.maxHp = 3000;
        this.velocidad = 12.0;
        this.tiempo = 0;
        
        // Sistema de Modo Frenesí
        this.isFrenzy = false;
        this.frenzyTimer = 0;
        this.normalSpeed = 24.0; // Velocidad base aumentada
        this.frenzySpeed = 32.0; // Velocidad frenesí más rápida
        this.frenzyDuration = 80; // 4 segundos a 20 FPS
        this.frenzyCooldown = 300; // 15 segundos a 20 FPS
        this.lastFrenzyTime = 0;
        this.patrolAngle = Math.random() * Math.PI * 2; // Ángulo de patrullaje
        
        // IA 2.0 - Depredador Inteligente
        this.lastPosition = {x: 1500, y: 1500};
        this.stuckTimer = 0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDirection = 0;
    }

    // IA 2.0 - Targeting Inteligente
    evaluarPresa(jugador) {
        let score = 0;
        
        // 1. Distancia (cercanos son preferibles)
        const dist = Math.hypot(jugador.x - this.x, jugador.y - this.y);
        score += Math.max(0, 1000 - dist); // Más puntos si está cerca
        
        // 2. Salud (jugadores con menos HP son más atractivos)
        const hpRatio = jugador.hp / jugador.maxHp;
        score += (1 - hpRatio) * 500; // Más puntos si tiene poca vida
        
        // 3. Velocidad (jugadores más lentos son presas fáciles)
        const velocidadPenalty = jugador.velocidad * 50;
        score -= velocidadPenalty; // Resta puntos si es rápido
        
        // 4. Clase específica (Tanques son objetivos fáciles)
        if(jugador.clase === 'tanque') score += 200;
        if(jugador.clase === 'sniper') score -= 100; // Snipers son difíciles
        
        return score;
    }
    
    // IA 2.0 - Anti-Atasco (Wall Evasion)
    checkStuck() {
        const distMoved = Math.hypot(this.x - this.lastPosition.x, this.y - this.lastPosition.y);
        this.lastPosition = {x: this.x, y: this.y};
        
        if(distMoved < 2) { // Si apenas se movió
            this.stuckTimer++;
            if(this.stuckTimer > 20) { // 1 segundo atascado (20 ticks)
                // Iniciar Dash perpendicular
                this.isDashing = true;
                this.dashTimer = 20; // 1 segundo de dash
                this.dashDirection = Math.random() * Math.PI * 2;
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }
    }
    
    // IA 2.0 - Vampirismo
    curarsePorMuerte() {
        this.hp = Math.min(this.hp + 200, this.maxHp); // Cura 200 HP por muerte
    }
    pensar(jugadores) {
        // IA 2.0 - Targeting Inteligente
        let target = null;
        let maxScore = -Infinity;
        
        for(let id in jugadores){
            let j = jugadores[id];
            if(!j.clase) continue;
            
            const score = this.evaluarPresa(j);
            if(score > maxScore) {
                maxScore = score;
                target = j;
            }
        }

        // Máquina de estados del Modo Frenesí
        this.frenzyTimer++;
        
        if(!this.isFrenzy && this.frenzyTimer - this.lastFrenzyTime >= this.frenzyCooldown) {
            // Activar modo frenesí
            this.isFrenzy = true;
            this.lastFrenzyTime = this.frenzyTimer;
        } else if(this.isFrenzy && this.frenzyTimer - this.lastFrenzyTime >= this.frenzyDuration) {
            // Desactivar modo frenesí
            this.isFrenzy = false;
        }
        
        // IA 2.0 - Anti-Atasco
        this.checkStuck();
        
        let currentSpeed = this.isFrenzy ? this.frenzySpeed : this.normalSpeed;
        
        if(this.isDashing) {
            // Dash ultra rápido para desatascarse
            currentSpeed = 8.0;
            this.dashTimer--;
            if(this.dashTimer <= 0) {
                this.isDashing = false;
            }
        }
        
        let nextX, nextY;
        
        if(target){
            // Perseguir al jugador con mayor puntaje de presa
            let ang = Math.atan2(target.y - this.y, target.x - this.x);
            
            if(this.isDashing) {
                // Dash en dirección perpendicular o aleatoria
                ang = this.dashDirection;
            }
            
            const moveX = Math.cos(ang) * currentSpeed;
            const moveY = Math.sin(ang) * currentSpeed;
            
            // Wall Sliding: Intentar moverse en X e Y por separado
            let finalX = this.x;
            let finalY = this.y;
            
            // Intentar movimiento en X
            let canMoveX = true;
            const testX = this.x + moveX;
            for(let wall of walls) {
                if(checkCollision(testX - this.radio, this.y - this.radio, this.radio*2, this.radio*2, wall.x, wall.y, wall.w, wall.h)) {
                    canMoveX = false;
                    break;
                }
            }
            if(canMoveX) finalX = testX;
            
            // Intentar movimiento en Y
            let canMoveY = true;
            const testY = this.y + moveY;
            for(let wall of walls) {
                if(checkCollision(this.x - this.radio, testY - this.radio, this.radio*2, this.radio*2, wall.x, wall.y, wall.w, wall.h)) {
                    canMoveY = false;
                    break;
                }
            }
            if(canMoveY) finalY = testY;
            
            // Aplicar movimiento final
            this.x = finalX;
            this.y = finalY;
        } else {
            // Patrullar aleatoriamente si no hay jugadores
            this.patrolAngle += (Math.random() - 0.5) * 0.2;
            const moveX = Math.cos(this.patrolAngle) * currentSpeed * 0.5;
            const moveY = Math.sin(this.patrolAngle) * currentSpeed * 0.5;
            
            // Wall Sliding para patrullaje
            let finalX = this.x;
            let finalY = this.y;
            
            // Intentar movimiento en X
            let canMoveX = true;
            const testX = this.x + moveX;
            for(let wall of walls) {
                if(checkCollision(testX - this.radio, this.y - this.radio, this.radio*2, this.radio*2, wall.x, wall.y, wall.w, wall.h)) {
                    canMoveX = false;
                    break;
                }
            }
            if(canMoveX) finalX = testX;
            
            // Intentar movimiento en Y
            let canMoveY = true;
            const testY = this.y + moveY;
            for(let wall of walls) {
                if(checkCollision(this.x - this.radio, testY - this.radio, this.radio*2, this.radio*2, wall.x, wall.y, wall.w, wall.h)) {
                    canMoveY = false;
                    break;
                }
            }
            if(canMoveY) finalY = testY;
            
            // Aplicar movimiento final
            this.x = finalX;
            this.y = finalY;
        }

        // Evitar que el jefe salga del mapa
        this.x = Math.max(this.radio, Math.min(MAPA_W - this.radio, this.x));
        this.y = Math.max(this.radio, Math.min(MAPA_H - this.radio, this.y));

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
    
    // Enviar muros al cliente cuando se conecta
    socket.emit('mapaInfo', { walls, MAPA_W, MAPA_H });

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

    socket.on('upgrade', (tipo) => {
        let j = jugadores[socket.id];
        if(j && j.clase && j.aplicarMejora(tipo)) {
            socket.emit('upgradeOk', { tipo, nivel: j.upgrades[tipo].nivel, skillPoints: j.skillPoints });
        }
    });
    
    // Mantener el antiguo sistema de compras por compatibilidad temporal
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
            // Wall Sliding suave en el servidor
            const nextX = Math.max(j.radio, Math.min(MAPA_W - j.radio, d.x));
            const nextY = Math.max(j.radio, Math.min(MAPA_H - j.radio, d.y));
            
            // Calcular movimiento delta para aplicar wall sliding
            const deltaX = nextX - j.x;
            const deltaY = nextY - j.y;
            
            let finalX = j.x;
            let finalY = j.y;
            
            // Intentar movimiento en X
            let canMoveX = true;
            const testX = j.x + deltaX;
            for(let wall of walls) {
                if(checkCollision(testX - j.radio, j.y - j.radio, j.radio*2, j.radio*2, wall.x, wall.y, wall.w, wall.h)) {
                    canMoveX = false;
                    break;
                }
            }
            if(canMoveX) finalX = testX;
            
            // Intentar movimiento en Y
            let canMoveY = true;
            const testY = j.y + deltaY;
            for(let wall of walls) {
                if(checkCollision(j.x - j.radio, testY - j.radio, j.radio*2, j.radio*2, wall.x, wall.y, wall.w, wall.h)) {
                    canMoveY = false;
                    break;
                }
            }
            if(canMoveY) finalY = testY;
            
            // Aplicar movimiento final
            j.x = finalX;
            j.y = finalY;
        }
    });

    socket.on('disparar', (angulo) => {
        let j = jugadores[socket.id];
        
        // ¡CRÍTICO: Límite físico absoluto - Sin excepciones!
        const now = Date.now();
        if (!j || !j.clase) return;
        const cooldownReal = Math.max(j.reloadTime || 1000, 200); // JAMÁS más rápido que 200ms
        const tiempoPasado = now - (j.lastShotTime || 0);
        if (tiempoPasado < cooldownReal) return;
        j.lastShotTime = now;
        
        let esSanadora = (j.clase === 'medico');
        let colorBala = esSanadora ? '#2ecc71' : 'yellow';
        
        balas.push(new Bala(j.x, j.y, angulo, socket.id, colorBala, j.dano, esSanadora));
        j.cooldown = j.maxCooldown;
    });

    socket.on('angulo', (angulo) => {
        let j = jugadores[socket.id];
        if (j && j.clase) {
            j.angle = angulo; // Actualizar ángulo del jugador
        }
    });

    socket.on('disconnect', () => { delete jugadores[socket.id]; });
});
setInterval(() => {
    // Actualizar físicas de balas
    for(let i=balas.length-1; i>=0; i--) {
        let b = balas[i];
        b.x += Math.cos(b.angulo) * 15;
        b.y += Math.sin(b.angulo) * 15;
        b.hitTimer++;
        
        // Colisión balas con muros
        for(let wall of walls) {
            if(checkCollision(b.x - b.radio, b.y - b.radio, b.radio*2, b.radio*2, wall.x, wall.y, wall.w, wall.h)) {
                b.borrar = true;
                io.emit('impacto', { x: b.x, y: b.y, color: '#666' });
                break;
            }
        }
        
        if(b.x < 0 || b.x > MAPA_W || b.y < 0 || b.y > MAPA_H || b.hitTimer > 120) b.borrar = true;
        
        if(!b.borrar && b.idDueno !== 'BOSS'){
            // Balas de jugadores contra otros jugadores
            for(let id in jugadores){
                let j = jugadores[id];
                if(!j.clase || id === b.idDueno) continue;
                if(Math.sqrt((b.x-j.x)**2 + (b.y-j.y)**2) < j.radio + 10){
                    if(!b.esSanadora) {
                        j.hp -= b.dano;
                        // NO sobrescribir lastWords - usar mensaje personalizado del usuario
                    } else {
                        j.hp = Math.min(j.hp + b.dano, j.maxHp);
                    }
                    b.borrar = true;
                    io.emit('impacto', { x: b.x, y: b.y, color: j.color });
                    break;
                }
            }
            
            // Balas de jugadores contra el Jefe
            if(Math.sqrt((b.x-jefe.x)**2 + (b.y-jefe.y)**2) < jefe.radio + 10){
                jefe.hp -= b.dano;
                b.borrar = true;
                
                // ¡CRÍTICO: Verificar si el jefe muere!
                if(jefe.hp <= 0) {
                    // Bonus gigante al jugador que dio el golpe final
                    if(jugadores[b.idDueno]) {
                        jugadores[b.idDueno].score += 5000; // Bonus masivo
                        jugadores[b.idDueno].ganarSkillPoints();
                        
                        // Anunciar muerte del jefe
                        io.emit('mensajeGlobal', {
                            texto: `¡${jugadores[b.idDueno].nombre || 'Un héroe'} ha derrotado al Jefe!`,
                            tipo: 'victoria'
                        });
                    }
                    
                    // Respawn del jefe (más difícil)
                    jefe.maxHp = Math.round(jefe.maxHp * 1.1); // +10% de HP cada vez
                    jefe.hp = jefe.maxHp;
                    jefe.x = 1500;
                    jefe.y = 1500;
                    jefe.isFrenzy = false;
                    jefe.frenzyTimer = 0;
                    jefe.frenzyCooldown = 0;
                    
                    // Efecto visual de respawn
                    io.emit('impacto', { x: jefe.x, y: jefe.y, color: '#00ff00' });
                }
                
                if(jugadores[b.idDueno]) {
                    // Daño = Puntos: Ganar puntos proporcionales al daño
                    const puntosGanar = Math.floor(b.dano * 2); // 2 puntos por cada 1 de daño
                    jugadores[b.idDueno].score += puntosGanar;
                    // ¡CRÍTICO: Calcular skill points en tiempo real!
                    jugadores[b.idDueno].ganarSkillPoints();
                }
                io.emit('impacto', { x: b.x, y: b.y, color: jefe.color });
            }
            else if(b.esSanadora) {
                for(let id in jugadores){
                    let j = jugadores[id];
                    if(id !== b.idDueno && Math.sqrt((b.x-j.x)**2 + (b.y-j.y)**2) < j.radio + 10){
                        j.hp = Math.min(j.hp + b.dano, j.maxHp); 
                        b.borrar = true;
                        if(jugadores[b.idDueno]) {
                            jugadores[b.idDueno].score += 10;
                            // ¡CRÍTICO: Calcular skill points en tiempo real!
                            jugadores[b.idDueno].ganarSkillPoints();
                        }
                    }
                }
            }
        }
        // Las balas del Jefe (b.idDueno === 'BOSS') no colisionan con el Jefe
        // Solo colisionan con jugadores (se maneja en la sección de daño por contacto)
    }
    
    // Actualizar cooldowns
    for(let id in jugadores){
        let j = jugadores[id];
        if(j.clase && j.cooldown > 0) j.cooldown--;
    }
    
    // IA del Jefe
    jefe.pensar(jugadores);
    
    // --- DAÑO POR CONTACTO DEL JEFE ---
    for(let id in jugadores){
        let j = jugadores[id];
        if(j.clase && Math.sqrt((j.x-jefe.x)**2 + (j.y-jefe.y)**2) < j.radio + jefe.radio){
            if(jefe.isFrenzy) {
                j.hp = 0; // Muerte instantánea en modo frenesí
                // NO sobrescribir lastWords - usar mensaje personalizado del usuario
            } else {
                j.hp -= 2; // Daño continuo normal
                // NO sobrescribir lastWords - usar mensaje personalizado del usuario
            }
        }
    }
    
    // Limpiar entidades
    balas = balas.filter(b => !b.borrar);
    
    // Verificar muertes
    for(let id in jugadores){
        if(jugadores[id].clase && jugadores[id].hp <= 0){
            const muerteX = jugadores[id].x;
            const muerteY = jugadores[id].y;
            io.emit('mensajeMuerte', { x: muerteX, y: muerteY, texto: jugadores[id].lastWords || "R.I.P." });
            
            // IA 2.0 - Vampirismo: El jefe se cura cuando un jugador muere
            jefe.curarsePorMuerte();
            
            // Fix de Reaparición: Conservar mitad del score y recalcular skill points
            const jugador = jugadores[id];
            const scoreConservado = Math.floor(jugador.score / 2);
            
            // Reiniciar mejoras pero conservar score
            jugador.clase = null;
            jugador.score = scoreConservado;
            jugador.x = -1000;
            jugador.hp = 100;
            jugador.maxHp = 100;
            
            // Recalcular skill points basados en el score conservado
            jugador.skillPoints = Math.min(Math.floor(scoreConservado / 100), 20); // Máximo 20 puntos
            jugador.lastSkillPointScore = Math.floor(scoreConservado / 100) * 100;
            
            // Reiniciar mejoras a 0
            jugador.upgrades = {
                dano: { nivel: 0, max: 5 },
                salud: { nivel: 0, max: 5 },
                velocidad: { nivel: 0, max: 5 },
                recarga: { nivel: 0, max: 5 }
            };
            
            io.to(id).emit('muerte', "HAS MUERTO");
        }
    }
}, 1000 / 60); // 60 FPS para físicas

// --- NETWORK LOOP (Envío a 20 Ticks/segundo) ---
setInterval(() => {
    // Compresión de Payload: Redondear todos los valores numéricos
    const compressedState = {
        jugadores: {},
        balas: [],
        jefe: {
            x: Math.round(jefe.x),
            y: Math.round(jefe.y),
            hp: Math.round(jefe.hp),
            maxHp: jefe.maxHp,
            radio: jefe.radio,
            color: jefe.color, // ¡CRÍTICO: Enviar color del jefe!
            isFrenzy: jefe.isFrenzy,
            tiempo: jefe.tiempo
        },
        leaderboard: getTop5Leaderboard()
    };
    
    // Comprimir jugadores (solo datos dinámicos)
    for(let id in jugadores) {
        let j = jugadores[id];
        if(j.clase) {
            compressedState.jugadores[id] = {
                x: Math.round(j.x),
                y: Math.round(j.y),
                hp: Math.round(j.hp),
                maxHp: j.maxHp,
                radio: j.radio,
                color: j.color,
                score: j.score,
                nombre: j.nombre,
                clase: j.clase,
                angle: Math.round(j.angle || 0),
                skillPoints: j.skillPoints,
                upgrades: j.upgrades,
                velocidad: j.velocidad, // ¡CRÍTICO: Enviar velocidad actualizada!
                maxCooldown: j.maxCooldown, // ¡CRÍTICO: Enviar cooldown actualizado!
                reloadTime: j.reloadTime // ¡CRÍTICO: Enviar reloadTime sincronizado!
            };
        }
    }
    
    // Comprimir balas
    for(let b of balas) {
        compressedState.balas.push({
            x: Math.round(b.x),
            y: Math.round(b.y),
            radio: b.radio,
            color: b.color,
            angulo: Math.round(b.angulo * 100) / 100, // 2 decimales
            idDueno: b.idDueno,
            esSanadora: b.esSanadora
        });
    }
    
    io.emit('estado', compressedState);
}, 1000 / 20); // 20 Ticks/segundo para red

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0',() => {
  console.log(`Servidor accesible en: http://192.168.100.22:${PORT}`);
});
