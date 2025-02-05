from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import uvicorn
import os
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
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "upgrade-insecure-requests"
    return response


# Disable reload in production
if __name__ == "__main__":
    listen_addr = os.getenv("LISTEN_ADDR", "0.0.0.0:8000")
    host, port = listen_addr.split(":")

    # Disable reload and debug features
    uvicorn.run(
        "main:app",
        host=host,
        port=int(port),
        reload=False,  # Critical for Docker deployment
        access_log=False,
    )
