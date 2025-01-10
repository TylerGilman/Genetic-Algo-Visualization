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
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include handlers
app.include_router(router)

if __name__ == "__main__":
    listen_addr = os.getenv("LISTEN_ADDR", "0.0.0.0:8000")
    host, port = listen_addr.split(":")

    print(f"Starting server at http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=int(port), reload=True)
