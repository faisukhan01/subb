using System;
using UnityEngine;
using SubbSurfers.Core;
using SubbSurfers.Pickups;

namespace SubbSurfers.Systems
{
    /// <summary>
    /// Owns score math for the current run:
    ///  - distance travelled * multiplier,
    ///  - base multiplier grows by 1 per completed mission (cap 5),
    ///  - the x2 Multiplier power-up doubles the effective multiplier,
    ///  - coin count tracked separately.
    /// </summary>
    public sealed class ScoreSystem : MonoBehaviour
    {
        [SerializeField] private float pointsPerMeter = 1f;
        [SerializeField, Min(1)] private int maxBaseMultiplier = 5;

        /// <summary>Snapshot of a run, used for HUD and game-over panels.</summary>
        public struct RunSummary
        {
            public int Score;
            public int Coins;
            public float Distance;
            public int Multiplier;
            public int MissionsCompleted;
        }

        /// <summary>Raised whenever the score changes (with the full summary).</summary>
        public event Action<RunSummary> ScoreChanged;

        public int Score { get; private set; }
        public int Coins { get; private set; }
        public int MissionsCompleted { get; private set; }
        public float Distance { get; private set; }
        public bool DoubleActive { get; private set; }

        public int BaseMultiplier => Mathf.Min(maxBaseMultiplier, 1 + MissionsCompleted);
        public int EffectiveMultiplier => BaseMultiplier * (DoubleActive ? 2 : 1);

        private bool _running;

        private void OnEnable()
        {
            Coin.CoinCollected += HandleCoin;
            PowerUp.PowerUpCollected += HandlePowerUp;
        }

        private void OnDisable()
        {
            Coin.CoinCollected -= HandleCoin;
            PowerUp.PowerUpCollected -= HandlePowerUp;
        }

        private void Update()
        {
            if (!_running)
            {
                return;
            }

            float worldSpeed = GameBootstrap.Instance != null
                ? GameBootstrap.Instance.CurrentWorldSpeed
                : 10f;
            Distance += worldSpeed * Time.deltaTime;
            RecomputeScore(notify: true);
        }

        public void BeginRun()
        {
            Score = 0;
            Coins = 0;
            Distance = 0f;
            MissionsCompleted = 0;
            DoubleActive = false;
            _running = true;
            RecomputeScore(notify: false);
            ScoreChanged?.Invoke(BuildSummary());
        }

        public void EndRun()
        {
            _running = false;
        }

        public void SetDoubleActive(bool active)
        {
            if (DoubleActive == active)
            {
                return;
            }

            DoubleActive = active;
            RecomputeScore(notify: true);
        }

        public void NotifyMissionCompleted()
        {
            MissionsCompleted++;
            RecomputeScore(notify: true);
        }

        public RunSummary BuildSummary() => new RunSummary
        {
            Score = Score,
            Coins = Coins,
            Distance = Distance,
            Multiplier = EffectiveMultiplier,
            MissionsCompleted = MissionsCompleted,
        };

        private void HandleCoin(int value) => Coins += value;

        private void HandlePowerUp(PowerUpType type)
        {
            if (type == PowerUpType.Multiplier)
            {
                SetDoubleActive(true);
            }
        }

        private void RecomputeScore(bool notify)
        {
            int next = Mathf.RoundToInt(Distance * pointsPerMeter) * EffectiveMultiplier;
            if (next == Score)
            {
                return;
            }

            Score = next;
            if (notify)
            {
                ScoreChanged?.Invoke(BuildSummary());
            }
        }
    }
}
