using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SubbSurfers.Core
{
    /// <summary>
    /// High-level game states for the endless runner loop.
    /// </summary>
    public enum GameState
    {
        Menu,
        Running,
        Paused,
        GameOver
    }

    /// <summary>
    /// Composition root: a singleton that owns the global <see cref="GameState"/>,
    /// publishes state transitions through <see cref="StateChanged"/>, ramps the
    /// world speed over a run, and performs lazy (one-at-a-time) scene loads.
    ///
    /// Scene setup: add to an empty GameObject named "GameBootstrap" in a
    /// bootstrap scene; it survives scene changes via <c>DontDestroyOnLoad</c>.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public sealed class GameBootstrap : MonoBehaviour
    {
        private static GameBootstrap _instance;

        public static GameBootstrap Instance => _instance;

        [Header("Scenes")]
        [SerializeField] private string gameplaySceneName = "Gameplay";
        [SerializeField] private string menuSceneName = "MainMenu";

        [Header("Difficulty curve")]
        [SerializeField] private float runStartSpeed = 12f;
        [SerializeField] private float maxWorldSpeed = 30f;
        [SerializeField] private float speedRampPerSecond = 0.35f;

        private GameState _state = GameState.Menu;
        private float _elapsedRunTime;
        private Coroutine _activeSceneLoad;

        /// <summary>Raised on every state transition (old != new).</summary>
        public static event Action<GameState> StateChanged;

        /// <summary>Raised whenever the ramped world speed changes.</summary>
        public static event Action<float> WorldSpeedChanged;

        public GameState State => _state;
        public string GameplaySceneName => gameplaySceneName;
        public string MenuSceneName => menuSceneName;
        public float RunStartSpeed => runStartSpeed;
        public float MaxWorldSpeed => maxWorldSpeed;

        /// <summary>Current ramped world speed (m/s). Systems read this instead
        /// of implementing their own difficulty curves.</summary>
        public float CurrentWorldSpeed { get; private set; }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;
            DontDestroyOnLoad(gameObject);
            CurrentWorldSpeed = runStartSpeed;
        }

        private void Update()
        {
            if (_state != GameState.Running)
            {
                return;
            }

            _elapsedRunTime += Time.deltaTime;
            float next = Mathf.Min(maxWorldSpeed, runStartSpeed + _elapsedRunTime * speedRampPerSecond);
            if (!Mathf.Approximately(next, CurrentWorldSpeed))
            {
                CurrentWorldSpeed = next;
                WorldSpeedChanged?.Invoke(CurrentWorldSpeed);
            }
        }

        // ------------------------------------------------------------------
        // State machine API
        // ------------------------------------------------------------------

        public void StartRun()
        {
            _elapsedRunTime = 0f;
            CurrentWorldSpeed = runStartSpeed;
            WorldSpeedChanged?.Invoke(CurrentWorldSpeed);
            SetState(GameState.Running);
        }

        public void PauseRun()
        {
            if (_state == GameState.Running)
            {
                SetState(GameState.Paused);
            }
        }

        public void ResumeRun()
        {
            if (_state == GameState.Paused)
            {
                SetState(GameState.Running);
            }
        }

        public void EndRun()
        {
            if (_state == GameState.Running || _state == GameState.Paused)
            {
                SetState(GameState.GameOver);
            }
        }

        public void BackToMenu()
        {
            SetState(GameState.Menu);
        }

        // ------------------------------------------------------------------
        // Lazy scene loading — never two loads at once.
        // ------------------------------------------------------------------

        public void LoadGameplayScene() => LoadScene(gameplaySceneName);

        public void LoadMenuScene() => LoadScene(menuSceneName);

        public void LoadScene(string sceneName)
        {
            if (_activeSceneLoad != null)
            {
                Debug.LogWarning($"[GameBootstrap] Ignoring load of '{sceneName}' — already loading a scene.");
                return;
            }

            _activeSceneLoad = StartCoroutine(LoadSceneRoutine(sceneName));
        }

        private IEnumerator LoadSceneRoutine(string sceneName)
        {
            AsyncOperation operation = SceneManager.LoadSceneAsync(sceneName);
            while (operation != null && !operation.isDone)
            {
                yield return null;
            }

            _activeSceneLoad = null;
        }

        private void SetState(GameState next)
        {
            if (_state == next)
            {
                return;
            }

            _state = next;
            StateChanged?.Invoke(next);
        }

        private void OnDestroy()
        {
            if (_instance == this)
            {
                _instance = null;
            }
        }
    }
}
