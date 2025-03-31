# simulation_engine.py
import numpy as np

class SimulationEngine:
    def __init__(self, width=50, height=50, alpha=0.1, heat_temp=100.0, ambient=20.0, dx=1.0, dt=0.1, source_x=None, source_y=None, boundary="Neumann"):
        self.width = width
        self.height = height
        self.alpha = alpha
        self.heat_temp = heat_temp
        self.ambient = ambient
        self.dx = dx
        self.dt = dt
        
        self.T = np.full((height, width), ambient, dtype=np.float64)
        
        # Inicializa la placa con la temperatura ambiente
        if source_x is None:
            source_x = width // 2
        if source_y is None:
            source_y = height // 2
        self.source_pos = (source_y, source_x)  # Recordar: fila (Y), columna (X)
        
        # Inicializar la fuente de calor
        self.T[self.source_pos] = heat_temp
        
        self.percentage_history = []
        self.time_history = []
        self.current_time = 0.0
        
        # Umbral para considerar una celda "calentada"
        self.threshold = ambient + 0.95 * (heat_temp - ambient)
        
        # Condición de contorno: "Dirichlet" o "Neumann"
        self.boundary = boundary
        
        # Flags de control
        self.running = False
        self.paused = False
        self.sim_speed = 1.0
        
    def step(self):
        """Realiza un paso de la simulación usando diferencias finitas."""
        T_new = self.T.copy()
        
        # Actualización de celdas interiores con el esquema de diferencias finitas
        T_new[1:-1, 1:-1] = self.T[1:-1, 1:-1] + self.dt * self.alpha * (
            (self.T[2:, 1:-1] + self.T[:-2, 1:-1] +
            self.T[1:-1, 2:] + self.T[1:-1, :-2] - 4 * self.T[1:-1, 1:-1])
            / (self.dx ** 2)
        )
        
        # Aplicar condiciones de contorno según el modo seleccionado
        if self.boundary == "Neumann":
            # Condiciones Neumann (aisladas): copiar celda adyacente
            T_new[0, :] = T_new[1, :]
            T_new[-1, :] = T_new[-2, :]
            T_new[:, 0] = T_new[:, 1]
            T_new[:, -1] = T_new[:, -2]
        elif self.boundary == "Dirichlet":
            # Condiciones Dirichlet (fijas): fijar al valor ambiente
            T_new[0, :] = self.ambient
            T_new[-1, :] = self.ambient
            T_new[:, 0] = self.ambient
            T_new[:, -1] = self.ambient
        
        # Forzar la fuente de calor en el centro
        T_new[self.source_pos] = self.heat_temp
        self.T = T_new

        self.current_time += self.dt

        # Calcular el promedio normalizado (0% cuando toda la placa está a ambiente, 100% cuando alcanza la fuente)
        normalized = (self.T - self.ambient) / (self.heat_temp - self.ambient)
        # Aseguramos que los valores estén entre 0 y 1 y luego calculamos el promedio
        normalized = normalized.clip(0, 1)
        percentage = np.mean(normalized) * 100

        self.percentage_history.append(percentage)
        self.time_history.append(self.current_time)
        
            # Registro de la temperatura promedio
        avg_temp = np.mean(self.T)
        if not hasattr(self, 'avg_temp_history'):
            self.avg_temp_history = []
        self.avg_temp_history.append(avg_temp)
        
        return percentage