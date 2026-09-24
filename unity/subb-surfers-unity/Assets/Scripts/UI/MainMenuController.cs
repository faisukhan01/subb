using TMPro;
using UnityEngine;
using UnityEngine.UI;
using SubbSurfers.Core;

namespace SubbSurfers.UI
{
    /// <summary>
    /// Main menu wiring: play / pause / resume / character-select buttons all
    /// route through <see cref="GameBootstrap"/>. Character selection is a
    /// simple cycling picker persisted with PlayerPrefs.
    /// </summary>
    public sealed class MainMenuController : MonoBehaviour
    {
        [Header("Buttons")]
        [SerializeField] private Button playButton;
        [SerializeField] private Button pauseButton;
        [SerializeField] private Button resumeButton;
        [SerializeField] private Button characterSelectButton;

        [Header("Character select")]
        [SerializeField] private TMP_Text characterLabel;
        [SerializeField] private string[] characters = { "Dash", "Nova", "Rex" };

        [Header("Scenes")]
        [SerializeField] private string gameplaySceneName = "Gameplay";

        private const string CharacterPrefKey = "subb.character";
        private int _characterIndex;

        private void Awake()
        {
            _characterIndex = PlayerPrefs.GetInt(CharacterPrefKey, 0) %
                              Mathf.Max(1, characters.Length);
            ApplyCharacterLabel();
        }

        private void OnEnable()
        {
            if (playButton != null)
            {
                playButton.onClick.AddListener(HandlePlay);
            }

            if (pauseButton != null)
            {
                pauseButton.onClick.AddListener(HandlePause);
            }

            if (resumeButton != null)
            {
                resumeButton.onClick.AddListener(HandleResume);
            }

            if (characterSelectButton != null)
            {
                characterSelectButton.onClick.AddListener(HandleCharacterSelect);
            }

            GameBootstrap.StateChanged += HandleStateChanged;
        }

        private void OnDisable()
        {
            if (playButton != null)
            {
                playButton.onClick.RemoveListener(HandlePlay);
            }

            if (pauseButton != null)
            {
                pauseButton.onClick.RemoveListener(HandlePause);
            }

            if (resumeButton != null)
            {
                resumeButton.onClick.RemoveListener(HandleResume);
            }

            if (characterSelectButton != null)
            {
                characterSelectButton.onClick.RemoveListener(HandleCharacterSelect);
            }

            GameBootstrap.StateChanged -= HandleStateChanged;
        }

        private void HandlePlay()
        {
            if (GameBootstrap.Instance == null)
            {
                Debug.LogError("[MainMenuController] GameBootstrap missing in the scene.");
                return;
            }

            GameBootstrap.Instance.StartRun();
            GameBootstrap.Instance.LoadGameplayScene();
        }

        private void HandlePause()
        {
            GameBootstrap.Instance?.PauseRun();
        }

        private void HandleResume()
        {
            GameBootstrap.Instance?.ResumeRun();
        }

        private void HandleCharacterSelect()
        {
            _characterIndex = (_characterIndex + 1) % Mathf.Max(1, characters.Length);
            PlayerPrefs.SetInt(CharacterPrefKey, _characterIndex);
            ApplyCharacterLabel();
        }

        private void ApplyCharacterLabel()
        {
            if (characterLabel == null || characters == null || characters.Length == 0)
            {
                return;
            }

            characterLabel.text = $"Character: {characters[_characterIndex % characters.Length]}";
        }

        private void HandleStateChanged(GameState state)
        {
            // Pause/resume buttons only make sense mid-run.
            if (pauseButton != null)
            {
                pauseButton.interactable = state == GameState.Running;
            }

            if (resumeButton != null)
            {
                resumeButton.interactable = state == GameState.Paused;
            }
        }
    }
}
