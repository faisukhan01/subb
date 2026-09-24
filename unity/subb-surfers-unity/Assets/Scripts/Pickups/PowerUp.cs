using System;
using UnityEngine;

namespace SubbSurfers.Pickups
{
    public enum PowerUpType
    {
        Magnet,
        Jetpack,
        Multiplier,
        Sneakers,
        Hoverboard
    }

    /// <summary>
    /// Floating power-up pickup. Collection raises the static
    /// <see cref="PowerUpCollected"/> event (consumed by PowerUpSystem /
    /// ScoreSystem) plus the per-instance <see cref="Collected"/> event for
    /// spawner bookkeeping.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class PowerUp : MonoBehaviour
    {
        [Header("Type")]
        [SerializeField] private PowerUpType type = PowerUpType.Magnet;
        [SerializeField] private float duration = 10f;

        [Header("Presentation (idle bob)")]
        [SerializeField] private float bobAmplitude = 0.25f;
        [SerializeField] private float bobSpeed = 2f;

        [SerializeField] private string playerTag = "Player";

        /// <summary>Raised globally whenever any power-up is collected.</summary>
        public static event Action<PowerUpType> PowerUpCollected;

        /// <summary>Raised for this specific instance (spawner bookkeeping).</summary>
        public event Action<PowerUp> Collected;

        public PowerUpType Type => type;
        public float Duration => duration;

        private Vector3 _basePosition;
        private float _bobPhase;

        private void OnEnable()
        {
            _basePosition = transform.position;
            _bobPhase = UnityEngine.Random.value * Mathf.PI * 2f;
        }

        private void Update()
        {
            _bobPhase += bobSpeed * Time.deltaTime;
            transform.position = _basePosition + Vector3.up * (Mathf.Sin(_bobPhase) * bobAmplitude);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag(playerTag))
            {
                return;
            }

            PowerUpCollected?.Invoke(type);
            Collected?.Invoke(this);
            gameObject.SetActive(false);
        }
    }
}
