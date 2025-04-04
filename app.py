from flask import Flask, render_template, request, jsonify
import threading, time
import matplotlib
matplotlib.use('Agg')
from simulation_engine import SimulationEngine
import matplotlib.pyplot as plt
import io, base64

app = Flask(__name__)

simulation = None
simulation_thread = None
simulation_lock = threading.Lock()

@app.route('/')
def index():
    return render_template('index.html')

def run_simulation_thread(sim_speed):
    global simulation
    # Ejecuta el ciclo de simulación en un hilo
    while simulation.running:
        with simulation_lock:
            if not simulation.paused:
                percentage = simulation.step()
                if percentage >= 99.0:
                    simulation.running = False
                    break
        time.sleep(0.05 / simulation.sim_speed)

@app.route('/start', methods=['POST'])
def start_simulation_endpoint():
    global simulation, simulation_thread
    params = request.json
    width = int(params.get("width", 50))
    height = int(params.get("height", 50))
    alpha = float(params.get("alpha", 0.1))
    heat_temp = float(params.get("heat_temp", 100.0))
    ambient = float(params.get("ambient", 20.0))
    sim_speed = float(params.get("sim_speed", 1.0))
    source_x = int(params.get("source_x", width // 2))
    source_y = int(params.get("source_y", height // 2))
    dx = float(params.get("dx", 1.0))
    dt = float(params.get("dt", 0.1))
    boundary = params.get("boundary", "Neumann")
    
    simulation = SimulationEngine(width=width, height=height, alpha=alpha,
                                  heat_temp=heat_temp, ambient=ambient,
                                  dx=dx, dt=dt, source_x=source_x,
                                  source_y=source_y, boundary=boundary)
    simulation.sim_speed = sim_speed
    simulation.running = True
    simulation.paused = False

    simulation_thread = threading.Thread(target=run_simulation_thread, args=(sim_speed,))
    simulation_thread.start()
    return jsonify({"status": "started"})

@app.route('/pause', methods=['POST'])
def pause_simulation_endpoint():
    global simulation
    if simulation:
        with simulation_lock:
            simulation.paused = True
    return jsonify({"status": "paused"})

@app.route('/resume', methods=['POST'])
def resume_simulation():
    global simulation
    if simulation:
        data = request.get_json()
        if data and "sim_speed" in data:
            simulation.sim_speed = float(data["sim_speed"])  # Actualizar la velocidad en la simulación
        with simulation_lock:
            simulation.paused = False
    return jsonify({"status": "resumed"})

@app.route('/status', methods=['GET'])
def get_status():
    global simulation
    if simulation:
        with simulation_lock:
            return jsonify({
                "matrix": simulation.T.tolist(),
                "percentage": simulation.percentage_history[-1] if simulation.percentage_history else 0,
                "time": simulation.current_time,
                "running": simulation.running,
                "paused": simulation.paused
            })
    else:
        return jsonify({"error": "No simulation running"})

def generate_graph_image(fig):
    """Convierte una figura matplotlib en una cadena base64."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

@app.route('/graph', methods=['GET'])
def show_graph():
    global simulation
    # Asegurarse de que la simulación haya finalizado
    if simulation is None or simulation.running:
        return "La simulación aún no ha finalizado.", 400

    images = {}

    # Gráfico 1: Evolución de la Temperatura Promedio vs. Tiempo
    fig1 = plt.figure(figsize=(5, 4))
    plt.plot(simulation.time_history, simulation.avg_temp_history, marker='o', color='blue')
    plt.xlabel("Tiempo (s)")
    plt.ylabel("Temperatura Promedio (°C)")
    plt.title("Evolución de la Temperatura Promedio")
    plt.tight_layout()
    images['avg_temp'] = generate_graph_image(fig1)

    # Gráfico 2: Evolución del Área Calentada vs. Tiempo
    fig2 = plt.figure(figsize=(5, 4))
    plt.plot(simulation.time_history, simulation.percentage_history, marker='o', color='red')
    plt.xlabel("Tiempo (s)")
    plt.ylabel("Área Calentada (%)")
    plt.title("Evolución del Área Calentada")
    plt.tight_layout()
    images['area_percentage'] = generate_graph_image(fig2)

    # Gráfico 3: Histograma de la Distribución de Temperaturas Final
    fig3 = plt.figure(figsize=(5, 4))
    plt.hist(simulation.T.flatten(), bins=20, color='orange', edgecolor='black')
    plt.xlabel("Temperatura (°C)")
    plt.ylabel("Número de celdas")
    plt.title("Histograma de Temperaturas")
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    images['histogram'] = generate_graph_image(fig3)

    # Gráfico 4: Mapa de Calor Final
    fig4 = plt.figure(figsize=(5, 4))
    plt.imshow(simulation.T, cmap='hot', origin='lower')
    plt.colorbar(label="Temperatura (°C)")
    plt.title("Mapa de Calor Final")
    plt.tight_layout()
    images['heatmap'] = generate_graph_image(fig4)

    # Renderiza la plantilla 'graph.html' pasando el diccionario de imágenes
    return render_template("graph.html", images=images)

if __name__ == '__main__':
    app.run(debug=True)
