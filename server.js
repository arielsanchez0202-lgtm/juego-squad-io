const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// --- 1. BASE DE DATOS DEL TAROT (Expandida) ---
const tarotDB = {
    success: [
        { card: "El Emperador 🏛️", meaning: "Estructura, estabilidad, liderazgo y éxito material inminente." },
        { card: "El Carro 🏇", meaning: "Victoria, fuerza de voluntad y superación de obstáculos laborales." },
        { card: "El Mago 🪄", meaning: "Tienes todos los recursos y habilidades para manifestar abundancia hoy." },
        { card: "El Sol ☀️", meaning: "Éxito radiante, vitalidad y claridad absoluta en tus proyectos." },
        { card: "As de Oros 🪙", meaning: "Una nueva oportunidad financiera brillante está tocando tu puerta." },
        { card: "Nueve de Oros 🍇", meaning: "Independencia financiera, lujo y disfrutar los frutos de tu trabajo." },
        { card: "Ocho de Bastos ☄️", meaning: "Movimiento rápido, noticias urgentes y progreso sin demoras." },
        { card: "Diez de Oros 🏰", meaning: "Construcción de un legado sólido. Riqueza a largo plazo y seguridad familiar." },
        { card: "Rey de Oros 👑", meaning: "Mente maestra para los negocios. Inversiones seguras que rinden frutos." },
        { card: "Seis de Bastos 🏆", meaning: "Reconocimiento público, aplausos y validación por tu arduo esfuerzo." }
    ],
    love: [
        { card: "Los Enamorados ❤️", meaning: "Decisiones importantes desde el corazón y alineación de almas." },
        { card: "La Emperatriz 👑", meaning: "Abundancia afectiva, creatividad y magnetismo puro." },
        { card: "Dos de Copas 🥂", meaning: "Conexión profunda, alianzas verdaderas y reciprocidad emocional." },
        { card: "Caballero de Copas 🏇💖", meaning: "Llegada de una invitación romántica o una propuesta honesta." },
        { card: "As de Copas 🌊", meaning: "Desborde de emociones, nuevos amores o un despertar espiritual." },
        { card: "Diez de Copas 🌈", meaning: "Armonía total, felicidad en tu círculo íntimo y paz." },
        { card: "Tres de Copas 💃", meaning: "Celebración, reencuentros valiosos y energía social vibrante." },
        { card: "Reina de Copas 🧜‍♀️", meaning: "Intuición emocional al máximo. Alguien te cuidará con profunda devoción." },
        { card: "Cuatro de Bastos ⛺", meaning: "Estabilidad en pareja, compromiso formal o mudanza compartida." },
        { card: "El Mundo 🌍", meaning: "Un ciclo afectivo se completa de manera perfecta. Plenitud total." }
    ],
    healing: [
        { card: "La Estrella ⭐", meaning: "Esperanza, inspiración y sanación espiritual profunda." },
        { card: "El Ermitaño 🏮", meaning: "Búsqueda interior, soledad constructiva y reflexión necesaria." },
        { card: "La Templanza ⚖️", meaning: "Equilibrio, paciencia, alquimia emocional y moderación." },
        { card: "El Colgado 🧘", meaning: "Cambio de perspectiva, soltar el control y encontrar la paz." },
        { card: "Cuatro de Espadas 🛏️", meaning: "Necesidad de descanso, retiro temporal y recuperación mental." },
        { card: "Seis de Espadas 🛶", meaning: "Transición hacia aguas más calmadas, dejando atrás la tormenta." },
        { card: "La Torre ⚡", meaning: "Derrumbe de viejas estructuras limitantes para construir sobre bases reales." },
        { card: "Ocho de Copas 🚶", meaning: "Alejarse de lo que ya no te llena emocionalmente buscando un propósito mayor." },
        { card: "Tres de Espadas 🌧️", meaning: "Liberación de un dolor antiguo. La herida sana al dejarla respirar." },
        { card: "El Juicio 🎺", meaning: "Renacimiento. Perdonarte a ti mismo y abrazar una nueva versión de tu ser." }
    ],
    mystery: [
        { card: "La Sacerdotisa 👁️", meaning: "Intuición profunda, misterios ocultos y escuchar tu voz interior." },
        { card: "La Rueda de la Fortuna 🎡", meaning: "Cambios de ciclo, destino y giros inesperados a tu favor." },
        { card: "La Luna 🌙", meaning: "Ilusiones, subconsciente, sueños reveladores y enfrentar miedos." },
        { card: "El Loco 🃏", meaning: "Saltos de fe, dejar atrás lo conocido y confiar en el universo." },
        { card: "Siete de Copas ☁️", meaning: "Múltiples opciones, ilusiones y la necesidad de elegir con sabiduría." },
        { card: "El Juicio 🎺", meaning: "Un despertar repentino, un llamado interior o una revelación." },
        { card: "Paje de Copas 🐟", meaning: "Sincronicidades mágicas, sueños premonitorios o mensajes sutiles del universo." },
        { card: "Diez de Espadas 🌅", meaning: "Un final abrupto, pero que marca la llegada de un nuevo y brillante amanecer." },
        { card: "Nueve de Espadas 🦉", meaning: "Ansiedades nocturnas que solo son ilusiones. La luz disipará las sombras." },
        { card: "Siete de Espadas 🦊", meaning: "Estrategia silenciosa. Mantén tus planes en secreto hasta que se materialicen." },
        { card: "La Muerte 🦋", meaning: "Transformación profunda e inevitable. Cierre de un ciclo para que algo nuevo nazca." }
    ]
};

// --- 2. BASE DE DATOS DE FRASES (Expandida) ---
const phrasesDB = {
    success: [
        "Estás a un paso de la libertad financiera que buscas. Hoy, no aceptes un 'no' por respuesta.",
        "Esa idea de negocio o proyecto que te da vueltas en la cabeza tiene un potencial gigante. Ejecútala.",
        "El universo está recompensando tu disciplina. Prepárate para una buena noticia material.",
        "Hoy descubrirás que eres mucho más fuerte y capaz de lo que tu mente te intentaba convencer.",
        "Tu esfuerzo invisible está a punto de hacerse muy visible. No bajes el ritmo ahora.",
        "El síndrome del impostor te está mintiendo. Tienes exactamente el talento que se requiere para ese salto.",
        "Una inversión de tiempo que hiciste hace meses empezará a dar dividendos sorprendentes esta semana.",
        "Alguien con influencia está observando tu trabajo en silencio. Sigue demostrando tu excelencia.",
        "La independencia que buscas está al otro lado de esa conversación difícil que has estado evitando.",
        "Ese correo o mensaje que estás esperando llegará con una respuesta mucho mejor de lo que imaginabas.",
        "Deja de rebajar tus precios o tu valor. Estás a punto de atraer a personas que pagan lo que realmente vales.",
        "Un antiguo contacto laboral reaparecerá con una propuesta que cambiará tus planes para este año.",
        "La suerte es preparación más oportunidad. Hoy ambas se cruzan en tu camino de forma espectacular.",
        "Ese proyecto que sentías estancado acaba de destrabarse energéticamente. Notarás el avance mañana."
    ],
    love: [
        "Una persona del pasado está pensando en ti, pero el destino quiere que mires hacia adelante.",
        "Tu energía atraerá hoy a alguien que necesita exactamente tu forma de amar y ver el mundo.",
        "Una conversación casual hoy esconderá una pista vital para una relación que te importa mucho.",
        "No temas mostrar tu vulnerabilidad hoy; será el puente para una conexión real e inolvidable.",
        "Esa corazonada que tienes sobre las intenciones de esa persona especial es 100% correcta.",
        "Poner un límite sano hoy no alejará a los que valen la pena, solo filtrará a quienes no te convienen.",
        "Un encuentro que parecerá coincidencia te recordará por qué no funcionó con tus relaciones anteriores.",
        "Alguien que te ve todos los días está reuniendo el valor para decirte lo que realmente siente.",
        "Tu mayor acto de amor propio hoy será perdonarte por decisiones que tomaste cuando sabías menos.",
        "La claridad que pedías respecto a esa relación confusa llegará a través de un mensaje accidental.",
        "Deja de buscar explicaciones a su comportamiento. Su falta de acción ya es una respuesta clara.",
        "Estás en una vibración magnética. Hoy captarás miradas en lugares donde antes pasabas desapercibido.",
        "Alguien está manifestando tu presencia en su vida. Siente tu ausencia más de lo que admite.",
        "El amor verdadero que buscas requiere que primero sueltes el fantasma de quien ya no está."
    ],
    healing: [
        "Es el momento perfecto para dejar ir esa preocupación que te roba el sueño y la energía.",
        "A veces, la respuesta no es avanzar más rápido, sino detenerte a escuchar el silencio.",
        "No tienes que tener todo resuelto hoy. Date permiso para simplemente existir y respirar.",
        "Cuidado con gastar energía en discusiones que no cambiarán la mente del otro. Protege tu paz.",
        "Un recuerdo del pasado volverá hoy, no para doler, sino para mostrarte cuánto has sanado.",
        "Descansar cuando estás agotado no es pereza, es mantenimiento vital. El universo te pide una pausa.",
        "Esa culpa que cargas por no cumplir las expectativas de otros no te pertenece. Suéltala.",
        "Hoy es un día para nutrir tu cuerpo y tu mente. Lo que consumes hoy dicta tu energía de mañana.",
        "La validación que tanto buscas en el exterior está esperando a que te la des tú mismo.",
        "Tu ansiedad está proyectando futuros que nunca ocurrirán. Vuelve al momento presente, estás a salvo.",
        "Llorar o sentirte vulnerable hoy destapará un bloqueo energético que llevas meses cargando.",
        "Esa persona no es tóxica, simplemente sus heridas chocan con las tuyas. Aléjate con compasión.",
        "Tu cuerpo te está pidiendo agua y movimiento. Escúchalo antes de que te pida descanso a la fuerza.",
        "Perdonar no significa que lo que te hicieron estuvo bien, significa que ya no permites que te controle."
    ],
    mystery: [
        "Una coincidencia numérica durante el día te confirmará que vas por el camino exacto.",
        "Presta atención a tus sueños esta noche; tu subconsciente tiene un mensaje urgente para ti.",
        "Una oportunidad gigante se presentará hoy disfrazada de un pequeño y molesto inconveniente.",
        "Hoy es un día crucial para confiar en tu intuición ciegamente, ignorando la lógica fría.",
        "Un pequeño cambio en tu rutina desencadenará un efecto mariposa sorprendente esta semana.",
        "Presta atención al próximo animal inusual que se cruce en tu camino o en una imagen; trae un símbolo.",
        "Esa sensación de 'déjà vu' que experimentarás hoy es una señal de que estás alineado con tu propósito.",
        "Un secreto que ha estado oculto en tu círculo cercano está a punto de salir a la luz de forma inesperada.",
        "Ese objeto perdido que aparecerá hoy trae consigo una energía que necesitas recuperar en tu vida.",
        "Cuidado con lo que hablas en voz alta hoy. Las paredes tienen oídos y el universo está tomando notas.",
        "Revisa bien ese mensaje o correo antes de enviarlo, hay un doble sentido que se te está escapando.",
        "Verás horas espejo repetidas (11:11, 22:22). Es la confirmación de que tus guías te están protegiendo.",
        "Una canción antigua sonará en la calle y te dará la respuesta exacta a la pregunta que tienes en mente.",
        "Alguien muy cercano oculta sus verdaderas intenciones detrás de una broma. Analiza bien esa sonrisa."
    ]
};

// --- 3. LA GRAN DISCOTECA (Expandida con joyitas de todos los géneros) ---
const musicDB = {
    // Música para HOMBRES (energía masculina, motivación, poder)
    male: {
        success: [
            { title: "Eminem - 'Till I Collapse", era: "new", energy: "high" },
            { title: "Kanye West - POWER", era: "old", energy: "high" },
            { title: "Los Prisioneros - Quieren Dinero", era: "old", energy: "medium" },
            { title: "AC/DC - Thunderstruck", era: "old", energy: "high" },
            { title: "Kendrick Lamar - DNA.", era: "new", energy: "high" },
            { title: "Survivor - Eye of the Tiger", era: "old", energy: "high" },
            { title: "Kordhell - Murder In My Mind (Phonk)", era: "new", energy: "extreme" },
            { title: "Daft Punk - Harder, Better, Faster", era: "all", energy: "high" },
            { title: "Queen - Don't Stop Me Now", era: "old", energy: "high" },
            { title: "Trueno, Duki - Dance Crip", era: "new", energy: "high" },
            { title: "Cris MJ - Una Noche en Medellín", era: "new", energy: "high" },
            { title: "Bizarrap, Quevedo - Bzrp Music Sessions, Vol. 52", era: "new", energy: "extreme" },
            { title: "Travis Scott - SICKO MODE", era: "new", energy: "high" },
            { title: "The Strokes - Reptilia", era: "old", energy: "high" },
            { title: "Arctic Monkeys - R U Mine?", era: "new", energy: "high" },
            { title: "Feid - Feliz Cumpleaños Ferxxo", era: "new", energy: "medium" }
        ],
        love: [
            { title: "Sin Bandera - Entra en mi vida", era: "old", energy: "medium" },
            { title: "Daniel Caesar - Get You", era: "new", energy: "low" },
            { title: "Cultura Profética - Ilegal", era: "old", energy: "medium" },
            { title: "Rauw Alejandro - Todo de Ti", era: "new", energy: "medium" },
            { title: "The Weeknd - Blinding Lights", era: "new", energy: "medium" },
            { title: "Coldplay - Yellow", era: "old", energy: "low" },
            { title: "Manu Chao - Me gustas tú", era: "all", energy: "medium" },
            { title: "Juanes - A Dios le pido", era: "old", energy: "medium" },
            { title: "Mac DeMarco - My Kind of Woman", era: "new", energy: "low" },
            { title: "Bad Bunny - Ojitos Lindos", era: "new", energy: "medium" },
            { title: "Leonel García, Natalia Lafourcade - Hasta la Raíz", era: "new", energy: "low" },
            { title: "Mora - LA INOCENTE", era: "new", energy: "medium" },
            { title: "Joji - SLOW DANCING IN THE DARK", era: "new", energy: "low" },
            { title: "Babasónicos - Putita", era: "old", energy: "medium" }
        ],
        healing: [
            { title: "Bob Marley - Three Little Birds", era: "all", energy: "low" },
            { title: "Canserbero - Jeremías 17-5", era: "all", energy: "medium" },
            { title: "Enya - Orinoco Flow", era: "old", energy: "low" },
            { title: "Luis Alberto Spinetta - Bajan", era: "old", energy: "medium" },
            { title: "Gustavo Cerati - Adiós", era: "old", energy: "low" },
            { title: "Mac DeMarco - Chamber of Reflection", era: "new", energy: "low" },
            { title: "Radiohead - Creep", era: "old", energy: "medium" },
            { title: "Nirvana - Something in the Way", era: "old", energy: "low" },
            { title: "Tame Impala - Let It Happen", era: "new", energy: "medium" },
            { title: "Los Bunkers - Nada Nuevo Bajo el Sol", era: "old", energy: "medium" },
            { title: "Kid Cudi - Pursuit Of Happiness", era: "new", energy: "low" },
            { title: "Red Hot Chili Peppers - Under the Bridge", era: "old", energy: "low" },
            { title: "El Mató a un Policía Motorizado - El Tesoro", era: "new", energy: "medium" }
        ],
        mystery: [
            { title: "Molchat Doma - Sudno", era: "new", energy: "low" },
            { title: "Depeche Mode - Personal Jesus", era: "old", energy: "medium" },
            { title: "The Neighbourhood - Sweater Weather", era: "new", energy: "medium" },
            { title: "Pink Floyd - Shine On You Crazy Diamond", era: "old", energy: "low" },
            { title: "Massive Attack - Teardrop", era: "old", energy: "low" },
            { title: "Crystal Castles - Crimewave", era: "new", energy: "medium" },
            { title: "Gorillaz - Clint Eastwood", era: "old", energy: "medium" },
            { title: "Billie Eilish - bury a friend", era: "new", energy: "low" },
            { title: "Depresión Sonora - Ya No Hay Verano", era: "new", energy: "medium" },
            { title: "Joy Division - Love Will Tear Us Apart", era: "old", energy: "medium" },
            { title: "Kavinsky - Nightcall", era: "new", energy: "low" },
            { title: "Soda Stereo - En la Ciudad de la Furia", era: "old", energy: "low" },
            { title: "Mareux - The Perfect Girl", era: "new", energy: "low" }
        ]
    },
    // Música para MUJERES (energía femenina, empoderamiento, sensibilidad)
    female: {
        success: [
            { title: "Beyoncé - Run the World (Girls)", era: "new", energy: "high" },
            { title: "Dua Lipa - Training Season", era: "new", energy: "high" },
            { title: "Taylor Swift - Shake It Off", era: "new", energy: "high" },
            { title: "Ariana Grande - 7 rings", era: "new", energy: "medium" },
            { title: "Rosalía - MALAMENTE", era: "new", energy: "high" },
            { title: "Cardi B - WAP", era: "new", energy: "extreme" },
            { title: "Bad Bunny - Ojitos Lindos", era: "new", energy: "medium" },
            { title: "Katy Perry - Roar", era: "old", energy: "high" },
            { title: "Lady Gaga - Born This Way", era: "old", energy: "high" },
            { title: "Princesa Alba - Convéncete", era: "new", energy: "medium" },
            { title: "Karol G - PROVENZA", era: "new", energy: "high" },
            { title: "Nathy Peluso - DELITO", era: "new", energy: "high" },
            { title: "Emilia - No_se_ve.mp3", era: "new", energy: "high" },
            { title: "Doja Cat - Woman", era: "new", energy: "medium" },
            { title: "Rihanna - Bitch Better Have My Money", era: "new", energy: "extreme" }
        ],
        love: [
            { title: "Aventura - Obsesión", era: "old", energy: "medium" },
            { title: "Mon Laferte - Tu Falta De Querer", era: "all", energy: "medium" },
            { title: "Los Ángeles Negros - Y Volveré", era: "all", energy: "low" },
            { title: "Frank Ocean - Thinkin Bout You", era: "new", energy: "low" },
            { title: "The Cure - Friday I'm In Love", era: "old", energy: "medium" },
            { title: "Soda Stereo - Trátame Suavemente", era: "old", energy: "low" },
            { title: "Billie Eilish - lovely", era: "new", energy: "low" },
            { title: "Lana Del Rey - Summertime Sadness", era: "new", energy: "low" },
            { title: "Kali Uchis - Telepatía", era: "new", energy: "low" },
            { title: "Julieta Venegas - Eres Para Mí", era: "old", energy: "medium" },
            { title: "Taylor Swift - Lover", era: "new", energy: "low" },
            { title: "SZA - Snooze", era: "new", energy: "low" },
            { title: "Girl in Red - we fell in love in october", era: "new", energy: "low" }
        ],
        healing: [
            { title: "Violeta Parra - Gracias a la Vida", era: "all", energy: "low" },
            { title: "Billie Eilish - everything i wanted", era: "new", energy: "low" },
            { title: "Fármacos - Siempre Esperas Lo Que No Va A Llegar", era: "new", energy: "medium" },
            { title: "Coldplay - The Scientist", era: "old", energy: "low" },
            { title: "Los Tres - Déjate Caer", era: "old", energy: "medium" },
            { title: "Joji - Glimpse of Us", era: "new", energy: "low" },
            { title: "Adele - Someone Like You", era: "old", energy: "low" },
            { title: "Sia - Chandelier", era: "new", energy: "medium" },
            { title: "Lana Del Rey - Doin' Time", era: "new", energy: "low" },
            { title: "Phoebe Bridgers - Motion Sickness", era: "new", energy: "low" },
            { title: "Mitski - Washing Machine Heart", era: "new", energy: "medium" },
            { title: "Clairo - Sofia", era: "new", energy: "low" },
            { title: "Natalia Lafourcade - Hasta la Raíz", era: "new", energy: "medium" }
        ],
        mystery: [
            { title: "M83 - Midnight City", era: "all", energy: "medium" },
            { title: "Bicep - Glue", era: "new", energy: "medium" },
            { title: "Mareux - The Perfect Girl", era: "new", energy: "low" },
            { title: "FKA twigs - Two Weeks", era: "new", energy: "medium" },
            { title: "Grimes - Oblivion", era: "new", energy: "medium" },
            { title: "Björk - Hyperballad", era: "old", energy: "medium" },
            { title: "Florence + The Machine - Dog Days Are Over", era: "old", energy: "high" },
            { title: "Lana Del Rey - Young and Beautiful", era: "new", energy: "low" },
            { title: "Boy Harsher - Pain", era: "new", energy: "medium" },
            { title: "Javiera Mena - Espada", era: "new", energy: "medium" },
            { title: "Melanie Martinez - Play Date", era: "new", energy: "medium" },
            { title: "The xx - Intro", era: "new", energy: "low" }
        ]
    },
    // Música NEUTRAL (para cuando no se detecta género)
    neutral: {
        success: [
            { title: "Daft Punk - Harder, Better, Faster", era: "all", energy: "high" },
            { title: "Pharrell Williams - Happy", era: "new", energy: "high" },
            { title: "Justin Timberlake - CAN'T STOP THE FEELING!", era: "new", energy: "high" },
            { title: "Bruno Mars - Uptown Funk", era: "new", energy: "high" },
            { title: "MGMT - Kids", era: "new", energy: "high" },
            { title: "Gorillaz - Feel Good Inc.", era: "old", energy: "medium" }
        ],
        love: [
            { title: "Ed Sheeran - Perfect", era: "new", energy: "low" },
            { title: "John Legend - All of Me", era: "new", energy: "low" },
            { title: "The Beatles - Here Comes The Sun", era: "old", energy: "medium" },
            { title: "Frank Ocean - Pink + White", era: "new", energy: "low" },
            { title: "Rex Orange County - Loving Is Easy", era: "new", energy: "medium" }
        ],
        healing: [
            { title: "Bob Marley - Three Little Birds", era: "all", energy: "low" },
            { title: "Louis Armstrong - What a Wonderful World", era: "old", energy: "low" },
            { title: "Enya - Orinoco Flow", era: "old", energy: "low" },
            { title: "Fleetwood Mac - Dreams", era: "old", energy: "medium" },
            { title: "Cigarettes After Sex - Apocalypse", era: "new", energy: "low" }
        ],
        mystery: [
            { title: "M83 - Midnight City", era: "all", energy: "medium" },
            { title: "Kavinsky - Nightcall", era: "all", energy: "low" },
            { title: "Gorillaz - Clint Eastwood", era: "old", energy: "medium" },
            { title: "Beach House - Space Song", era: "new", energy: "low" },
            { title: "Tame Impala - The Less I Know The Better", era: "new", energy: "medium" }
        ]
    }
};

// --- MATEMÁTICAS ---
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
    const date = new Date(year, month - 1, day, 12, 0, 0); 
    const ref = new Date(2000, 0, 6, 18, 14, 0); 
    const diffDays = (date - ref) / (1000 * 60 * 60 * 24);
    let cycleDay = diffDays % 29.53058867;
    if (cycleDay < 0) cycleDay += 29.53058867; 
    
    if (cycleDay < 1.84 || cycleDay > 27.68) return "Luna Nueva 🌑";
    if (cycleDay < 5.53) return "Creciente 🌒";
    if (cycleDay < 9.22) return "Cuarto Creciente 🌓";
    if (cycleDay < 12.91) return "Gibosa Creciente 🌔";
    if (cycleDay < 16.61) return "Luna Llena 🌕";
    if (cycleDay < 20.30) return "Gibosa Menguante 🌖";
    if (cycleDay < 23.99) return "Cuarto Menguante 🌗";
    return "Menguante 🌘";
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

function getPerfectSong(birthYear, mood, subSeed, gender = 'neutral') {
    const age = new Date().getFullYear() - birthYear;
    const targetEra = age >= 26 ? "old" : "new"; 
    
    // Seleccionar base de datos según género
    const genderMusicDB = musicDB[gender] || musicDB.neutral;
    const possibleSongs = genderMusicDB[mood] || musicDB.neutral[mood];
    
    let filteredSongs = possibleSongs.filter(s => s.era === targetEra || s.era === "all");
    if (filteredSongs.length === 0) filteredSongs = possibleSongs;
    
    return filteredSongs[subSeed % filteredSongs.length].title;
}

// --- LA API MAESTRA ---
app.post('/api/leer-destino', (req, res) => {
    const { name, dateStr, gender = 'neutral' } = req.body;
    if (!name || !dateStr) return res.status(400).json({ error: "Datos faltantes" });

    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate(); const month = date.getMonth() + 1; const year = date.getFullYear();
    const seed = getHash(name, dateStr);

    const moods = Object.keys(phrasesDB); 
    const selectedMood = moods[seed % moods.length];

    const zodiac = getZodiac(day, month);
    const moon = getMoon(year, month, day);
    
    const tarotCategory = tarotDB[selectedMood];
    const tarot = tarotCategory[(seed + 1) % tarotCategory.length];
    
    const phraseCategory = phrasesDB[selectedMood];
    const phrase = phraseCategory[(seed + 2) % phraseCategory.length];
    
    // Música personalizada según género
    const music = getPerfectSong(year, selectedMood, (seed + 3), gender);

    res.json({
        zodiac, moon, music, phrase,
        tarotName: tarot.card,
        tarotMeaning: tarot.meaning
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Bóveda Cosmos activa en http://localhost:${PORT}`); });