"""Pydantic v2 request/response schemas for the difficulty API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DifficultyLabel = Literal["easy", "normal", "hard", "extreme"]


class PlayerTelemetry(BaseModel):
    """Aggregated telemetry describing one player's recent behaviour.

    These are the features the model was trained on (see
    ``ml/train_difficulty_model.py``); the field order defines the model's
    feature vector order and must not be reshuffled without retraining.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "avg_speed": 18.4,
                    "coins_per_run": 62.5,
                    "crash_rate": 0.31,
                    "session_length_min": 22.0,
                    "runs_last_7d": 47,
                }
            ]
        }
    )

    avg_speed: float = Field(
        ...,
        ge=0.0,
        le=40.0,
        description="Mean forward speed across recent runs (m/s).",
    )
    coins_per_run: float = Field(
        ...,
        ge=0.0,
        le=200.0,
        description="Average coins collected per run.",
    )
    crash_rate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Fraction of recent runs that ended in a crash.",
    )
    session_length_min: float = Field(
        ...,
        ge=0.0,
        le=120.0,
        description="Average session length (minutes).",
    )
    runs_last_7d: int = Field(
        ...,
        ge=0,
        le=10_000,
        description="Number of runs in the last 7 days.",
    )


class DifficultyResponse(BaseModel):
    """Difficulty knobs the game client should use for this player."""

    speed_start: float = Field(..., description="Initial forward speed (m/s).")
    speed_max: float = Field(
        ..., description="Speed ceiling the run accelerates towards (m/s)."
    )
    obstacle_density: float = Field(
        ..., description="Spawn density for barriers, 0..1."
    )
    coin_density: float = Field(
        ..., description="Coin spawn multiplier (1.0 = baseline)."
    )
    difficulty_label: DifficultyLabel = Field(
        ..., description="Banded difficulty tier."
    )
    model_version: str = Field(
        ..., description="Version of the model that produced this response."
    )
