using System.Collections.Generic;
using UnityEngine;
using SubbSurfers.Core;

namespace SubbSurfers.World
{
    /// <summary>
    /// Streams an endless corridor of weighted, pooled <see cref="Chunk"/>s
    /// along +Z as the player advances:
    ///  - keeps chunks spawned up to <see cref="spawnAheadDistance"/> ahead,
    ///  - recycles chunks further than <see cref="despawnBehindDistance"/> behind,
    ///  - scales spawn gap (and reads world speed) with elapsed-run difficulty.
    /// </summary>
    public sealed class EndlessWorldSpawner : MonoBehaviour
    {
        [System.Serializable]
        public struct WeightedChunk
        {
            public Chunk prefab;
            [Min(0f)] public float weight;
        }

        [Header("Chunks")]
        [SerializeField] private List<WeightedChunk> chunkPrefabs = new List<WeightedChunk>();
        [SerializeField, Min(1)] private int prewarmPerChunk = 2;

        [Header("Streaming distances")]
        [SerializeField] private float spawnAheadDistance = 120f;
        [SerializeField] private float despawnBehindDistance = 30f;
        [SerializeField] private float startSpawnZ = 10f;

        [Header("Difficulty scaling")]
        [SerializeField] private float relaxedGapScale = 1.15f;
        [SerializeField] private float tightGapScale = 0.75f;
        [SerializeField] private float difficultyRampSeconds = 120f;

        private readonly Dictionary<int, Queue<Chunk>> _pools = new Dictionary<int, Queue<Chunk>>();
        private readonly Dictionary<Chunk, int> _poolIndexOf = new Dictionary<Chunk, int>();
        private readonly List<Chunk> _active = new List<Chunk>();

        private float _nextSpawnZ;
        private float _totalWeight;

        private Transform _player;
        private Transform Player
        {
            get
            {
                if (_player == null)
                {
                    GameObject tagged = GameObject.FindGameObjectWithTag("Player");
                    if (tagged != null)
                    {
                        _player = tagged.transform;
                    }
                }

                return _player;
            }
        }

        private void Awake()
        {
            _totalWeight = 0f;
            for (int i = 0; i < chunkPrefabs.Count; i++)
            {
                if (chunkPrefabs[i].prefab == null)
                {
                    continue;
                }

                _totalWeight += Mathf.Max(0f, chunkPrefabs[i].weight);
                var queue = new Queue<Chunk>();
                for (int j = 0; j < prewarmPerChunk; j++)
                {
                    queue.Enqueue(CreateChunk(i));
                }

                _pools[i] = queue;
            }

            _nextSpawnZ = startSpawnZ;
        }

        /// <summary>Clears all active chunks and restarts streaming. Call on run start.</summary>
        public void ResetWorld()
        {
            foreach (Chunk chunk in _active)
            {
                ReturnChunk(chunk);
            }

            _active.Clear();
            _nextSpawnZ = startSpawnZ;
        }

        private void Update()
        {
            Transform playerTransform = Player;
            if (playerTransform == null)
            {
                return;
            }

            float playerZ = playerTransform.position.z;
            float difficulty = GetDifficulty01();
            float gapScale = Mathf.Lerp(relaxedGapScale, tightGapScale, difficulty);

            while (_nextSpawnZ < playerZ + spawnAheadDistance)
            {
                int index = PickPrefabIndex();
                if (index < 0)
                {
                    return; // no valid chunk prefabs configured
                }

                Chunk chunk = GetChunk(index);
                chunk.transform.position = new Vector3(0f, 0f, _nextSpawnZ);
                chunk.gameObject.SetActive(true);
                chunk.OnSpawn(difficulty);
                _active.Add(chunk);
                _nextSpawnZ += Mathf.Max(5f, chunk.LocalZLength * gapScale);
            }

            for (int i = _active.Count - 1; i >= 0; i--)
            {
                if (_active[i].transform.position.z < playerZ - despawnBehindDistance)
                {
                    ReturnChunk(_active[i]);
                    _active.RemoveAt(i);
                }
            }
        }

        private float GetDifficulty01()
        {
            if (GameBootstrap.Instance != null)
            {
                return Mathf.InverseLerp(
                    GameBootstrap.Instance.RunStartSpeed,
                    GameBootstrap.Instance.MaxWorldSpeed,
                    GameBootstrap.Instance.CurrentWorldSpeed);
            }

            return Mathf.Clamp01(Time.timeSinceLevelLoad / Mathf.Max(1f, difficultyRampSeconds));
        }

        private int PickPrefabIndex()
        {
            if (chunkPrefabs.Count == 0 || _totalWeight <= 0f)
            {
                return -1;
            }

            float roll = Random.value * _totalWeight;
            for (int i = 0; i < chunkPrefabs.Count; i++)
            {
                if (chunkPrefabs[i].prefab == null)
                {
                    continue;
                }

                roll -= Mathf.Max(0f, chunkPrefabs[i].weight);
                if (roll <= 0f)
                {
                    return i;
                }
            }

            // Floating point safety net.
            for (int i = chunkPrefabs.Count - 1; i >= 0; i--)
            {
                if (chunkPrefabs[i].prefab != null)
                {
                    return i;
                }
            }

            return -1;
        }

        private Chunk CreateChunk(int index)
        {
            Chunk chunk = Instantiate(chunkPrefabs[index].prefab);
            chunk.gameObject.SetActive(false);
            _poolIndexOf[chunk] = index;
            return chunk;
        }

        private Chunk GetChunk(int index)
        {
            if (_pools.TryGetValue(index, out Queue<Chunk> queue) && queue.Count > 0)
            {
                return queue.Dequeue();
            }

            return CreateChunk(index);
        }

        private void ReturnChunk(Chunk chunk)
        {
            chunk.gameObject.SetActive(false);
            if (_poolIndexOf.TryGetValue(chunk, out int index))
            {
                if (!_pools.TryGetValue(index, out Queue<Chunk> queue))
                {
                    queue = new Queue<Chunk>();
                    _pools[index] = queue;
                }

                queue.Enqueue(chunk);
            }
            else
            {
                Destroy(chunk.gameObject);
            }
        }
    }
}
