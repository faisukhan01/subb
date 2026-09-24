using UnityEngine;

namespace SubbSurfers.World
{
    /// <summary>
    /// A reusable slice of the endless world. Chunks are pooled by
    /// <see cref="EndlessWorldSpawner"/> and re-initialized via <see cref="OnSpawn"/>.
    /// </summary>
    public class Chunk : MonoBehaviour
    {
        [Header("Layout")]
        [SerializeField] private float localZLength = 30f;
        [SerializeField] private Transform[] laneSpawnAnchors = new Transform[0];

        [Header("Pickups")]
        [SerializeField] private Pickups.Coin coinPrefab;
        [SerializeField] private Pickups.PowerUp powerUpPrefab;
        [SerializeField, Range(0f, 1f)] private float coinStackChance = 0.65f;
        [SerializeField, Range(0f, 1f)] private float powerUpChance = 0.1f;
        [SerializeField, Min(1)] private int maxCoinsPerAnchor = 5;

        public float LocalZLength => localZLength;
        public Transform[] LaneSpawnAnchors => laneSpawnAnchors;

        /// <summary>
        /// Called by the spawner every time this chunk is (re)used.
        /// <paramref name="difficulty"/> is in [0, 1] — subclasses can tighten
        /// obstacle placement as it grows.
        /// </summary>
        public virtual void OnSpawn(float difficulty)
        {
            if (laneSpawnAnchors == null)
            {
                return;
            }

            foreach (Transform anchor in laneSpawnAnchors)
            {
                if (anchor == null)
                {
                    continue;
                }

                if (coinPrefab != null && Random.value <= coinStackChance)
                {
                    SpawnCoinStack(anchor);
                }

                if (powerUpPrefab != null && Random.value <= powerUpChance)
                {
                    Pickups.PowerUp.Spawn(
                        powerUpPrefab,
                        anchor.position + Vector3.up * 1.0f,
                        Quaternion.identity,
                        transform);
                }
            }
        }

        protected virtual void SpawnCoinStack(Transform anchor)
        {
            int count = Random.Range(1, maxCoinsPerAnchor + 1);
            for (int i = 0; i < count; i++)
            {
                Vector3 position = anchor.position + Vector3.up * 0.75f + Vector3.back * (i * 1.2f);
                Pickups.Coin.Spawn(coinPrefab, position, Quaternion.identity, transform);
            }
        }
    }
}
