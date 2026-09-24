using UnityEngine;

namespace SubbSurfers.Player
{
    /// <summary>
    /// Bridges <see cref="PlayerController"/> events/signals to a Unity Animator:
    ///  - float "Speed"    (damped forward speed),
    ///  - bool  "Grounded",
    ///  - bool  "Dead",
    ///  - trigger "Jump",
    ///  - trigger "Roll".
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public sealed class CharacterAnimator : MonoBehaviour
    {
        private static readonly int SpeedId = Animator.StringToHash("Speed");
        private static readonly int GroundedId = Animator.StringToHash("Grounded");
        private static readonly int DeadId = Animator.StringToHash("Dead");
        private static readonly int JumpId = Animator.StringToHash("Jump");
        private static readonly int RollId = Animator.StringToHash("Roll");

        [SerializeField] private PlayerController player;
        [SerializeField] private float speedDampTime = 0.1f;

        private Animator _animator;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            if (player == null)
            {
                player = GetComponentInParent<PlayerController>();
            }

            if (player == null)
            {
                player = FindObjectOfType<PlayerController>();
            }

            if (player == null)
            {
                Debug.LogError("[CharacterAnimator] No PlayerController found in the scene.");
            }
        }

        private void OnEnable()
        {
            if (player == null)
            {
                return;
            }

            player.OnJump += HandleJump;
            player.OnRoll += HandleRoll;
        }

        private void OnDisable()
        {
            if (player == null)
            {
                return;
            }

            player.OnJump -= HandleJump;
            player.OnRoll -= HandleRoll;
        }

        private void Update()
        {
            if (player == null)
            {
                return;
            }

            _animator.SetFloat(SpeedId, player.Speed, speedDampTime, Time.deltaTime);
            _animator.SetBool(GroundedId, player.IsGrounded);
            _animator.SetBool(DeadId, !player.IsAlive);
        }

        private void HandleJump() => _animator.SetTrigger(JumpId);

        private void HandleRoll() => _animator.SetTrigger(RollId);
    }
}
