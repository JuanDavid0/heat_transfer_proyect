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
    let sim_speed = document.getElementById("sim_speed").value;
    
    fetch("/start", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            width: width,
            height: height,
            alpha: alpha,
            heat_temp: heat_temp,
            sim_speed: sim_speed
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
    for(let i = 0; i < rows; i++){
        for(let j = 0; j < cols; j++){
            let temp = matrix[i][j];
            // Suponiendo una temperatura ambiente de 20 y fuente en 100
            let t_norm = (temp - 20) / (100 - 20);
            t_norm = Math.min(Math.max(t_norm, 0), 1);
            let color = temperatureToColor(t_norm);
            ctx.fillStyle = color;
            ctx.fillRect(padding + j * cellSize, padding + i * cellSize, cellSize, cellSize);
        }
    }
}

function temperatureToColor(t_norm) {
    let r, g, b;
    if (t_norm < 0.5) {
        // De azul a cian
        let ratio = t_norm / 0.5;
        r = 0;
        g = Math.floor(ratio * 255);
        b = 255;
    } else if (t_norm < 0.8) {
        // De cian a amarillo
        let ratio = (t_norm - 0.5) / 0.3;
        r = Math.floor(ratio * 255);
        g = 255;
        b = Math.floor((1 - ratio) * 255);
    } else {
        // De amarillo a rojo
        let ratio = (t_norm - 0.8) / 0.2;
        r = 255;
        g = Math.floor((1 - ratio) * 255);
        b = 0;
    }
    return "rgb(" + r + "," + g + "," + b + ")";
}

function showGraph() {
    window.open("/graph", "_blank");
}
