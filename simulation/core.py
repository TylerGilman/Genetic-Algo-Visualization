from dataclasses import dataclass
from typing import Dict, Any
import random
from .genes import GeneRegistry, Gene


class FishGenome(Dict[str, float]):
    """
    A dictionary-based genome that allows easy access and modification of gene values.
    Inherits from Dict to maintain compatibility with JSON serialization.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize any missing genes with default values
        for gene_name in GeneRegistry.get_all_genes():
            if gene_name not in self:
                self[gene_name] = GeneRegistry.get_gene(gene_name).default_value

    def get_fitness(self, params: "SimulationParameters") -> float:
        """Calculate the overall fitness based on gene interactions"""
        fitness = 0
        for gene_name, value in self.items():
            gene = GeneRegistry.get_gene(gene_name)
            fitness += gene.calculate_fitness(self, params)
        return fitness


@dataclass
class SimulationParameters:
    population_size: int = 10
    mutation_rate: float = 0.01
    crossover_rate: float = 0.7
    food_availability: float = 0.5
    predator_density: float = 0.2
    water_temperature: int = 3


def PerformBreeding(
    fish1: FishGenome, fish2: FishGenome, params: SimulationParameters
) -> FishGenome:
    """
    Perform breeding between two fish to create offspring.
    """
    offspring = FishGenome()

    for gene_name in GeneRegistry.get_all_genes():
        value1 = fish1[gene_name]
        value2 = fish2[gene_name]
        gene = GeneRegistry.get_gene(gene_name)

        # Crossover
        if random.random() < params.crossover_rate:
            offspring[gene_name] = gene.crossover(value1, value2)
        else:
            offspring[gene_name] = value1 if random.random() < 0.5 else value2

        # Mutation
        if random.random() < params.mutation_rate:
            offspring[gene_name] = gene.mutate(offspring[gene_name])

    return offspring


def GenerateRandomGenome() -> FishGenome:
    """
    Generate a new random genome with all registered genes.
    """
    genome = FishGenome()
    for gene_name in GeneRegistry.get_all_genes():
        gene = GeneRegistry.get_gene(gene_name)
        genome[gene_name] = gene.generate_random()
    return genome
