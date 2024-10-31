from abc import ABC, abstractmethod
from typing import Dict, Type
import random


class Gene(ABC):
    """Abstract base class for genes"""

    @abstractmethod
    def calculate_fitness(
        self, genome: Dict[str, float], params: "SimulationParameters"
    ) -> float:
        """Calculate this gene's contribution to overall fitness"""
        pass

    def crossover(self, value1: float, value2: float) -> float:
        """Default crossover behavior - average of parents"""
        return (value1 + value2) / 2

    def mutate(self, value: float) -> float:
        """Default mutation behavior - small random adjustment"""
        return value + (random.random() - 0.5) * 0.1

    def generate_random(self) -> float:
        """Generate a random value for this gene"""
        return random.random()

    @property
    def default_value(self) -> float:
        """Default value for this gene"""
        return 0.5


class SpeedGene(Gene):
    def calculate_fitness(
        self, genome: Dict[str, float], params: "SimulationParameters"
    ) -> float:
        # Higher speed is good for catching food but costs more energy
        base_fitness = genome["speed"] * params.food_availability
        # Size affects speed efficiency
        size_penalty = genome["size"] * 0.5  # Larger fish have more speed penalty
        return base_fitness - size_penalty


class SizeGene(Gene):
    def calculate_fitness(
        self, genome: Dict[str, float], params: "SimulationParameters"
    ) -> float:
        # Larger size helps with predator defense but requires more food
        predator_defense = genome["size"] * (1 - params.predator_density)
        food_requirement = genome["size"] * (1 - params.food_availability)
        return predator_defense - food_requirement


class ColorGene(Gene):
    def calculate_fitness(
        self, genome: Dict[str, float], params: "SimulationParameters"
    ) -> float:
        # Color affects both predator avoidance and mating success
        camouflage = 1 - abs(0.5 - genome["color"])  # Optimal color is 0.5
        return camouflage * (1 - params.predator_density)


class GeneRegistry:
    """
    Registry for all genes in the simulation.
    Makes it easy to add new genes and modify gene interactions.
    """

    _genes: Dict[str, Type[Gene]] = {
        "speed": SpeedGene(),
        "size": SizeGene(),
        "color": ColorGene(),
    }

    @classmethod
    def register_gene(cls, name: str, gene: Gene):
        """Register a new gene type"""
        cls._genes[name] = gene

    @classmethod
    def get_gene(cls, name: str) -> Gene:
        """Get a gene by name"""
        return cls._genes[name]

    @classmethod
    def get_all_genes(cls) -> list[str]:
        """Get all registered gene names"""
        return list(cls._genes.keys())
