from fastapi import APIRouter, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Optional, List
import random


# Models
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


class fish_data(BaseModel):
    genome: FishGenome
    energy: float


class BreedingRequest(BaseModel):
    fish_data: List[Dict]


router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/", response_class=HTMLResponse)
async def handle_simulation(request: Request):
    initial_params = SimulationParameters()

    # Check if it's an HTMX request
    is_htmx_request = request.headers.get("HX-Request") == "true"

    template_data = {
        "request": request,
        "params": initial_params,
    }

    template_name = (
        "simulation_content.html" if is_htmx_request else "simulation_page.html"
    )
    return templates.TemplateResponse(template_name, template_data)


@router.post("/breed")
async def handle_breed(request: BreedingRequest):
    try:
        breeding_pool = request.fish_data
        if not breeding_pool:
            raise HTTPException(status_code=400, detail="Empty breeding pool")

        new_fish = []

        # Randomly pair fish and breed
        random.shuffle(breeding_pool)

        for i in range(0, len(breeding_pool) - 1, 2):
            parent1 = breeding_pool[i]
            parent2 = breeding_pool[i + 1]

            # Create two children by splitting genes
            child1_genome = {}
            child2_genome = {}

            # For each trait, randomly assign to either child1 or child2
            for trait in ["color", "speed", "size"]:
                if random.random() < 0.5:
                    child1_genome[trait] = parent1["genome"][trait]
                    child2_genome[trait] = parent2["genome"][trait]
                else:
                    child1_genome[trait] = parent2["genome"][trait]
                    child2_genome[trait] = parent1["genome"][trait]

                # Apply mutations
                mutation_rate = 0.1
                for genome in [child1_genome, child2_genome]:
                    if random.random() < mutation_rate:
                        genome[trait] = max(
                            0, min(1, genome[trait] + random.gauss(0, 0.1))
                        )

            new_fish.extend([{"genome": child1_genome}, {"genome": child2_genome}])

        return JSONResponse(content=new_fish)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
