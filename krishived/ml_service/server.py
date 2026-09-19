import os
import sys
import io
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add parent directory to path so imports work cleanly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml_service.model_engine import PlantDiseaseDetector

from contextlib import asynccontextmanager

# Global detector instance
detector = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector
    print("Starting KrishiVed AI Inference Service...")
    detector = PlantDiseaseDetector.get_instance()
    print("[OK] KrishiVed AI Inference Service ready on port 8008")
    yield

app = FastAPI(
    title="KrishiVed AI Plant Disease Detection API",
    description="Custom PyTorch CNN (best_cnn_model.pth) + Grad-CAM Visual Heatmap Service",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for all frontends (Vercel, localhost, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "KrishiVed AI Model Server",
        "model": "best_cnn_model.pth",
        "gradcam": "Active (features.9 Conv2D layer)",
        "status": "online"
    }

@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_loaded": detector is not None
    }

@app.post("/api/predict")
async def predict(
    image: UploadFile = File(None),
    file: UploadFile = File(None),
    crop: str = Form(None),
    crop_stage: str = Form(None),
    field_id: str = Form(None),
    lat: str = Form(None),
    lng: str = Form(None)
):
    upload = image or file
    if not upload:
        raise HTTPException(status_code=400, detail="No image file provided in request (expected 'image' or 'file' form field)")

    try:
        image_bytes = await upload.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        global detector
        if detector is None:
            detector = PlantDiseaseDetector.get_instance()

        result = detector.predict(image_bytes)
        
        # Include metadata context if provided
        if crop:
            result['crop'] = crop
        if crop_stage:
            result['crop_stage'] = crop_stage
        if field_id:
            result['field_id'] = field_id

        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8008))
    uvicorn.run("ml_service.server:app", host="127.0.0.1", port=port, reload=False)
