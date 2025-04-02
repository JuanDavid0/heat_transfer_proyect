import numpy as np

class SimulationEngine:
    def __init__(self, width=50, height=50, alpha=0.1, heat_temp=100.0, ambient=20.0,
                 dx=1.0, dt=0.1, source_x=None, source_y=None, boundary="Neumann"):
        self.width = width
        self.height = height
        self.alpha = alpha
        self.heat_temp = heat_temp
        self.ambient = ambient
        self.dx = dx
        self.dt = dt
        self.boundary = boundary

        # Inicializar la malla con la temperatura ambiente
        self.T = np.full((height, width), ambient, dtype=np.float64)

        # Establecer la posición de la fuente; si no se indica, se ubica en el centro
        if source_x is None:
            source_x = width // 2
        if source_y is None:
            source_y = height // 2
        self.source_pos = (source_y, source_x)  # Notar: fila (Y), columna (X)

        # Forzar la fuente de calor en la malla
        self.T[self.source_pos] = heat_temp

        # Historiales de simulación
        self.percentage_history = []
        self.time_history = []
        self.avg_temp_history = []
        self.current_time = 0.0

        # Umbral (opcional)
        self.threshold = ambient + 0.95 * (heat_temp - ambient)

        # Flags de control
        self.running = False
        self.paused = False
        self.sim_speed = 1.0

    def _update_interior(self, T):
        """Actualiza las celdas interiores usando diferencias finitas."""
        T[1:-1, 1:-1] = T[1:-1, 1:-1] + self.dt * self.alpha * (
            (T[2:, 1:-1] + T[:-2, 1:-1] +
             T[1:-1, 2:] + T[1:-1, :-2] - 4 * T[1:-1, 1:-1])
            / (self.dx ** 2)
        )
        return T

    def _apply_boundary_conditions(self, T):
        """Aplica las condiciones de contorno según el modo seleccionado."""
        if self.boundary == "Neumann":
            # Condiciones Neumann: copiar el valor de la celda adyacente
            T[0, :] = T[1, :]
            T[-1, :] = T[-2, :]
            T[:, 0] = T[:, 1]
            T[:, -1] = T[:, -2]
        elif self.boundary == "Dirichlet":
            # Condiciones Dirichlet: fijar al valor ambiente
            T[0, :] = self.ambient
            T[-1, :] = self.ambient
            T[:, 0] = self.ambient
            T[:, -1] = self.ambient
        return T

    def _force_source(self, T):
        """Forza la temperatura de la fuente en la posición definida."""
        T[self.source_pos] = self.heat_temp
        return T

    def _compute_percentage(self):
        """
        Calcula el porcentaje de "calentamiento" basado en la normalización de la malla.
        Se asume 0% si la placa está a ambiente y 100% si alcanza la temperatura de la fuente.
        """
        normalized = (self.T - self.ambient) / (self.heat_temp - self.ambient)
        normalized = normalized.clip(0, 1)
        return np.mean(normalized) * 100

    def step(self):
        """
        Realiza un paso de la simulación:
          1. Actualiza la malla interior.
          2. Aplica las condiciones de contorno.
          3. Fuerza la fuente de calor.
          4. Actualiza el tiempo simulado.
          5. Calcula y almacena el porcentaje y la temperatura promedio.
        Retorna el porcentaje de área calentada.
        """
        T_new = self.T.copy()
        T_new = self._update_interior(T_new)
        T_new = self._apply_boundary_conditions(T_new)
        T_new = self._force_source(T_new)
        self.T = T_new

        # Avanza el tiempo simulado
        self.current_time += self.dt

        # Calcula el porcentaje de "calentamiento" y actualiza el historial
        percentage = self._compute_percentage()
        self.percentage_history.append(percentage)
        self.time_history.append(self.current_time)

        # Registrar la temperatura promedio
        avg_temp = np.mean(self.T)
        self.avg_temp_history.append(avg_temp)

        return percentage