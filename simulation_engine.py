# simulation_engine.py
import numpy as np

class SimulationEngine:
    def __init__(self, width=50, height=50, alpha=0.1, heat_temp=100.0, ambient=20.0, dx=1.0, dt=0.1):
        self.width = width
        self.height = height
        self.alpha = alpha
        self.heat_temp = heat_temp
        self.ambient = ambient
        self.dx = dx
        self.dt = dt
        
        # Inicializa la placa con la temperatura ambiente
        self.T = np.full((height, width), ambient, dtype=np.float64)
        self.center = (height // 2, width // 2)
        self.T[self.center] = heat_temp
        
        self.percentage_history = []
        self.time_history = []
        self.current_time = 0.0
        
        # Umbral para considerar una celda "calentada"
        self.threshold = ambient + 0.99 * (heat_temp - ambient)
        
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
        
        # Imponer condiciones de contorno Neumann (aisladas)
        T_new[0, :] = T_new[1, :]
        T_new[-1, :] = T_new[-2, :]
        T_new[:, 0] = T_new[:, 1]
        T_new[:, -1] = T_new[:, -2]
        
        # Forzar la fuente de calor en el centro
        T_new[self.center] = self.heat_temp
        self.T = T_new

        self.current_time += self.dt

        # Calcular porcentaje de celdas que alcanzan el umbral
        heated_cells = (self.T >= self.threshold).sum()
        total_cells = self.width * self.height
        percentage = (heated_cells / total_cells) * 100
        self.percentage_history.append(percentage)
        self.time_history.append(self.current_time)
        return percentage
