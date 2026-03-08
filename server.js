const express = require('express');
const app = express();

// Permitir que el servidor entienda datos en formato JSON
app.use(express.json());
app.use(express.static('public'));

// --- BASES DE DATOS SECRETAS ---

const tarotCards = [
    { card: "El Loco 🃏", meaning: "Nuevos comienzos, saltos de fe y espontaneidad." },
    { card: "El Mago 🪄", meaning: "Poder de manifestación, habilidad y recursos infinitos." },
    { card: "La Sacerdotisa 👁️", meaning: "Intuición profunda, misterio y voz interior." },
    { card: "La Emperatriz 👑", meaning: "Abundancia, creatividad y fertilidad en tus proyectos." },
    { card: "El Emperador 🏛️", meaning: "Estructura, estabilidad y liderazgo natural." },
    { card: "Los Enamorados ❤️", meaning: "Decisiones importantes desde el corazón y alineación." },
    { card: "El Carro 🏇", meaning: "Victoria, fuerza de voluntad y superación de obstáculos." },
    { card: "La Justicia ⚖️", meaning: "Causa y efecto, verdad y equilibrio en tu vida." },
    { card: "El Ermitaño 🏮", meaning: "Búsqueda interior, soledad constructiva y reflexión." },
    { card: "La Rueda de la Fortuna 🎡", meaning: "Cambios de ciclo, destino y giros inesperados a tu favor." },
    { card: "La Fuerza 🦁", meaning: "Coraje, compasión y dominio de tus instintos." },
    { card: "La Torre ⚡", meaning: "Destrucción de viejas estructuras para renacer más fuerte." },
    { card: "La Estrella ⭐", meaning: "Esperanza, inspiración y sanación espiritual." },
    { card: "La Luna 🌙", meaning: "Ilusiones, subconsciente y enfrentar tus miedos." },
    { card: "El Sol ☀️", meaning: "Éxito, vitalidad, alegría y claridad absoluta." },
    { card: "El Mundo 🌍", meaning: "Finalización exitosa de un ciclo y plenitud." }
];

const barnumPhrases = [
    "Hoy es un día crucial para confiar en tu intuición más que en la lógica.",
    "Alguien cercano a ti está pensando en pedirte un consejo importante.",
    "Una oportunidad se presentará disfrazada de un pequeño inconveniente.",
    "Es el momento perfecto para dejar ir esa preocupación que te quita el sueño.",
    "Un recuerdo del pasado volverá hoy para darte la respuesta que buscabas.",
    "No temas decir que 'no' hoy; el universo respaldará tus límites.",
    "Tu capacidad de adaptación será puesta a prueba, pero saldrás victorioso.",
    "Hoy descubrirás que eres más fuerte frente a la incertidumbre de lo que creías.",
    "Un pequeño cambio en tu rutina traerá un resultado sorprendente mañana.",
    "Esa corazonada que tienes sobre una persona es 100% correcta.",
    "El esfuerzo invisible que has estado haciendo por fin empezará a dar frutos.",
    "Cuidado con gastar energía en discusiones que no cambiarán la mente del otro.",
    "Una conversación casual hoy esconderá una pista vital para tu futuro laboral.",
    "Estás a punto de cerrar un ciclo emocional que te mantenía atascado.",
    "Hoy tu vibra atraerá a alguien que necesita exactamente tu forma de ver el mundo.",
    // Podrías agregar 35 más aquí sin problema, ¡la lista puede ser infinita!
    "Una coincidencia numérica durante el día te confirmará que vas por buen camino.",
    "Es buen momento para retomar ese proyecto creativo que dejaste a medias.",
    "Alguien a quien admiras en secreto ha notado tu crecimiento personal.",
    "Tu empatía será tu mayor superpoder hoy, úsala sabiamente."
];

// --- FUNCIONES MATEMÁTICAS SECRETAS ---

function getZodiac(day, month) {
    if ((month == 1 && day <= 20) || (month == 12 && day >= 22)) return "Capricornio ♑";
    if ((month == 1 && day >= 21) || (month == 2 && day <= 18)) return "Acuario ♒";
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return "Piscis ♓";
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Aries ♈";
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Tauro ♉";
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return "Géminis ♊";
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return "Cáncer ♋";
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Leo ♌";
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Virgo ♍";
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "Libra ♎";
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return "Escorpio ♏";
    return "Sagitario ♐";
}

function getMoon(year, month, day) {
    let r = ((year - 2000) * 11 + month + day) % 30;
    if (r < 4 || r > 26) return "Luna Nueva 🌑";
    if (r < 11) return "Cuarto Creciente 🌓";
    if (r < 19) return "Luna Llena 🌕";
    return "Cuarto Menguante 🌗";
}

function getMusic(year, seed) {
    const age = new Date().getFullYear() - year;
    let pool = [];
    if (age >= 38) {
        pool = ["Los Prisioneros - Tren al Sur", "La Ley - El Duelo", "Soda Stereo - Persiana Americana", "Chayanne - Un Siglo Sin Ti", "Maná - Rayando el Sol"];
    } else if (age >= 25) {
        pool = ["Los Bunkers - Llueve sobre la ciudad", "Kudai - Sin Despertar", "Daddy Yankee - Gasolina", "Coldplay - The Scientist", "RBD - Sálvame"];
    } else {
        pool = ["Cris MJ - Una Noche en Medellín", "Young Cister - La Terapia", "Bad Bunny - Ojitos Lindos", "Feid - Luna", "Dua Lipa - Levitating"];
    }
    return pool[seed % pool.length];
}

function getHash(name, dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const seedString = name.toLowerCase().trim() + dateStr + today;
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
        hash = ((hash << 5) - hash) + seedString.charCodeAt(i); hash |= 0;
    }
    return Math.abs(hash);
}

// --- LA API QUE LLAMARÁ EL NAVEGADOR ---
app.post('/api/leer-destino', (req, res) => {
    const { name, dateStr } = req.body;
    
    if (!name || !dateStr) return res.status(400).json({ error: "Datos faltantes" });

    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate(); const month = date.getMonth() + 1; const year = date.getFullYear();
    const seed = getHash(name, dateStr);

    const zodiac = getZodiac(day, month);
    const moon = getMoon(year, month, day);
    const music = getMusic(year, seed);
    const phrase = barnumPhrases[seed % barnumPhrases.length];
    const tarot = tarotCards[seed % tarotCards.length];

    // Devolvemos el resultado cocinado, sin revelar la receta
    res.json({
        zodiac, moon, music, phrase,
        tarotName: tarot.card,
        tarotMeaning: tarot.meaning
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Bóveda Cosmos activa en http://localhost:${PORT}`); });