// static/js/simulation.js

// Variables globales y contexto del canvas
let canvas = document.getElementById("simCanvas");
let ctx = canvas.getContext("2d");
let cellSize = 10;
let padding = 10;
let simulationInterval = null;

// ====================
// Funciones de UI (Botones y Sliders)
// ====================

/**
 * Actualiza el valor mostrado junto a un slider.
 * @param {string} sliderId - ID del slider.
 * @param {string} outputId - ID del elemento donde se muestra el valor.
 */
function updateSliderValue(sliderId, outputId) {
    let slider = document.getElementById(sliderId);
    let output = document.getElementById(outputId);
    output.innerText = slider.value;
}

/**
 * Actualiza los límites máximos de los inputs de la fuente (source_x y source_y)
 * según los valores actuales de width y height.
 */
function updateSourceLimits() {
    let width = parseInt(document.getElementById("width").value);
    let height = parseInt(document.getElementById("height").value);
    let sourceXInput = document.getElementById("source_x");
    let sourceYInput = document.getElementById("source_y");

    sourceXInput.max = width;
    sourceYInput.max = height;

    let sourceX = parseInt(sourceXInput.value);
    let sourceY = parseInt(sourceYInput.value);
    if (sourceX > width) {
        sourceXInput.value = Math.floor(width / 2);
    }
    if (sourceY > height) {
        sourceYInput.value = Math.floor(height / 2);
    }
}

/**
 * Centra la fuente de calor según el ancho y alto de la placa.
 */
function centerSource() {
    let width = parseInt(document.getElementById("width").value);
    let height = parseInt(document.getElementById("height").value);
    let centerX = Math.floor(width / 2);
    let centerY = Math.floor(height / 2);
    document.getElementById("source_x").value = centerX;
    document.getElementById("source_y").value = centerY;
}

// Inicializar límites de fuente al cargar y cuando cambien width/height
document.getElementById("width").addEventListener("change", updateSourceLimits);
document.getElementById("height").addEventListener("change", updateSourceLimits);
updateSourceLimits();

/**
 * Establece el estado (habilitado/deshabilitado) de los botones.
 * @param {Object} states - Objeto con propiedades start, pause, resume, graph, restart (true: habilitado).
 */
function setButtonStates(states) {
    document.getElementById("startBtn").disabled = !states.start;
    document.getElementById("pauseBtn").disabled = !states.pause;
    document.getElementById("resumeBtn").disabled = !states.resume;
    document.getElementById("graphBtn").disabled = !states.graph;
    document.getElementById("restartBtn").disabled = !states.restart;
}

// ====================
// Funciones de Comunicación con el Backend
// ====================

/**
 * Inicia la simulación, validando los parámetros antes de enviarlos.
 */
function startSimulation() {
    // Extraer y convertir parámetros
    let width = parseInt(document.getElementById("width").value);
    let height = parseInt(document.getElementById("height").value);
    let alpha = parseFloat(document.getElementById("material").value);
    let heat_temp = parseFloat(document.getElementById("heat_temp").value);
    let ambient = parseFloat(document.getElementById("ambient").value);
    let sim_speed = parseFloat(document.getElementById("sim_speed_slider").value);
    let source_x = parseInt(document.getElementById("source_x").value);
    let source_y = parseInt(document.getElementById("source_y").value);
    let dx = parseFloat(document.getElementById("dx_slider").value);
    let dt = parseFloat(document.getElementById("dt_slider").value);
    let boundary = document.getElementById("boundary").value;

    // Validar posición de la fuente
    if (source_x > width) {
        alert("La posición de la fuente (X) excede el ancho de la placa. El valor máximo es " + width + ".");
        return;
    }
    if (source_y > height) {
        alert("La posición de la fuente (Y) excede el alto de la placa. El valor máximo es " + height + ".");
        return;
    }

    // Validar dt según la condición de estabilidad: dt_max = safetyFactor * dx^2/(4*alpha)
    let safetyFactor = 0.9;
    let dt_max = safetyFactor * (dx * dx) / (4 * alpha);
    if (dt > dt_max) {
        alert("El paso de tiempo (dt) es demasiado grande para la resolución espacial y el coeficiente térmico seleccionados.\n" +
              "Por favor, reduzca dt o aumente dx.\n" +
              "dt_max aproximado: " + dt_max.toFixed(4));
        return;
    }

    // Actualizar estado de botones: desactivar "Iniciar" y "Reanudar", activar "Pausar" y "Reiniciar"
    setButtonStates({ start: false, pause: true, resume: false, graph: false, restart: true });

    fetch("/start", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            width: width,
            height: height,
            alpha: alpha,
            heat_temp: heat_temp,
            ambient: ambient,
            sim_speed: sim_speed,
            source_x: source_x,
            source_y: source_y,
            dx: dx,
            dt: dt,
            boundary: boundary
        })
    })
    .then(response => response.json())
    .then(data => {
        if (simulationInterval) clearInterval(simulationInterval);
        simulationInterval = setInterval(getStatus, 100);
    });
}

/**
 * Envía una solicitud para pausar la simulación.
 */
function pauseSimulation() {
    fetch("/pause", { method: "POST" })
    .then(response => response.json())
    .then(data => {
        setButtonStates({ start: false, pause: false, resume: true, graph: false, restart: true });
    });
}

/**
 * Envía una solicitud para reanudar la simulación.
 */
function resumeSimulation() {
    fetch("/resume", { method: "POST" })
    .then(response => response.json())
    .then(data => {
        setButtonStates({ start: false, pause: true, resume: false, graph: false, restart: true });
    });
}

/**
 * Reinicia la simulación recargando la página.
 */
function restartSimulation() {
    location.reload();
}

/**
 * Consulta el estado actual de la simulación y actualiza la interfaz.
 */
function getStatus() {
    fetch("/status")
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            clearInterval(simulationInterval);
            return;
        }
        drawSimulation(data.matrix);
        document.getElementById("percentage").innerText = "Área Calentada: " + data.percentage.toFixed(1) + "%";
        document.getElementById("time").innerText = "Tiempo: " + data.time.toFixed(1) + " s";
        if (!data.running) {
            clearInterval(simulationInterval);
            setButtonStates({ start: false, pause: false, resume: false, graph: true, restart: true });
            alert("Simulación finalizada: El calor se ha distribuido uniformemente.");
        }
    });
}

// ====================
// Funciones de Dibujo y Mapeo de Colores
// ====================

/**
 * Dibuja la simulación en el canvas.
 * @param {Array} matrix - Matriz de temperaturas.
 */
function drawSimulation(matrix) {
    let rows = matrix.length;
    let cols = matrix[0].length;
    canvas.width = cols * cellSize + 2 * padding;
    canvas.height = rows * cellSize + 2 * padding;

    let ambient = parseFloat(document.getElementById("ambient").value);
    let heat_temp = parseFloat(document.getElementById("heat_temp").value);

    for (let i = 0; i < rows; i++){
        for (let j = 0; j < cols; j++){
            let temp = matrix[i][j];
            let t_norm = (temp - ambient) / (heat_temp - ambient);
            t_norm = Math.min(Math.max(t_norm, 0), 1);
            let color = temperatureToColor(t_norm);
            ctx.fillStyle = color;
            ctx.fillRect(padding + j * cellSize, padding + i * cellSize, cellSize, cellSize);
        }
    }
}

/**
 * Mapea el valor normalizado de temperatura (entre 0 y 1) a un color RGB.
 * La función define varios tramos para diferenciar mejor las temperaturas altas.
 * @param {number} t_norm - Valor normalizado.
 * @returns {string} - Cadena de color en formato RGB.
 */
function temperatureToColor(t_norm) {
    t_norm = Math.max(0, Math.min(1, t_norm));
    let r, g, b;
    
    if (t_norm <= 0.25) {
        // De azul (0,0,255) a cian (0,255,255)
        let ratio = t_norm / 0.25;
        r = 0;
        g = Math.floor(ratio * 255);
        b = 255;
    } else if (t_norm <= 0.5) {
        // De cian (0,255,255) a verde (0,255,0)
        let ratio = (t_norm - 0.25) / 0.25;
        r = 0;
        g = 255;
        b = Math.floor((1 - ratio) * 255);
    } else if (t_norm <= 0.75) {
        // De verde (0,255,0) a amarillo (255,255,0)
        let ratio = (t_norm - 0.5) / 0.25;
        r = Math.floor(ratio * 255);
        g = 255;
        b = 0;
    } else if (t_norm <= 0.9) {
        // De amarillo (255,255,0) a naranja intermedio (255,180,0)
        let ratio = (t_norm - 0.75) / 0.15;
        r = 255;
        g = Math.floor(255 - ratio * (255 - 180));
        b = 0;
    } else {
        // De naranja intermedio (255,180,0) a rojo (255,0,0)
        let ratio = (t_norm - 0.9) / 0.1;
        r = 255;
        g = Math.floor(180 - ratio * 180);
        b = 0;
    }
    return "rgb(" + r + "," + g + "," + b + ")";
}

/**
 * Abre la ventana de gráficas.
 */
function showGraph() {
    window.open("/graph", "_blank");
}