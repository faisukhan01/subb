"""Difficulty model: joblib-backed GradientBoostingRegressor with a
deterministic heuristic fallback.

Feature order contract (must match ``ml/train_difficulty_model.py``):

    0. avg_speed
    1. coins_per_run
    2. crash_rate
    3. session_length_min
    4. runs_last_7d

The trained artifact is ``ml/models/difficulty_model.joblib`` (a dict bundle:
{"model", "features", "model_version", ...}) and its metrics live in
``ml/metrics.json``. When either file is missing or unreadable, the service
falls back to the deterministic heuristic below so the API never goes down.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib

from .schemas import DifficultyResponse, PlayerTelemetry

logger = logging.getLogger("subb.ml.difficulty")

SERVICE_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = SERVICE_ROOT / "ml" / "models" / "difficulty_model.joblib"
METRICS_PATH = SERVICE_ROOT / "ml" / "metrics.json"

FEATURE_NAMES: tuple[str, ...] = (
    "avg_speed",
    "coins_per_run",
    "crash_rate",
    "session_length_min",
    "runs_last_7d",
)

HEURISTIC_MODEL_VERSION = "heuristic-v0"

# Output ranges (linear interpolation of the difficulty score 0..1).
SPEED_START_MIN, SPEED_START_MAX = 8.0, 14.0
SPEED_MAX_MIN, SPEED_MAX_MAX = 14.0, 30.0
OBSTACLE_MIN, OBSTACLE_MAX = 0.35, 0.95
COIN_MIN, COIN_MAX = 1.10, 0.70

_LABELS = ("easy", "normal", "hard", "extreme")


def _clamp01(value: float) -> float:
    return min(max(value, 0.0), 1.0)


def feature_vector(telemetry: PlayerTelemetry) -> list[float]:
    """Telemetry -> model input vector, in the trained feature order."""
    return [
        telemetry.avg_speed,
        telemetry.coins_per_run,
        telemetry.crash_rate,
        telemetry.session_length_min,
        float(telemetry.runs_last_7d),
    ]


def heuristic_skill_score(telemetry: PlayerTelemetry) -> float:
    """Deterministic 0..1 skill score used when no trained model is available.

    Weighted blend of normalised telemetry dimensions; fully deterministic so
    tests and the heuristic contract stay stable.
    """
    speed = _clamp01(telemetry.avg_speed / 40.0)
    coins = _clamp01(telemetry.coins_per_run / 200.0)
    survival = 1.0 - _clamp01(telemetry.crash_rate)
    session = _clamp01(telemetry.session_length_min / 120.0)
    volume = _clamp01(telemetry.runs_last_7d / 200.0)
    score = 0.30 * speed + 0.20 * coins + 0.25 * survival + 0.15 * session + 0.10 * volume
    return _clamp01(score)


def label_for_score(score: float) -> str:
    """Map a 0..1 difficulty score to its banded label (0.25-wide bands)."""
    if score < 0.25:
        return "easy"
    if score < 0.50:
        return "normal"
    if score < 0.75:
        return "hard"
    return "extreme"


def _response_from_score(score: float, model_version: str) -> DifficultyResponse:
    score = _clamp01(score)
    return DifficultyResponse(
        speed_start=round(SPEED_START_MIN + (SPEED_START_MAX - SPEED_START_MIN) * score, 3),
        speed_max=round(SPEED_MAX_MIN + (SPEED_MAX_MAX - SPEED_MAX_MIN) * score, 3),
        obstacle_density=round(OBSTACLE_MIN + (OBSTACLE_MAX - OBSTACLE_MIN) * score, 3),
        coin_density=round(COIN_MIN + (COIN_MAX - COIN_MIN) * score, 3),
        difficulty_label=label_for_score(score),
        model_version=model_version,
    )


class DifficultyModel:
    """Wraps the trained regressor (or the heuristic fallback)."""

    def __init__(self, model: Any | None, model_version: str) -> None:
        self._model = model
        self.model_version = model_version

    @classmethod
    def from_default_paths(
        cls,
        model_path: Path = MODEL_PATH,
        metrics_path: Path = METRICS_PATH,
    ) -> "DifficultyModel":
        """Load the joblib bundle; degrade to the heuristic on any failure."""
        model: Any | None = None
        version = HEURISTIC_MODEL_VERSION
        try:
            if model_path.exists():
                bundle = joblib.load(model_path)
                if isinstance(bundle, dict):
                    model = bundle.get("model")
                else:
                    model = bundle
                if model is not None and metrics_path.exists():
                    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
                    version = str(metrics.get("model_version", version))
                if model is None:
                    logger.warning("model bundle at %s has no estimator", model_path)
        except Exception:  # noqa: BLE001 - any load failure must not crash startup
            logger.exception("failed to load difficulty model; using heuristic fallback")
            model = None
            version = HEURISTIC_MODEL_VERSION

        instance = cls(model, version)
        logger.info(
            "difficulty model initialised (mode=%s, version=%s)",
            "heuristic-fallback" if instance.is_heuristic else "joblib",
            version,
        )
        return instance

    @property
    def is_heuristic(self) -> bool:
        """True when running on the deterministic fallback."""
        return self._model is None

    def predict(self, telemetry: PlayerTelemetry) -> DifficultyResponse:
        """Map telemetry to difficulty parameters."""
        if self._model is None:
            return _response_from_score(heuristic_skill_score(telemetry), self.model_version)
        try:
            raw = self._model.predict([feature_vector(telemetry)])
            return _response_from_score(float(raw[0]), self.model_version)
        except Exception:  # noqa: BLE001 - inference failure must not 500 the API
            logger.exception("model inference failed; falling back to heuristic")
            return _response_from_score(heuristic_skill_score(telemetry), HEURISTIC_MODEL_VERSION)


__all__ = [
    "DifficultyModel",
    "FEATURE_NAMES",
    "feature_vector",
    "heuristic_skill_score",
    "label_for_score",
]
