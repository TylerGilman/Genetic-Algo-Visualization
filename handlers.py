from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Optional

# Models
class SimulationParameters(BaseModel):
    population_size: int = 10
    mutation_rate: float = 0.01
    crossover_rate: float = 0.7
    food_availability: float = 0.5
    predator_density: float = 0.2
    water_temperature: int = 3

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/simulation", response_class=HTMLResponse)
async def handle_simulation(request: Request):
    initial_params = SimulationParameters()
    
    # Check if it's an HTMX request
    is_htmx_request = request.headers.get("HX-Request") == "true"
    
    template_data = {
        "request": request,
        "params": initial_params,
    }
    
    template_name = "simulation_content.html" if is_htmx_request else "simulation_page.html"
    return templates.TemplateResponse(template_name, template_data)

@router.post("/breed")
async def handle_breed(fish_pair: Dict[str, Dict[str, float]]):
    # Get current simulation parameters
    params = SimulationParameters(
        mutation_rate=0.01,
        crossover_rate=0.7
    )
    
    # For now, just echo back the received data
    return fish_pair
