#!/usr/bin/env python3
"""Train the SUBB SURFERS difficulty model (runnable end-to-end, no external
data required).

Pipeline:
  1. Synthesize 6000 player profiles with numpy: a latent skill factor drives
     all five telemetry features with feature-specific noise and curvature, so
     the features are correlated the way real telemetry is.
  2. Label each profile with a latent skill function + Gaussian noise
     (difficulty score in 0..1).
  3. Fit a GradientBoostingRegressor on the five telemetry features.
  4. Print a classification report for the banded labels
     (easy/normal/hard/extreme) of true vs predicted scores.
  5. Persist ml/models/difficulty_model.joblib (bundle: model + features +
     version) and ml/metrics.json (r2, mae, feature importances, trained_at,
     model_version).

Usage:
    python ml/train_difficulty_model.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import sklearn
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import classification_report, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

# --- Configuration -----------------------------------------------------------

FEATURES = ["avg_speed", "coins_per_run", "crash_rate", "session_length_min", "runs_last_7d"]
MODEL_VERSION = "v1.0.0"
SEED = 42
N_SAMPLES = 6000
TEST_SIZE = 0.2

LABELS = ["easy", "normal", "hard", "extreme"]

HERE = Path(__file__).resolve().parent
MODELS_DIR = HERE / "models"
MODEL_PATH = MODELS_DIR / "difficulty_model.joblib"
METRICS_PATH = HERE / "metrics.json"


def bucket_labels(scores: np.ndarray) -> np.ndarray:
    """Vectorised 0.25-wide banding of difficulty scores into labels."""
    return np.select(
        [scores < 0.25, scores < 0.50, scores < 0.75],
        ["easy", "normal", "hard"],
        default="extreme",
    )


def synthesize_profiles(n: int, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Create n correlated player profiles and their difficulty labels."""
    # Latent skill: mass in the middle, realistic tails on both ends.
    skill = rng.beta(2.2, 2.2, size=n)

    avg_speed = np.clip(5.0 + 31.0 * skill + rng.normal(0.0, 2.5, n), 0.0, 40.0)
    coins_per_run = np.clip(215.0 * skill**1.1 + rng.normal(0.0, 14.0, n), 0.0, 200.0)
    crash_rate = np.clip(0.92 * (1.0 - skill) ** 1.4 + rng.normal(0.0, 0.045, n), 0.0, 1.0)
    session_length_min = np.clip(122.0 * skill**0.85 + rng.normal(0.0, 7.0, n), 0.0, 120.0)
    runs_last_7d = np.clip(160.0 * skill + rng.normal(0.0, 28.0, n), 0.0, 10_000.0).astype(int)

    X = np.column_stack(
        [
            avg_speed,
            coins_per_run,
            crash_rate,
            session_length_min,
            runs_last_7d.astype(float),
        ]
    )
    # Label = latent skill function + noise; the mild non-linearity keeps the
    # GBM honest while staying learnable.
    y = np.clip(skill + 0.12 * np.sin(np.pi * skill) + rng.normal(0.0, 0.06, n), 0.0, 1.0)
    return X, y


def main() -> None:
    rng = np.random.default_rng(SEED)
    X, y = synthesize_profiles(N_SAMPLES, rng)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=SEED
    )

    model = GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=3,
        subsample=0.9,
        random_state=SEED,
    )
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    r2 = float(r2_score(y_test, predictions))
    mae = float(mean_absolute_error(y_test, predictions))

    print("=" * 68)
    print("SUBB SURFERS difficulty model training")
    print("=" * 68)
    print(f"samples: {N_SAMPLES} (train={len(X_train)}, test={len(X_test)})")
    print(f"R2   (test): {r2:.4f}")
    print(f"MAE  (test): {mae:.4f}")
    print()
    print("Classification report on banded labels (true vs predicted):")
    print(
        classification_report(
            bucket_labels(y_test),
            bucket_labels(predictions),
            labels=LABELS,
            zero_division=0,
        )
    )

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "features": FEATURES,
            "model_version": MODEL_VERSION,
            "sklearn_version": sklearn.__version__,
        },
        MODEL_PATH,
    )

    metrics = {
        "model_version": MODEL_VERSION,
        "r2": round(r2, 4),
        "mae": round(mae, 4),
        "feature_importances": {
            name: round(float(weight), 4)
            for name, weight in zip(FEATURES, model.feature_importances_)
        },
        "n_samples": N_SAMPLES,
        "n_features": len(FEATURES),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")

    print(f"saved model bundle -> {MODEL_PATH}")
    print(f"saved metrics      -> {METRICS_PATH}")


if __name__ == "__main__":
    main()
