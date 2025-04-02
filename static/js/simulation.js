// static/js/simulation.js

let canvas = document.getElementById("simCanvas");
// Agrega listeners para actualizar dinámicamente los límites cuando cambien los inputs de ancho y alto
document.getElementById("width").addEventListener("change", updateSourceLimits);
document.getElementById("height").addEventListener("change", updateSourceLimits);

let ctx = canvas.getContext("2d");
let cellSize = 10;
let padding = 10;
let simulationInterval = null;

// Llamar una vez al inicio para establecer los límites correctamente
updateSourceLimits();


function setButtonStates(states) {
    // states: objeto con propiedades start, pause, resume, graph, restart (true: enabled, false: disabled)
    document.getElementById("startBtn").disabled = !states.start;
    document.getElementById("pauseBtn").disabled = !states.pause;
    document.getElementById("resumeBtn").disabled = !states.resume;
    document.getElementById("graphBtn").disabled = !states.graph;
    document.getElementById("restartBtn").disabled = !states.restart;
}

// Función para actualizar el valor mostrado junto a un slider
function updateSliderValue(sliderId, outputId) {
    let slider = document.getElementById(sliderId);
    let output = document.getElementById(outputId);
    output.innerText = slider.value;
}

function centerSource() {
    // Obtener los valores de ancho y alto
    let width = parseInt(document.getElementById("width").value);
    let height = parseInt(document.getElementById("height").value);

    // Calcular la posición central
    let centerX = Math.floor(width / 2);
    let centerY = Math.floor(height / 2);

    // Actualizar los inputs de la posición de la fuente
    document.getElementById("source_x").value = centerX;
    document.getElementById("source_y").value = centerY;
}

function startSimulation() {
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

    // Validar que la posición de la fuente no exceda las dimensiones de la placa
    if (source_x > width) {
        alert("La posición de la fuente (X) excede el ancho de la placa. El valor máximo es " + width + ".");
        return;
    }
    if (source_y > height) {
        alert("La posición de la fuente (Y) excede el alto de la placa. El valor máximo es " + height + ".");
        return;
    }

    // Calcula dt_max con un factor de seguridad
    let safetyFactor = 0.9;
    let dt_max = safetyFactor * (dx * dx) / (4 * alpha);

    // Verifica que el dt seleccionado sea menor o igual al valor máximo permitido
    if (dt > dt_max) {
        alert("El paso de tiempo (dt) es demasiado grande para la resolución espacial y el coeficiente térmico seleccionados.\n" +
            "Por favor, reduzca dt o aumente dx.\n" +
            "dt_max aproximado: " + dt_max.toFixed(4));
        return; // No se inicia la simulación
    }

    setButtonStates({start: false, pause: true, resume: false, graph: false, restart: true});

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

function pauseSimulation() {
    fetch("/pause", { method: "POST" })
    .then(response => response.json())
    .then(data => {
        setButtonStates({start: false, pause: false, resume: true, graph: false, restart: true});
    });
}

function resumeSimulation() {
    fetch("/resume", { method: "POST" })
    .then(response => response.json())
    .then(data => {
        setButtonStates({start: false, pause: true, resume: false, graph: false, restart: true});
    });
}

function restartSimulation() {
    location.reload();
}

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
                setButtonStates({start: false, pause: false, resume: false, graph: true, restart: true});
                alert("Simulación finalizada: El calor se ha distribuido uniformemente.");
            }
        });
}

function drawSimulation(matrix) {
    let rows = matrix.length;
    let cols = matrix[0].length;
    canvas.width = cols * cellSize + 2 * padding;
    canvas.height = rows * cellSize + 2 * padding;

    let ambient = parseFloat(document.getElementById("ambient").value);
    let heat_temp = parseFloat(document.getElementById("heat_temp").value);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let temp = matrix[i][j];
            let t_norm = (temp - ambient) / (heat_temp - ambient);
            t_norm = Math.min(Math.max(t_norm, 0), 1);
            let color = temperatureToColor(t_norm);
            ctx.fillStyle = color;
            ctx.fillRect(padding + j * cellSize, padding + i * cellSize, cellSize, cellSize);
        }
    }
}

function temperatureToColor(t_norm) {
    // Aseguramos que t_norm esté en el rango [0, 1]
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
        let ratio = (t_norm - 0.75) / 0.15; // subintervalo de 0.75 a 0.9
        r = 255;
        // Interpolación de verde: de 255 a 180
        g = Math.floor(255 - ratio * (255 - 180));
        b = 0;
    } else {
        // De naranja intermedio (255,180,0) a rojo (255,0,0)
        let ratio = (t_norm - 0.9) / 0.1; // subintervalo de 0.9 a 1.0
        r = 255;
        // Interpolación de verde: de 180 a 0
        g = Math.floor(180 - ratio * 180);
        b = 0;
    }
    
    return "rgb(" + r + "," + g + "," + b + ")";
}


function showGraph() {
    window.open("/graph", "_blank");
}

function updateSourceLimits() {
    let width = parseInt(document.getElementById("width").value);
    let height = parseInt(document.getElementById("height").value);
    let sourceXInput = document.getElementById("source_x");
    let sourceYInput = document.getElementById("source_y");
    
    // Establece el valor máximo de source_x y source_y basado en width y height
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