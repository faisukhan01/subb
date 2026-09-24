"""FastAPI application for the SUBB SURFERS difficulty service (:4002)."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .difficulty import DifficultyModel
from .schemas import DifficultyResponse, PlayerTelemetry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("subb.ml")

MODEL_STATE_KEY = "difficulty_model"


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Load the difficulty model at startup, drop it at shutdown."""
    application.state.difficulty_model = DifficultyModel.from_default_paths()
    model: DifficultyModel = application.state.difficulty_model
    logger.info(
        "difficulty model ready (mode=%s, version=%s)",
        "heuristic-fallback" if model.is_heuristic else "joblib",
        model.model_version,
    )
    yield
    application.state.difficulty_model = None


app = FastAPI(
    title="SUBB SURFERS Difficulty Service",
    description="Personalised difficulty parameters from aggregated player telemetry.",
    version=__version__,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _model() -> DifficultyModel:
    model = getattr(app.state, MODEL_STATE_KEY, None)
    if model is None:
        raise HTTPException(status_code=503, detail="difficulty model not loaded yet")
    return model


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    model = getattr(app.state, MODEL_STATE_KEY, None)
    return {
        "status": "ok",
        "service": "ml-python",
        "model_version": model.model_version if model else "loading",
        "mode": "heuristic" if (model is None or model.is_heuristic) else "joblib",
    }


@app.post("/api/v1/difficulty", response_model=DifficultyResponse)
async def difficulty(telemetry: PlayerTelemetry) -> DifficultyResponse:
    """Predict difficulty parameters for one player's telemetry."""
    return _model().predict(telemetry)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "4002")),
    )
