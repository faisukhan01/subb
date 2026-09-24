using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SubbSurfers.Pickups;
using SubbSurfers.Player;

namespace SubbSurfers.Systems
{
    /// <summary>
    /// Activates power-ups with per-type coroutine timers and applies their
    /// effects to the player / score systems. The HUD subscribes to
    /// <see cref="PowerUpStarted"/> / <see cref="PowerUpEnded"/> and polls
    /// <see cref="GetRemainingSeconds"/> for timer bars.
    ///
    /// Magnet state is exposed statically because coins are pooled world
    /// objects that must react without holding scene references.
    /// </summary>
    public sealed class PowerUpSystem : MonoBehaviour
    {
        [SerializeField] private PlayerController player;
        [SerializeField] private ScoreSystem score;
        [SerializeField] private float defaultDuration = 10f;

        /// <summary>True while a Magnet power-up is active (read by Coin).</summary>
        public static bool MagnetActive { get; private set; }

        /// <summary>Cached player transform used by magnet homing.</summary>
        public static Transform PlayerTransform { get; private set; }

        public event Action<PowerUpType, float> PowerUpStarted;
        public event Action<PowerUpType> PowerUpEnded;

        private readonly Dictionary<PowerUpType, Coroutine> _timers =
            new Dictionary<PowerUpType, Coroutine>();
        private readonly Dictionary<PowerUpType, float> _remaining =
            new Dictionary<PowerUpType, float>();

        public bool IsActive(PowerUpType type) => _timers.ContainsKey(type);

        public float GetRemainingSeconds(PowerUpType type) =>
            _remaining.TryGetValue(type, out float value) ? value : 0f;

        private void Awake()
        {
            if (player == null)
            {
                player = FindObjectOfType<PlayerController>();
            }

            if (score == null)
            {
                score = FindObjectOfType<ScoreSystem>();
            }
        }

        private void OnEnable()
        {
            PowerUp.PowerUpCollected += HandleCollected;
            PlayerTransform = player != null ? player.transform : null;
        }

        private void OnDisable()
        {
            PowerUp.PowerUpCollected -= HandleCollected;
            MagnetActive = false;
        }

        private void HandleCollected(PowerUpType type) => Activate(type, defaultDuration);

        /// <summary>(Re)activates a power-up for the given duration.</summary>
        public void Activate(PowerUpType type, float duration)
        {
            if (_timers.TryGetValue(type, out Coroutine existing))
            {
                if (existing != null)
                {
                    StopCoroutine(existing);
                }

                _timers.Remove(type);
            }
            else
            {
                ApplyEffects(type, enabled: true);
            }

            _remaining[type] = duration;
            _timers[type] = StartCoroutine(RunTimer(type, duration));
            PowerUpStarted?.Invoke(type, duration);
        }

        private IEnumerator RunTimer(PowerUpType type, float duration)
        {
            float remaining = duration;
            while (remaining > 0f)
            {
                remaining -= Time.deltaTime;
                _remaining[type] = Mathf.Max(0f, remaining);
                yield return null;
            }

            _timers.Remove(type);
            _remaining.Remove(type);
            ApplyEffects(type, enabled: false);
            PowerUpEnded?.Invoke(type);
        }

        private void ApplyEffects(PowerUpType type, bool enabled)
        {
            switch (type)
            {
                case PowerUpType.Magnet:
                    MagnetActive = enabled;
                    break;

                case PowerUpType.Jetpack:
                    if (player != null)
                    {
                        player.SetJetpack(enabled);
                    }

                    break;

                case PowerUpType.Sneakers:
                    if (player != null)
                    {
                        player.SetSneakers(enabled);
                    }

                    break;

                case PowerUpType.Hoverboard:
                    if (player != null && enabled)
                    {
                        player.ProvideHoverboard();
                    }

                    break;

                case PowerUpType.Multiplier:
                    if (score != null)
                    {
                        score.SetDoubleActive(enabled);
                    }

                    break;
            }
        }
    }
}
