package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"

	"geneticalgo/handlers"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file:", err)
	}

	// Set up the router
	router := chi.NewMux()

	// Simulation handler
	router.Get("/simulation", errorHandler(handlers.HandleSimulation))

	// API endpoint for gene splitting
	router.Post("/api/breed", errorHandler(handlers.HandleBreed))

	// Static file handling
	router.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	// Start the server
	listenAddr := os.Getenv("LISTEN_ADDR")
	slog.Info("HTTP server starting", "listenAddr", listenAddr)
	if err := http.ListenAndServe(listenAddr, router); err != nil {
		log.Fatal("Error starting server:", err)
	}
}

// errorHandler wraps our handlers to handle returned errors
func errorHandler(h func(http.ResponseWriter, *http.Request) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := h(w, r)
		if err != nil {
			// Log the error
			slog.Error("Handler error", "error", err)
			// You might want to send an error response to the client here
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	}
}
