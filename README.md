# Heat Transfer Simulation Project

This project simulates heat transfer processes using numerical methods. Follow the steps below to set up the environment and run the project.

## Prerequisites

- Python 3.8 or higher installed on your system.
- Basic knowledge of Python and numerical simulations.

## Setup Instructions

### 1. Clone the Repository
Clone this repository to your local machine:
```bash
git clone <repository-url>
cd heat_transfer_proyect
```

### 2. Create a Virtual Environment
Create a Python virtual environment to isolate project dependencies:
```bash
python -m venv venv
```

### 3. Activate the Virtual Environment
- On **Windows**:
  ```bash
  venv\Scripts\activate
  ```
- On **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```

### 4. Install Dependencies
Install the required Python packages:
```bash
pip install -r requirements.txt
```

### 5. Run the Simulation
Run the main script to start the simulation:
```bash
python main.py
```

## Project Structure
- `main.py`: Entry point for the simulation.
- `modules/`: Contains the core simulation logic and helper functions.
- `data/`: Stores input and output data files.
- `requirements.txt`: Lists the Python dependencies.

## Deactivating the Virtual Environment
When you're done, deactivate the virtual environment:
```bash
deactivate
```

## Notes
- Ensure all dependencies are installed before running the project.
- Modify the `main.py` file to customize simulation parameters.

## License
This project is for educational purposes only.
