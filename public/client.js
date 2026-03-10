// CLIENTE OPTIMIZADO PARA APLICACIÓN DE TAROT/ASTROLOGÍA

// Elementos del DOM
const mainCard = document.getElementById('mainCard');
const inputForm = document.getElementById('inputForm');
const results = document.getElementById('results');
const loader = document.getElementById('loader');
const nameInput = document.getElementById('nameInput');
const dateInput = document.getElementById('dateInput');

// Variables globales
let currentReading = null;
let userGender = null; // Para personalización musical

// Detección de género basada en el nombre (simple pero efectiva)
function detectGender(name) {
    if (!name || name.length < 2) return 'neutral';
    
    const femaleNames = ['ana', 'maría', 'luisa', 'carolina', 'sofía', 'valentina', 'isabella', 'camila', 'valeria', 'daniela', 'paula', 'lucia', 'martina', 'julia', 'emma', 'catalina', 'fernanda', 'gabriela', 'alejandra', 'victoria'];
    const maleNames = ['juan', 'carlos', 'luis', 'pedro', 'javier', 'miguel', 'diego', 'andrés', 'pablo', 'daniel', 'alejandro', 'ricardo', 'jorge', 'raúl', 'sergio', 'fernando', 'gabriel', 'roberto', 'eduardo', 'sebastián'];
    
    const lowerName = name.toLowerCase();
    
    // Buscar coincidencias exactas o parciales
    for (let female of femaleNames) {
        if (lowerName.includes(female) || female.includes(lowerName)) return 'female';
    }
    
    for (let male of maleNames) {
        if (lowerName.includes(male) || male.includes(lowerName)) return 'male';
    }
    
    return 'neutral';
}

// Función principal de generación de lectura
async function generateReading() {
    const name = nameInput.value.trim();
    const birthDate = dateInput.value;
    
    if (!name || !birthDate) {
        alert('Los astros necesitan tus datos.');
        return;
    }
    
    // Detectar género para personalización
    userGender = detectGender(name);
    
    // Mostrar loader
    loader.style.display = 'block';
    
    try {
        // Usar API REST
        const response = await fetch('/api/leer-destino', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                dateStr: birthDate,
                gender: userGender
            })
        });
        
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        
        const data = await response.json();
        displayResults(data, name);
        
    } catch (error) {
        console.error('Error generando lectura:', error);
        alert('Error de conexión con el universo. Intenta nuevamente.');
    } finally {
        loader.style.display = 'none';
    }
}

// Mostrar resultados en la interfaz
function displayResults(data, name) {
    currentReading = data;
    currentReading.name = name; // Guardar nombre para WhatsApp
    
    // Saludo personalizado
    const greetingName = document.getElementById('greetingName');
    greetingName.textContent = name.toUpperCase();
    
    // Establecer fecha de generación
    const generationDate = document.getElementById('generationDate');
    if (generationDate) {
        generationDate.textContent = new Date().toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }
    
    // Resultados astrológicos
    document.getElementById('zodiacRes').textContent = data.zodiac;
    document.getElementById('moonRes').textContent = data.moon;
    
    // Tarot
    document.getElementById('tarotName').textContent = data.tarotName;
    document.getElementById('tarotMeaning').textContent = data.tarotMeaning;
    
    // Música personalizada según género
    const musicRes = document.getElementById('musicRes');
    if (data.music) {
        musicRes.textContent = `🎵 ${data.music}`;
    }
    
    // Mensaje diario
    const dailyMsg = document.getElementById('dailyHoroscope');
    if (data.phrase) {
        dailyMsg.textContent = `"${data.phrase}"`;
    }
    
    // Cambiar vista
    inputForm.style.display = 'none';
    results.style.display = 'block';
    
    // Efecto de aparición suave
    mainCard.style.animation = 'fadeIn 1s ease-in';
}

// Función para compartir lectura
async function shareReading() {
    if (!currentReading) return;
    
    try {
        const captureZone = document.getElementById('captureZone');
        const btn = document.querySelector('.btn-social');
        const originalText = btn.innerText;
        btn.innerText = "⏳ Generando magia...";
        
        // Resetear scroll completamente
        document.getElementById('results').scrollTop = 0;
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        
        // Esperar a que se estabilice el DOM
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Captura con configuración precisa
        const canvas = await html2canvas(captureZone, {
            backgroundColor: null, // Usar fondo transparente del elemento
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            // Dimensiones exactas del contenido visible
            width: captureZone.offsetWidth,
            height: captureZone.offsetHeight,
            // Sin scroll ni offsets
            scrollX: 0,
            scrollY: 0,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            x: 0,
            y: 0,
            // Opciones adicionales para precisión
            removeContainer: false,
            foreignObjectRendering: false
        });
        
        // Convertir y descargar
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MiLecturaCosmos.png`;
            a.click();
            URL.revokeObjectURL(url);
            
            btn.innerText = "✅ ¡Lista para subir!";
            setTimeout(() => { btn.innerText = originalText; }, 3000);
        });
        
    } catch (error) {
        console.error('Error al compartir:', error);
        alert('Error al generar imagen para compartir');
        const btn = document.querySelector('.btn-social');
        btn.innerText = "📸 Descargar Foto para Historia";
    }
}

// Función para compartir por WhatsApp (Con tu link)
function shareToWhatsApp() {
    if (!currentReading) return;
    
    try {
        const urlSitio = "https://squad-io-ariel.onrender.com"; 

        const message = `✨ *LECTURA CÓSMICA DE ${currentReading.name?.toUpperCase() || 'TÍ'}* ✨\n\n` +
            `🌟 *Esencia Astral*: ${currentReading.zodiac} | ${currentReading.moon}\n` +
            `🎴 *Tarot del Día*: ${currentReading.tarotName}\n` +
            `🎵 *Vibra Musical*: ${currentReading.music}\n\n` +
            `💫 *Mensaje del Cosmos*: "${currentReading.phrase}"\n\n` +
            `🔮 *Descubre tu propio destino aquí*: ${urlSitio}`;
        
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        
    } catch (error) {
        console.error('Error al compartir por WhatsApp:', error);
        alert('Error al compartir por WhatsApp');
    }
}

// Función para nueva lectura
function newReading() {
    currentReading = null;
    userGender = null;
    results.style.display = 'none';
    inputForm.style.display = 'block';
    nameInput.value = '';
    dateInput.value = '';
}

// --- FUNCIONES DE MONETIZACIÓN ---

// Opción A: Venta Directa por WhatsApp
function requestPremiumReading() {
    if (!currentReading) return;
    
    const tuNumero = "56966959800"; 
    
    const text = `Hola! Vengo de Cosmos ✨. Me gustaría solicitar mi Carta Astral Profunda y Personalizada por $5.000. Mi nombre es ${currentReading.name} y nací el ${document.getElementById('dateInput').value}. ¿Cuáles son los datos para transferir?`;
    
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${tuNumero}?text=${encoded}`, '_blank');
}

// Opción B: Propina / Café
function sendTip() {
    // AQUÍ PONDRÁS TU LINK DE MERCADOPAGO, MACH O KO-FI
    const linkPropina = "https://link.mercadopago.cl/tu-link-aqui"; 
    window.open(linkPropina, '_blank');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Añadir fecha máxima (hoy)
    const today = new Date().toISOString().split('T')[0];
    dateInput.max = today;
    
    console.log('🌌 Aplicación Cosmos lista con fondo espacial espectacular');
});

// Exportar funciones para uso global
window.generateReading = generateReading;
window.shareReading = shareReading;
window.shareToWhatsApp = shareToWhatsApp;
window.newReading = newReading;