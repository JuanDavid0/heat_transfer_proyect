# app.py
from flask import Flask, render_template, request, jsonify
import threading, time

import matplotlib
from simulation_engine import SimulationEngine

app = Flask(__name__)

simulation = None
simulation_thread = None
simulation_lock = threading.Lock()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start_simulation():
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
    dx = float(params.get("dx", 1.0))  # nuevo parámetro
    dt = float(params.get("dt", 0.1))  # nuevo parámetro
    
    simulation = SimulationEngine(width=width, height=height, alpha=alpha,
                                  heat_temp=heat_temp, ambient=ambient, dx=dx, dt=dt, source_x=source_x, source_y=source_y )
    simulation.sim_speed = sim_speed
    simulation.running = True
    simulation.paused = False

    def run_simulation():
        while simulation.running:
            with simulation_lock:
                if not simulation.paused:
                    percentage = simulation.step()
                    if percentage >= 100:
                        simulation.running = False
                        break
            time.sleep(0.05 / sim_speed)
    
    simulation_thread = threading.Thread(target=run_simulation)
    simulation_thread.start()
    return jsonify({"status": "started"})

@app.route('/pause', methods=['POST'])
def pause_simulation():
    global simulation
    if simulation:
        with simulation_lock:
            simulation.paused = True
    return jsonify({"status": "paused"})

@app.route('/resume', methods=['POST'])
def resume_simulation():
    global simulation
    if simulation:
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

@app.route('/graph', methods=['GET'])
def show_graph():
    # Genera un gráfico con matplotlib y lo retorna como imagen en base64
    import io, base64, matplotlib.pyplot as plt
    matplotlib.use('Agg')  # Usar un backend no interactivo   
    global simulation
    if simulation:
        plt.figure()
        plt.plot(simulation.time_history, simulation.percentage_history, marker='o')
        plt.xlabel("Tiempo")
        plt.ylabel("Porcentaje de Área Calentada")
        plt.title("Evolución del Calor")
        plt.grid(True)
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        return f"<img src='data:image/png;base64,{image_base64}'/>"
    else:
        return "No hay datos de simulación disponibles"

if __name__ == '__main__':
    app.run(debug=True)
