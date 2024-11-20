from fastapi import APIRouter, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
import random


class Traits(BaseModel):
    aggressiveness: float
    cautiousness: float
    foodMotivation: float
    energyEfficiency: float
    learningRate: float
    adaptability: float


class NeuralWeights(BaseModel):
    hidden: List[float]
    output: List[float]


class FishGenome(BaseModel):
    color: float
    speed: float
    size: float
    traits: Optional[Traits]
    neural_weights: Optional[NeuralWeights]


class FishData(BaseModel):
    genome: FishGenome
    energy: Optional[float] = Field(default=0.0)


class BreedingRequest(BaseModel):
    fish_data: List[Dict]


class SimulationParameters(BaseModel):
    population_size: int = 10
    mutation_rate: float = 0.01
    crossover_rate: float = 0.7
    food_availability: float = 0.5
    predator_density: float = 0.2
    water_temperature: int = 3


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


@router.post("/breed")
async def handle_breed(request: BreedingRequest):
    try:
        breeding_pool = request.fish_data
        if not breeding_pool:
            raise HTTPException(status_code=400, detail="Empty breeding pool")

        def dict_to_list(weight_dict):
            if not isinstance(weight_dict, dict):
                return weight_dict
            return [weight_dict[str(i)] for i in range(len(weight_dict))]

        # Convert dictionary neural weights to lists
        for fish in breeding_pool:
            if "neural_weights" in fish["genome"]:
                weights = fish["genome"]["neural_weights"]
                if "hidden" in weights:
                    weights["hidden"] = dict_to_list(weights["hidden"])
                if "output" in weights:
                    weights["output"] = dict_to_list(weights["output"])

        breeding_pool.sort(
            key=lambda x: x.get("genome", {}).get("energy", 0), reverse=True
        )

        new_fish = []
        mutation_rate = 0.1

        for i in range(0, len(breeding_pool) - 1, 2):
            parent1 = breeding_pool[i]["genome"]
            parent2 = breeding_pool[i + 1]["genome"]

            for _ in range(2):
                child_genome = {}

                # Basic traits
                for trait in ["color", "speed", "size"]:
                    child_genome[trait] = (
                        parent1[trait] if random.random() < 0.5 else parent2[trait]
                    )
                    if random.random() < mutation_rate:
                        child_genome[trait] = max(
                            0, min(1, child_genome[trait] + random.gauss(0, 0.1))
                        )

                # Neural weights
                if "neural_weights" in parent1 and "neural_weights" in parent2:
                    p1_weights = parent1["neural_weights"]
                    p2_weights = parent2["neural_weights"]

                    child_genome["neural_weights"] = {"hidden": [], "output": []}

                    for layer in ["hidden", "output"]:
                        if layer in p1_weights and layer in p2_weights:
                            p1_layer = p1_weights[layer]
                            p2_layer = p2_weights[layer]

                            # Ensure both layers have same length
                            min_len = min(len(p1_layer), len(p2_layer))
                            crosspoint = random.randint(0, min_len)
                            child_layer = p1_layer[:crosspoint] + p2_layer[crosspoint:]

                            if random.random() < mutation_rate:
                                child_layer = [
                                    (
                                        w + random.gauss(0, 0.1)
                                        if random.random() < mutation_rate
                                        else w
                                    )
                                    for w in child_layer
                                ]

                            child_genome["neural_weights"][layer] = child_layer

                # Personality traits
                if "traits" in parent1 and "traits" in parent2:
                    child_genome["traits"] = {}
                    for trait in [
                        "aggressiveness",
                        "cautiousness",
                        "foodMotivation",
                        "energyEfficiency",
                        "learningRate",
                        "adaptability",
                    ]:
                        p1_trait = parent1["traits"].get(trait, random.random())
                        p2_trait = parent2["traits"].get(trait, random.random())
                        avg_trait = (p1_trait + p2_trait) / 2
                        if random.random() < mutation_rate:
                            avg_trait += random.gauss(0, 0.1)
                        child_genome["traits"][trait] = max(0, min(1, avg_trait))

                new_fish.append({"genome": child_genome})

        return JSONResponse(content=new_fish)

    except Exception as e:
        print(f"Breeding error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
