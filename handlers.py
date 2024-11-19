from fastapi import APIRouter, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
import random
import numpy as np


class NeuralWeights(BaseModel):
    wih: List[List[float]]
    who: List[List[float]]


class SimulationParameters(BaseModel):
    population_size: int = 10
    mutation_rate: float = 0.01
    crossover_rate: float = 0.7
    food_availability: float = 0.5
    predator_density: float = 0.2
    water_temperature: int = 3


class FishGenome(BaseModel):
    color: float
    speed: float
    size: float
    neural_weights: Optional[NeuralWeights]


class FishData(BaseModel):
    genome: FishGenome
    finalEnergy: float = Field(default=0.0)


class BreedingRequest(BaseModel):
    fish_data: List[Dict]


router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/", response_class=HTMLResponse)
async def handle_simulation(request: Request):
    initial_params = SimulationParameters()
    is_htmx_request = request.headers.get("HX-Request") == "true"
    template_data = {
        "request": request,
        "params": initial_params,
    }
    template_name = (
        "simulation_content.html" if is_htmx_request else "simulation_page.html"
    )
    return templates.TemplateResponse(template_name, template_data)


def crossover_neural_weights(parent1_weights, parent2_weights, mutation_rate=0.1):
    def mutate_matrix(matrix):
        new_matrix = [row[:] for row in matrix]
        for i in range(len(matrix)):
            for j in range(len(matrix[i])):
                if random.random() < mutation_rate:
                    mutation = random.gauss(0, 0.1)
                    new_matrix[i][j] = max(-1, min(1, new_matrix[i][j] + mutation))
        return new_matrix

    crossover_weight = random.random()

    child_wih = [
        [
            crossover_weight * p1 + (1 - crossover_weight) * p2
            for p1, p2 in zip(row1, row2)
        ]
        for row1, row2 in zip(parent1_weights["wih"], parent2_weights["wih"])
    ]

    child_who = [
        [
            crossover_weight * p1 + (1 - crossover_weight) * p2
            for p1, p2 in zip(row1, row2)
        ]
        for row1, row2 in zip(parent1_weights["who"], parent2_weights["who"])
    ]

    child_wih = mutate_matrix(child_wih)
    child_who = mutate_matrix(child_who)

    return {"wih": child_wih, "who": child_who}


@router.post("/breed")
async def handle_breed(request: BreedingRequest):
    try:
        breeding_pool = request.fish_data
        if not breeding_pool:
            raise HTTPException(status_code=400, detail="Empty breeding pool")

        # Sort by energy but ensure minimum chance for diversity
        breeding_pool.sort(
            key=lambda x: (
                x.get("finalEnergy", 0)
                if isinstance(x.get("finalEnergy"), (int, float))
                else 0
            ),
            reverse=True,
        )

        new_fish = []
        mutation_rate = 0.1

        # Process pairs of parents to create pairs of children
        for i in range(0, len(breeding_pool) - 1, 2):
            parent1 = breeding_pool[i]["genome"]
            parent2 = breeding_pool[i + 1]["genome"]

            # Create exactly two children from each pair
            for _ in range(2):
                child_genome = {}

                # Uniform crossover for physical traits
                # Each trait has a 50% chance of coming from either parent
                for trait in ["color", "speed", "size"]:
                    # Randomly select which parent to inherit from
                    if random.random() < 0.5:
                        child_genome[trait] = parent1[trait]
                    else:
                        child_genome[trait] = parent2[trait]

                    # Apply mutation if selected
                    if random.random() < mutation_rate:
                        mutation = random.gauss(0, 0.1)
                        child_genome[trait] = max(
                            0, min(1, child_genome[trait] + mutation)
                        )

                # Handle neural network weights with uniform crossover
                neural_weights1 = parent1.get(
                    "neural_weights",
                    {
                        "wih": [[random.uniform(-1, 1) for _ in range(5)]],
                        "who": [
                            [random.uniform(-1, 1) for _ in range(5)] for _ in range(2)
                        ],
                    },
                )
                neural_weights2 = parent2.get(
                    "neural_weights",
                    {
                        "wih": [[random.uniform(-1, 1) for _ in range(5)]],
                        "who": [
                            [random.uniform(-1, 1) for _ in range(5)] for _ in range(2)
                        ],
                    },
                )

                # Uniform crossover for neural weights
                child_wih = []
                for row in range(len(neural_weights1["wih"])):
                    child_row = []
                    for col in range(len(neural_weights1["wih"][row])):
                        # Each weight has 50% chance from each parent
                        if random.random() < 0.5:
                            weight = neural_weights1["wih"][row][col]
                        else:
                            weight = neural_weights2["wih"][row][col]

                        # Apply mutation if selected
                        if random.random() < mutation_rate:
                            mutation = random.gauss(0, 0.1)
                            weight = max(-1, min(1, weight + mutation))
                        child_row.append(weight)
                    child_wih.append(child_row)

                # Same for who weights
                child_who = []
                for row in range(len(neural_weights1["who"])):
                    child_row = []
                    for col in range(len(neural_weights1["who"][row])):
                        if random.random() < 0.5:
                            weight = neural_weights1["who"][row][col]
                        else:
                            weight = neural_weights2["who"][row][col]

                        if random.random() < mutation_rate:
                            mutation = random.gauss(0, 0.1)
                            weight = max(-1, min(1, weight + mutation))
                        child_row.append(weight)
                    child_who.append(child_row)

                child_genome["neural_weights"] = {"wih": child_wih, "who": child_who}

                new_fish.append({"genome": child_genome})

        print(f"Created {len(new_fish)} new fish from {len(breeding_pool)} parents")
        return JSONResponse(content=new_fish)
    except Exception as e:
        print(f"Breeding error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
