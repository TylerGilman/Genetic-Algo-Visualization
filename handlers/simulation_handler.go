package handlers

import (
	"encoding/json"
	"net/http"

	"geneticalgo/simulation"
	"geneticalgo/views"
)

func HandleSimulation(w http.ResponseWriter, r *http.Request) error {
	isHtmxRequest := r.Header.Get("HX-Request") == "true"

	initialParams := simulation.SimulationParameters{
		PopulationSize:   10,
		MutationRate:     0.01,
		CrossoverRate:    0.7,
		FoodAvailability: 0.5,
		PredatorDensity:  0.2,
		WaterTemperature: 20,
	}

	if isHtmxRequest {
		return views.SimulationContent(initialParams).Render(r.Context(), w)
	} else {
		return views.SimulationPage(initialParams).Render(r.Context(), w)
	}
}

func HandleBreed(w http.ResponseWriter, r *http.Request) error {
	var fishPair simulation.FishPair
	err := json.NewDecoder(r.Body).Decode(&fishPair)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return err
	}

	// Get current simulation parameters
	// In a real application, you might store these in a database or session
	params := simulation.SimulationParameters{
		MutationRate:  0.01,
		CrossoverRate: 0.7,
	}

	offspring := simulation.PerformBreeding(fishPair.Fish1, fishPair.Fish2, params)

	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(offspring)
}
