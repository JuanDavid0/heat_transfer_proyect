// static/js/simulation.js
let canvas = document.getElementById("simCanvas");
let ctx = canvas.getContext("2d");
let cellSize = 10;
let padding = 10;
let simulationInterval = null;

function startSimulation() {
    let width = document.getElementById("width").value;
    let height = document.getElementById("height").value;
    let alpha = document.getElementById("material").value;
    let heat_temp = document.getElementById("heat_temp").value;
    let ambient = document.getElementById("ambient").value;
    let sim_speed = document.getElementById("sim_speed").value;
    let source_x = document.getElementById("source_x").value;
    let source_y = document.getElementById("source_y").value;
    let dx = document.getElementById("dx").value; // nuevo campo
    let dt = document.getElementById("dt").value; // nuevo campo
    let boundary = document.getElementById("boundary").value;
    
    fetch("/start", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
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
        console.log(data);
        if(simulationInterval) clearInterval(simulationInterval);
        simulationInterval = setInterval(getStatus, 100);
    });
}

function pauseSimulation() {
    fetch("/pause", { method: "POST" })
    .then(response => response.json())
    .then(data => console.log(data));
}

function resumeSimulation() {
    fetch("/resume", { method: "POST" })
    .then(response => response.json())
    .then(data => console.log(data));
}

function getStatus() {
    fetch("/status")
    .then(response => response.json())
    .then(data => {
        if(data.error) {
            clearInterval(simulationInterval);
            return;
        }
        drawSimulation(data.matrix);
        document.getElementById("percentage").innerText = "Área Calentada: " + data.percentage.toFixed(1) + "%";
        document.getElementById("time").innerText = "Tiempo: " + data.time.toFixed(1) + " s";
        if(!data.running) {
            clearInterval(simulationInterval);
            alert("Simulación finalizada: El calor se ha distribuido uniformemente.");
        }
    });
}

function drawSimulation(matrix) {
    let rows = matrix.length;
    let cols = matrix[0].length;
    
    canvas.width = cols * cellSize + 2 * padding;
    canvas.height = rows * cellSize + 2 * padding;
    
    // Suponiendo que la temperatura ambiente y de la fuente son fijas (20 y, por ejemplo, 200)
    let ambient = 20;
    let heat_temp = 200;
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let temp = matrix[i][j];
            // Normalización fija: con ambient y heat_temp
            let t_norm = (temp - ambient) / (heat_temp - ambient);
            t_norm = Math.min(Math.max(t_norm, 0), 1);
            let color = temperatureToColor(t_norm);
            ctx.fillStyle = color;
            ctx.fillRect(padding + j * cellSize, padding + i * cellSize, cellSize, cellSize);
        }
    }
}

function temperatureToColor(t_norm) {
    t_norm = Math.max(0, Math.min(1, t_norm));
    let r, g, b;
    if (t_norm < 0.5) {
        let ratio = t_norm / 0.5;
        r = 0;
        g = Math.floor(ratio * 255);
        b = 255;
    } else if (t_norm < 0.8) {
        let ratio = (t_norm - 0.5) / (0.8 - 0.5);
        r = Math.floor(ratio * 255);
        g = 255;
        b = Math.floor((1 - ratio) * 255);
    } else {
        let ratio = (t_norm - 0.8) / (1 - 0.8);
        r = 255;
        g = Math.floor((1 - ratio) * 255);
        b = 0;
    }
    return "rgb(" + r + "," + g + "," + b + ")";
}

function showGraph() {
    window.open("/graph", "_blank");
}
