package simulation

import (
	"math/rand"
)

func PerformBreeding(fish1, fish2 FishGenome, params SimulationParameters) FishGenome {
	offspring := make(FishGenome)
	for gene, value1 := range fish1 {
		value2 := fish2[gene]
		// Crossover
		if rand.Float64() < params.CrossoverRate {
			offspring[gene] = (value1 + value2) / 2
		} else {
			if rand.Float64() < 0.5 {
				offspring[gene] = value1
			} else {
				offspring[gene] = value2
			}
		}
		// Mutation
		if rand.Float64() < params.MutationRate {
			offspring[gene] += (rand.Float64() - 0.5) * 0.1 // Small random adjustment
		}
	}
	return offspring
}

func GenerateRandomGenome() FishGenome {
	return FishGenome{
		"speed": rand.Float64(),
		"size":  rand.Float64(),
		"color": rand.Float64(),
	}
}
