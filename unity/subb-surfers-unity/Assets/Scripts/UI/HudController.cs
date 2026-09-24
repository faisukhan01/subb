using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using SubbSurfers.Core;
using SubbSurfers.Pickups;
using SubbSurfers.Systems;

namespace SubbSurfers.UI
{
    /// <summary>
    /// In-game HUD: score/coins labels, power-up timer bars and a game-over
    /// panel filled from <see cref="ScoreSystem.BuildSummary"/>.
    /// </summary>
    public sealed class HudController : MonoBehaviour
    {
        [System.Serializable]
        public struct PowerUpBar
        {
            public PowerUpType type;
            public GameObject root;
            public Image fill;
        }

        [Header("Labels")]
        [SerializeField] private TMP_Text scoreLabel;
        [SerializeField] private TMP_Text coinLabel;
        [SerializeField] private TMP_Text multiplierLabel;

        [Header("Power-up bars")]
        [SerializeField] private PowerUpBar[] powerUpBars;

        [Header("Game over")]
        [SerializeField] private GameObject gameOverPanel;
        [SerializeField] private TMP_Text gameOverSummaryLabel;

        [Header("Wiring")]
        [SerializeField] private ScoreSystem score;
        [SerializeField] private PowerUpSystem powerUps;

        private readonly Dictionary<PowerUpType, float> _durations =
            new Dictionary<PowerUpType, float>();

        private void Awake()
        {
            if (score == null)
            {
                score = FindObjectOfType<ScoreSystem>();
            }

            if (powerUps == null)
            {
                powerUps = FindObjectOfType<PowerUpSystem>();
            }
        }

        private void OnEnable()
        {
            if (score != null)
            {
                score.ScoreChanged += HandleScoreChanged;
            }

            if (powerUps != null)
            {
                powerUps.PowerUpStarted += HandlePowerUpStarted;
                powerUps.PowerUpEnded += HandlePowerUpEnded;
            }

            GameBootstrap.StateChanged += HandleStateChanged;
        }

        private void OnDisable()
        {
            if (score != null)
            {
                score.ScoreChanged -= HandleScoreChanged;
            }

            if (powerUps != null)
            {
                powerUps.PowerUpStarted -= HandlePowerUpStarted;
                powerUps.PowerUpEnded -= HandlePowerUpEnded;
            }

            GameBootstrap.StateChanged -= HandleStateChanged;
        }

        private void Update()
        {
            if (powerUps == null || powerUpBars == null)
            {
                return;
            }

            foreach (PowerUpBar bar in powerUpBars)
            {
                if (bar.root == null || bar.fill == null)
                {
                    continue;
                }

                bool active = powerUps.IsActive(bar.type);
                bar.root.SetActive(active);
                if (!active)
                {
                    continue;
                }

                float total = Mathf.Max(0.01f, _durations.TryGetValue(bar.type, out float d) ? d : 1f);
                bar.fill.fillAmount = Mathf.Clamp01(powerUps.GetRemainingSeconds(bar.type) / total);
            }
        }

        private void HandleScoreChanged(ScoreSystem.RunSummary summary)
        {
            if (scoreLabel != null)
            {
                scoreLabel.text = summary.Score.ToString("N0");
            }

            if (coinLabel != null)
            {
                coinLabel.text = summary.Coins.ToString("N0");
            }

            if (multiplierLabel != null)
            {
                multiplierLabel.text = $"x{summary.Multiplier}";
            }
        }

        private void HandlePowerUpStarted(PowerUpType type, float duration)
        {
            _durations[type] = duration;
        }

        private void HandlePowerUpEnded(PowerUpType type)
        {
            _durations.Remove(type);
        }

        private void HandleStateChanged(GameState state)
        {
            bool gameOver = state == GameState.GameOver;
            if (gameOverPanel != null)
            {
                gameOverPanel.SetActive(gameOver);
            }

            if (gameOver && gameOverSummaryLabel != null && score != null)
            {
                ScoreSystem.RunSummary summary = score.BuildSummary();
                gameOverSummaryLabel.text =
                    $"Score {summary.Score:N0}   ·   Coins {summary.Coins:N0}   ·   " +
                    $"Distance {summary.Distance:N0} m   ·   Multiplier x{summary.Multiplier}";
            }
        }
    }
}
