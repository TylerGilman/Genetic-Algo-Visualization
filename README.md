# Genetic-Algo-Visualization

An interactive web-based simulation demonstrating genetic algorithms through the evolution of fish populations using HTMX and Python (FastAPI). Fish adapt to their environment based on factors like water temperature, food availability, and metabolic costs.

## Quick Start

1. Create and start virtual env:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install requirements:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python3 main.py
```

4. Navigate to `localhost:_port_in_.env_`

## Project Structure

### Backend Files
- `main.py` - FastAPI application entry point and server configuration
- `handlers.py` - API route handlers and simulation parameter management
- `.env` - Environment configuration (port settings)

### Frontend Files
- `templates/`
  - `simulation_page.html` - Main simulation view template
  - `simulation_content.html` - Partial template for simulation controls and stats

### JavaScript Components
- `ui-controller.js` - Main UI management and event handling
- `genetic-fish-simulation.js` - Core simulation logic and rendering
- `fish.js` - Fish entity implementation with physics and genetics
- `environment-parameters.js` - Environment state management
- `simulation-stats.js` - Statistics tracking and data collection

## Features

### Simulation Components
- Real-time fish population visualization
- Dynamic environment parameters:
  - Water temperature affecting metabolism
  - Food generation rate
  - Population size control
  - Mutation and crossover rates

### Interactive Controls
- Simulation speed adjustment
- Start/stop functionality
- Parameter modification
- Real-time statistics visualization

### Fish Implementation
Each fish entity features:
- Genome-based traits (color, speed, size)
- Physics-based movement using constrained points
- Temperature-dependent metabolism
- Energy system for survival
- Adaptive fins and swimming mechanics

## Technical Implementation

### Server Architecture
- FastAPI backend handling:
  - Simulation state management (RESTful)
  - Genetic recombination calculations
  - HTMX integration for dynamic updates

### Frontend Architecture
- HTML5 Canvas for rendering
- Modern JavaScript (ES6+) for simulation logic, as well as parent selection
- HTMX for seamless server communication
- Chart.js for real-time statistics visualization

### Genetic Algorithm
- Server-side implementation
- AJAX-based generation updates
- Fitness calculation based on:
  - Survival duration
  - Food consumption
  - Energy efficiency
  - Environmental adaptation

## Scientific Models

The simulation incorporates biological models for fish behavior:

### Metabolic Calculations
Based on research from:
- [Fish Metabolic Scaling](https://besjournals.onlinelibrary.wiley.com/doi/10.1046/j.1365-2656.1999.00337.x#:~:text=The%20general%20equation%20for%20all,fish%20at%200%C2%B0C.)
- [Temperature Effects on Fish Metabolism](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7678922/)

Key features:
- Temperature-dependent metabolic rates using Q10 principle
- Allometric scaling for size-dependent energy consumption
- Hydrodynamic-inspired movement patterns

## License

This project is open source and available for educational and research purposes.

---
Note: This simulation is designed for educational purposes to demonstrate genetic algorithms and biological modeling concepts.
