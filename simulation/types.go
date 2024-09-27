package simulation

type SimulationParameters struct {
	PopulationSize     int     `json:"populationSize"`
	MutationRate       float64 `json:"mutationRate"`
	CrossoverRate      float64 `json:"crossoverRate"`
	FoodAvailability   float64 `json:"foodAvailability"`
	PredatorDensity    float64 `json:"predatorDensity"`
	WaterTemperature   float64 `json:"waterTemperature"`
}

type FishGenome map[string]float64

type FishPair struct {
	Fish1 FishGenome `json:"fish1"`
	Fish2 FishGenome `json:"fish2"`
}
