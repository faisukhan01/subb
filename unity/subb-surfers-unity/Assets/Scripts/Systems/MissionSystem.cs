using System;
using System.Collections.Generic;
using UnityEngine;
using SubbSurfers.Pickups;
using SubbSurfers.Player;

namespace SubbSurfers.Systems
{
    [Serializable]
    public class Mission
    {
        public string id = "";
        public string description = "";
        public int target = 1;
        public int progress = 0;
        public bool completed = false;
    }

    /// <summary>
    /// Generates a fresh set of missions per run (collect coins, jump, roll,
    /// grab power-ups), tracks progress from global pickup events and player
    /// events, and raises <see cref="MissionCompleted"/> on completion.
    /// </summary>
    public sealed class MissionSystem : MonoBehaviour
    {
        [Header("Generation")]
        [SerializeField, Min(1)] private int missionsPerRun = 3;
        [SerializeField] private int minCoinsTarget = 15;
        [SerializeField] private int maxCoinsTarget = 30;

        [Header("Wiring")]
        [SerializeField] private ScoreSystem score;

        public event Action<Mission> MissionCompleted;
        public event Action MissionListRebuilt;

        private readonly List<Mission> _missions = new List<Mission>();
        private PlayerController _trackedPlayer;
        private int _completedThisRun;

        public IReadOnlyList<Mission> Missions => _missions;
        public int CompletedThisRun => _completedThisRun;

        private void OnEnable()
        {
            Coin.CoinCollected += OnCoinCollected;
            PowerUp.PowerUpCollected += OnPowerUpCollected;
        }

        private void OnDisable()
        {
            Coin.CoinCollected -= OnCoinCollected;
            PowerUp.PowerUpCollected -= OnPowerUpCollected;
            UntrackPlayer();
        }

        /// <summary>Builds a fresh randomized mission list for a new run.</summary>
        public void BuildMissionsForRun()
        {
            _missions.Clear();
            _completedThisRun = 0;

            int coinsTarget = UnityEngine.Random.Range(minCoinsTarget, maxCoinsTarget + 1);
            int jumpsTarget = UnityEngine.Random.Range(5, 11);
            int rollsTarget = UnityEngine.Random.Range(4, 9);
            int powerUpsTarget = UnityEngine.Random.Range(2, 4);

            AddMission("coins", $"Collect {coinsTarget} coins", coinsTarget);
            if (missionsPerRun > 1)
            {
                AddMission("jumps", $"Jump {jumpsTarget} times", jumpsTarget);
            }

            if (missionsPerRun > 2)
            {
                AddMission("rolls", $"Roll {rollsTarget} times", rollsTarget);
            }

            if (missionsPerRun > 3)
            {
                AddMission("powerups", $"Grab {powerUpsTarget} power-ups", powerUpsTarget);
            }

            MissionListRebuilt?.Invoke();
        }

        /// <summary>Wires jump/roll progress to the given player for this run.</summary>
        public void TrackPlayer(PlayerController player)
        {
            UntrackPlayer();
            _trackedPlayer = player;
            if (_trackedPlayer != null)
            {
                _trackedPlayer.OnJump += OnPlayerJumped;
                _trackedPlayer.OnRoll += OnPlayerRolled;
            }
        }

        private void AddMission(string id, string description, int target) =>
            _missions.Add(new Mission { id = id, description = description, target = target });

        private void UntrackPlayer()
        {
            if (_trackedPlayer == null)
            {
                return;
            }

            _trackedPlayer.OnJump -= OnPlayerJumped;
            _trackedPlayer.OnRoll -= OnPlayerRolled;
            _trackedPlayer = null;
        }

        private void OnCoinCollected(int value) => AddProgress("coins", value);

        private void OnPowerUpCollected(PowerUpType type) => AddProgress("powerups", 1);

        private void OnPlayerJumped() => AddProgress("jumps", 1);

        private void OnPlayerRolled() => AddProgress("rolls", 1);

        private void AddProgress(string missionId, int amount)
        {
            foreach (Mission mission in _missions)
            {
                if (mission.completed || mission.id != missionId)
                {
                    continue;
                }

                mission.progress = Mathf.Min(mission.target, mission.progress + amount);
                if (mission.progress < mission.target)
                {
                    continue;
                }

                mission.completed = true;
                _completedThisRun++;
                if (score != null)
                {
                    score.NotifyMissionCompleted();
                }

                MissionCompleted?.Invoke(mission);
            }
        }
    }
}
