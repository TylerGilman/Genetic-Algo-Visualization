from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import uvicorn
import os
from pathlib import Path
from handlers import router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI()

# Mount static files
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include handlers
app.include_router(router)


# Add this middleware to handle reverse proxy headers
@app.middleware("http")
async def add_secure_headers(request, call_next):
    response = await call_next(request)
    # Only add security headers in production
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "upgrade-insecure-requests"
    return response


if __name__ == "__main__":
    # Get environment variables with defaults
    environment = os.getenv("ENVIRONMENT", "development")
    listen_addr = os.getenv("LISTEN_ADDR", "0.0.0.0:8000")
    host, port = listen_addr.split(":")

    # Configure based on environment
    if environment == "production":
        # Production settings
        uvicorn.run(
            "main:app",
            host=host,
            port=int(port),
            reload=False,  # Disable reload in production
            access_log=False,
            workers=1  # Add workers=1 to prevent multiple processes
        )
    else:
        # Development settings
        uvicorn.run(
            "main:app",
            host=host,
            port=int(port),
            reload=True,  # Enable auto-reload for development
            access_log=True,
            log_level="debug",
            workers=1  # Add workers=1 to prevent multiple processes
        )
