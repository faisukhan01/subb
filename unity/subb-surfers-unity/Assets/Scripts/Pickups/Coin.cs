using System;
using System.Collections.Generic;
using UnityEngine;

namespace SubbSurfers.Pickups
{
    /// <summary>
    /// Collectible coin: spins in Update, homes toward the player while magnet
    /// is active, and returns itself to a static pool on collect
    /// (<see cref="CoinCollected"/> is raised with the coin value).
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class Coin : MonoBehaviour
    {
        public const int Value = 1;

        [Header("Presentation")]
        [SerializeField] private float spinDegreesPerSecond = 240f;

        [Header("Magnet")]
        [SerializeField] private float magnetPullSpeed = 18f;
        [SerializeField] private float magnetCollectRadius = 1.2f;

        [SerializeField] private string playerTag = "Player";

        /// <summary>Raised globally with the value of every collected coin.</summary>
        public static event Action<int> CoinCollected;

        private static readonly Queue<Coin> Pool = new Queue<Coin>();

        private bool _collected;

        /// <summary>
        /// Takes a coin from the static pool (or instantiates a new one) and
        /// places it under <paramref name="parent"/> (usually the owning chunk).
        /// </summary>
        public static Coin Spawn(Coin prefab, Vector3 position, Quaternion rotation, Transform parent)
        {
            while (Pool.Count > 0)
            {
                Coin pooled = Pool.Dequeue();
                if (pooled == null)
                {
                    continue; // was destroyed together with its chunk
                }

                pooled.transform.SetParent(parent, false);
                pooled.transform.SetPositionAndRotation(position, rotation);
                pooled.gameObject.SetActive(true);
                pooled.ResetCoin();
                return pooled;
            }

            return Instantiate(prefab, position, rotation, parent);
        }

        private void OnEnable()
        {
            _collected = false;
        }

        private void Update()
        {
            transform.Rotate(0f, spinDegreesPerSecond * Time.deltaTime, 0f, Space.Self);

            if (_collected || !Systems.PowerUpSystem.MagnetActive)
            {
                return;
            }

            Transform target = Systems.PowerUpSystem.PlayerTransform;
            if (target == null)
            {
                return;
            }

            transform.position = Vector3.MoveTowards(
                transform.position,
                target.position,
                magnetPullSpeed * Time.deltaTime);

            Vector3 offset = target.position - transform.position;
            if (offset.sqrMagnitude <= magnetCollectRadius * magnetCollectRadius)
            {
                Collect();
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (_collected || !other.CompareTag(playerTag))
            {
                return;
            }

            Collect();
        }

        private void Collect()
        {
            _collected = true;
            CoinCollected?.Invoke(Value);
            ReturnToPool();
        }

        private void ResetCoin()
        {
            _collected = false;
        }

        /// <summary>Returns the coin to the static pool (deactivates it).</summary>
        public void ReturnToPool()
        {
            gameObject.SetActive(false);
            Pool.Enqueue(this);
        }
    }
}
