// CLIENTE OPTIMIZADO PARA APLICACIÓN DE TAROT/ASTROLOGÍA

// --- UTILIDADES DE DETECCIÓN ---

// Detectar si el usuario está en Instagram WebView
function isInstagramWebView() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('instagram') || userAgent.includes('igweb');
}

// Eliminar emojis de un texto (para WhatsApp)
function removeEmojis(text) {
    if (!text) return text;
    
    // Regex moderna para eliminar todos los emojis y caracteres pictográficos
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Emoji}\u200D\uFE0F\uFE0F]/gu;
    
    // Eliminar emojis y espacios extra al final
    return text.replace(emojiRegex, '').trim();
}

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

// Detección de género avanzada (Heurística + Excepciones)
function detectGender(name) {
    if (!name || name.length < 2) return 'neutral';
    
    // 1. Limpiar el nombre: tomar solo el primer nombre, minúsculas, y quitar tildes
    const cleanName = name.trim().split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // 2. Diccionario de excepciones (Nombres que rompen las reglas de terminación)
    const femaleExceptions = new Set([
        'carmen', 'belen', 'luz', 'paz', 'beatriz', 'ines', 'raquel', 'ruth', 'ester', 'abigail',
        'rocio', 'consuelo', 'rosario', 'amparo', 'genesis', 'gladys', 'doris', 'miriam', 'elizabeth',
        'maite', 'guadalupe', 'irene', 'matilde', 'dulce', 'isabel', 'mar', 'sol', 'ariadna'
    ]);
    
    const maleExceptions = new Set([
        'jose', 'juan', 'luis', 'raul', 'javier', 'manuel', 'miguel', 'gabriel', 'daniel', 'david',
        'carlos', 'lucas', 'tomas', 'matias', 'nicolas', 'elias', 'jesus', 'marcos', 'andres',
        'felipe', 'jorge', 'vicente', 'enrique', 'eduardo', 'roberto', 'diego', 'hugo', 'borja',
        'bautista', 'luca', 'alexis', 'ariel', 'rene', 'noe'
    ]);
    
    // 3. Verificación exacta primero (para atrapar las excepciones)
    if (femaleExceptions.has(cleanName)) return 'female';
    if (maleExceptions.has(cleanName)) return 'male';
    
    // 4. Reglas heurísticas del idioma español
    const lastChar = cleanName.slice(-1);
    const lastTwoChars = cleanName.slice(-2);
    
    // Regla de oro femenina: casi todo lo que termina en 'a' es mujer (ya filtramos Lucas, Tomás, etc.)
    if (lastChar === 'a') return 'female';
    
    // Regla de oro masculina: casi todo lo que termina en 'o' es hombre (ya filtramos Rocío, Consuelo, etc.)
    if (lastChar === 'o') return 'male';
    
    // Terminaciones comunes masculinas: os, us, as (ej. Marcos, Jesus, Matias)
    if (['os', 'us', 'as'].includes(lastTwoChars)) return 'male';
    
    // Terminaciones en consonante comunes en hombres (r, n, l, s, d) (ej. Hector, Cristian, Fidel, Ulises, David)
    if (['r', 'n', 'l', 's', 'd'].includes(lastChar)) return 'male';
    
    // Si el nombre es muy extraño y no cae en nada de lo anterior, usamos neutral
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
        btn.innerText = "Generando magia...";
        
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
        
        // Convertir canvas a blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        
        // Detectar si estamos en Instagram WebView
        const isInstagram = isInstagramWebView();
        
        if (!isInstagram) {
            // Flujo normal para navegadores estándar
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MiLecturaCosmos.png`;
            a.click();
            URL.revokeObjectURL(url);
            
            btn.innerText = "¡Lista para subir!";
            setTimeout(() => { btn.innerText = originalText; }, 3000);
        } else {
            // Flujo especial para Instagram WebView
            await handleInstagramShare(blob, btn, originalText);
        }
        
    } catch (error) {
        console.error('Error al compartir:', error);
        alert('Error al generar imagen para compartir');
        const btn = document.querySelector('.btn-social');
        btn.innerText = "Descargar Foto para Historia";
    }
}

// Manejar compartido en Instagram WebView
async function handleInstagramShare(blob, btn, originalText) {
    try {
        // Intentar usar navigator.share() primero
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], 'MiLecturaCosmos.png', { type: 'image/png' });
            
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Mi Lectura Cósmica',
                    text: '¡Mira mi lectura astral personalizada!',
                    files: [file]
                });
                
                btn.innerText = "¡Compartido con éxito!";
                setTimeout(() => { btn.innerText = originalText; }, 3000);
                return;
            }
        }
        
        // Si navigator.share falla, mostrar imagen para descarga manual
        showImageForManualDownload(blob, btn, originalText);
        
    } catch (error) {
        console.log('navigator.share falló, mostrando imagen para descarga manual:', error);
        showImageForManualDownload(blob, btn, originalText);
    }
}

// Mostrar imagen para descarga manual en Instagram
function showImageForManualDownload(blob, btn, originalText) {
    const url = URL.createObjectURL(blob);
    
    // Crear modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    // Crear imagen
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = `
        max-width: 90%;
        max-height: 70%;
        border-radius: 10px;
        box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
        margin-bottom: 20px;
    `;
    
    // Crear mensaje de instrucción
    const message = document.createElement('div');
    message.style.cssText = `
        color: #d4af37;
        text-align: center;
        font-size: 16px;
        margin-bottom: 20px;
        line-height: 1.4;
    `;
    message.innerHTML = `
        <div style="margin-bottom: 10px;">⚠️ ¡Descarga directa bloqueada por Instagram!</div>
        <div style="font-size: 14px; color: #aaa;">📸 Saca un pantallazo (captura de pantalla) para guardar tu lectura y compartir tu resultado.</div>
    `;
    
    // Crear botón de cerrar
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cerrar';
    closeBtn.style.cssText = `
        background: linear-gradient(45deg, #d4af37, #b8860b);
        color: #000;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: bold;
    `;
    
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
        URL.revokeObjectURL(url);
        btn.innerText = originalText;
    };
    
    // Ensamblar modal
    modal.appendChild(img);
    modal.appendChild(message);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    // Actualizar texto del botón principal
    btn.innerText = "Mantén presionada la imagen";
}

// Función para compartir por WhatsApp
function shareToWhatsApp() {
    if (!currentReading) return;
    
    try {
        const urlSitio = "https://cosmos-astral.onrender.com"; 

        // Construir mensaje aplicando removeEmojis() a variables dinámicas
        const message = `¡Mira mi resultado en Cosmos Astral!\n\n` +
            `Nombre: ${removeEmojis(currentReading.name?.toUpperCase() || 'TI')}\n` +
            `Zodiaco: ${removeEmojis(currentReading.zodiac)}\n` +
            `Luna: ${removeEmojis(currentReading.moon)}\n` +
            `Tarot: ${removeEmojis(currentReading.tarotName)}\n` +
            `Mensaje: "${removeEmojis(currentReading.phrase)}"\n` +
            `Vibra musical: ${removeEmojis(currentReading.music)}\n\n` +
            `Descubre tu destino en: ${urlSitio}`;
        
        // Encoding robusto para Instagram WebView
        let encodedMessage;
        try {
            // Primero intentamos encoding normal
            encodedMessage = encodeURIComponent(message);
        } catch (encodingError) {
            // Fallback para caracteres problemáticos
            encodedMessage = encodeURIComponent(message.replace(/[^\x00-\x7F]/g, '?'));
        }
        
        // Abrir WhatsApp con URL segura
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
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
    
    const text = `Hola! Vengo de Cosmos ✨. Me gustaría solicitar mi Carta Astral Profunda y Personalizada por $1.200. Mi nombre es ${currentReading.name} y nací el ${document.getElementById('dateInput').value}. ¿Cuáles son los datos para transferir?`;
    
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${tuNumero}?text=${encoded}`, '_blank');
}

// Opción B: Propina / Café
function sendTip() {
    const linkPropina = "https://ko-fi.com/cosmosastral"; 
    window.open(linkPropina, '_blank');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Añadir fecha máxima (hoy)
    const today = new Date().toISOString().split('T')[0];
    dateInput.max = today;
    
    console.log('🌌 Aplicación Cosmos lista con fondo espacial espectacular');
});

// --- SISTEMA DE SUGERENCIAS (FEEDBACK) ---
function openFeedback() {
    document.getElementById('feedbackModal').style.display = 'flex';
}

function closeFeedback() {
    document.getElementById('feedbackModal').style.display = 'none';
}

async function submitFeedback(event) {
    event.preventDefault(); // Evita que la página recargue
    
    const btn = document.getElementById('feedbackSubmitBtn');
    const text = document.getElementById('feedbackText').value;
    const originalText = btn.innerText;
    
    btn.innerText = "⏳ Enviando...";
    btn.disabled = true;

    try {
        const formspreeLink = "https://formspree.io/f/mykndkpl"; 

        await fetch(formspreeLink, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sugerencia: text })
        });

        btn.innerText = "✅ ¡Gracias por tu idea!";
        btn.style.background = "linear-gradient(45deg, #25D366, #128C7E)"; // Se pone verde
        
        setTimeout(() => {
            closeFeedback();
            document.getElementById('feedbackText').value = ''; // Limpiamos la caja
            btn.innerText = originalText;
            btn.style.background = ""; // Vuelve a dorado
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        alert("Hubo un error al enviar tu sugerencia. Intenta de nuevo más tarde.");
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Exportar funciones para uso global
window.generateReading = generateReading;
window.shareReading = shareReading;
window.shareToWhatsApp = shareToWhatsApp;
window.newReading = newReading;