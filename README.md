# Neural Network Fish Evolution Simulator

An interactive web-based simulation that demonstrates evolutionary algorithms and neural networks through the behavior of virtual fish. The simulation combines physical modeling, neural network decision-making, and genetic algorithms to create an educational platform for understanding artificial life and evolution.

## Features

- Real-time fish behavior simulation with physics-based movement
- Neural network-controlled decision making for each fish
- Genetic evolution across generations with trait inheritance
- Advanced metabolism system affected by size and temperature
- Interactive controls for simulation parameters
- Real-time data visualization and statistics
- Event logging system for tracking simulation events
- Responsive web interface with HTMX integration

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Data Visualization**: Chart.js
- **Templating**: Jinja2
- **Styling**: Custom CSS with Bootstrap integration
- **Real-time Updates**: HTMX

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd neural-fish-simulation
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install fastapi uvicorn jinja2 python-dotenv
```

4. Set up environment variables:
```bash
cp .env.example .env
```

5. Start the development server:
```bash
python main.py
```

The application will be available at `http://localhost:8000`

## Project Structure

```
├── static/
│   └── js/
│       ├── css/
│       │   └── styles.css
│       ├── fish.js              # Fish entity implementation
│       ├── genetic-fish-simulation.js  # Core simulation logic
│       ├── simulation-logger.js # Event logging system
│       ├── simulation-stats.js  # Statistics tracking
│       ├── ui-controller.js     # UI management
│       └── utils.js            # Utility functions
├── templates/
│   ├── intro.html             # Educational introduction
│   ├── simulation_content.html # Main simulation interface
│   └── simulation_page.html   # Page layout template
├── handlers.py                # API route handlers
└── main.py                    # Application entry point
```

## Core Components

### Fish Entity (`fish.js`)
- Physics-based movement system with constrained body segments
- Neural network brain for decision making
- Metabolic system affected by size and temperature
- Genetic traits including color, size, and speed
- Personality traits affecting behavior

### Simulation Engine (`genetic-fish-simulation.js`)
- Population management
- Food generation system
- Breeding and evolution logic
- Environmental parameter management
- Real-time statistics collection

### User Interface
- Interactive parameter controls
- Real-time data visualization
- Event logging
- Generation tracking
- Speed controls

## Simulation Parameters

- **Population Size**: Number of fish in each generation
- **Mutation Rate**: Frequency of genetic mutations
- **Crossover Rate**: Probability of trait mixing during breeding
- **Food Availability**: Rate of food generation
- **Water Temperature**: Affects metabolism and behavior
- **Generation Length**: Duration of each generation

## Neural Network Architecture

### Input Layer (10 neurons)
- Nearest food angle and distance
- Nearest fish angle and distance
- Predator detection
- Current energy level
- Current speed
- Trait inputs (aggressiveness, cautiousness, food motivation)

### Hidden Layer (12 neurons)
- Hyperbolic tangent activation
- Adaptive bias based on personality traits

### Output Layer (2 neurons)
- Turn amount (-π/16 to π/16)
- Speed multiplier (0.7x to 1.3x)

## Contributing
Anyone is welcome to contribute! We want to make this the best educational tool possible and it has MANY areas where it can be improved. 
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Authors

- Tyler Gilman
- Nia Quinn

## Acknowledgments

This project was created as an educational tool to demonstrate the principles of:
- Genetic Algorithms
- Neural Networks
- Artificial Life
- Evolution Simulation
- Physical Modeling
