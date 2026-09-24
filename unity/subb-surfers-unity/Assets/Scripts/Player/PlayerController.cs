using System;
using System.Collections;
using UnityEngine;
using SubbSurfers.Core;
using SubbSurfers.Input;

namespace SubbSurfers.Player
{
    /// <summary>
    /// CharacterController-driven 3-lane runner:
    ///  - lanes at x = -2.2 / 0 / +2.2, switched with SmoothDamp,
    ///  - jump with configurable gravity (-38) and jump velocity (13.5),
    ///  - roll shrinks the collider (1.7 -> 0.6) for 0.55 s,
    ///  - forward speed comes from the world difficulty ramp,
    ///  - hoverboard power-up absorbs one crash.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    [DisallowMultipleComponent]
    public sealed class PlayerController : MonoBehaviour
    {
        public const int LaneCount = 3;
        public const float LaneWidth = 2.2f;

        [Header("Movement")]
        [SerializeField] private float baseSpeed = 10f;
        [SerializeField] private float maxSpeed = 28f;
        [SerializeField] private float speedRampPerSecond = 0.35f;
        [SerializeField] private float laneSmoothTime = 0.12f;
        [SerializeField] private float laneSmoothMaxSpeed = 10f;

        [Header("Jump / gravity")]
        [SerializeField] private float gravity = -38f;
        [SerializeField] private float jumpVelocity = 13.5f;
        [SerializeField] private float fastFallVelocity = -22f;
        [SerializeField] private float groundedRayLength = 0.25f;
        [SerializeField] private LayerMask groundedMask = ~0;

        [Header("Roll")]
        [SerializeField] private float standingHeight = 1.7f;
        [SerializeField] private float rollingHeight = 0.6f;
        [SerializeField] private float rollDuration = 0.55f;

        [Header("Jetpack power-up")]
        [SerializeField] private float jetpackCruiseHeight = 6f;
        [SerializeField] private float jetpackClimbSpeed = 4.5f;
        [SerializeField] private float jetpackForwardBonus = 1.15f;

        public event Action OnJump;
        public event Action OnRoll;
        public event Action OnLand;
        public event Action OnDeath;

        /// <summary>Raised when the hoverboard absorbed what would have been a death.</summary>
        public event Action OnHoverboardBreak;

        public float Speed { get; private set; }
        public bool IsGrounded { get; private set; }
        public bool IsRolling { get; private set; }
        public bool IsAlive { get; private set; } = true;
        public int CurrentLane { get; private set; } = 1;
        public bool HasHoverboard => _hoverboardCharges > 0;

        private CharacterController _controller;
        private float _verticalVelocity;
        private float _laneX;
        private float _laneVelocity;
        private float _elapsedRunTime;
        private Coroutine _rollRoutine;
        private int _hoverboardCharges;
        private bool _jetpackActive;
        private bool _sneakersActive;
        private bool _wasGroundedLastFrame = true;

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
            SetControllerHeight(standingHeight);
            Speed = baseSpeed;
            _laneX = transform.position.x;
        }

        private void OnEnable()
        {
            if (InputService.Instance != null)
            {
                InputService.Instance.Move += HandleMove;
                InputService.Instance.Jump += HandleJump;
                InputService.Instance.Roll += HandleRoll;
            }
        }

        private void OnDisable()
        {
            if (InputService.Instance != null)
            {
                InputService.Instance.Move -= HandleMove;
                InputService.Instance.Jump -= HandleJump;
                InputService.Instance.Roll -= HandleRoll;
            }
        }

        private void Update()
        {
            if (!IsAlive)
            {
                return;
            }

            if (GameBootstrap.Instance != null && GameBootstrap.Instance.State != GameState.Running)
            {
                return;
            }

            // --- Difficulty curve drives forward speed. ---
            _elapsedRunTime += Time.deltaTime;
            Speed = Mathf.Min(maxSpeed, baseSpeed + _elapsedRunTime * speedRampPerSecond);

            // --- Lateral: SmoothDamp toward the target lane. ---
            float targetX = (CurrentLane - (LaneCount - 1) * 0.5f) * LaneWidth;
            float smoothTime = laneSmoothTime * (_sneakersActive ? 0.6f : 1f);
            _laneX = Mathf.SmoothDamp(_laneX, targetX, ref _laneVelocity, smoothTime, laneSmoothMaxSpeed);

            // --- Vertical: custom gravity or jetpack. ---
            bool groundedNow = CheckGrounded();
            if (groundedNow && !_wasGroundedLastFrame)
            {
                OnLand?.Invoke();
            }

            if (_jetpackActive)
            {
                float heightError = jetpackCruiseHeight - transform.position.y;
                float desired = Mathf.Clamp(heightError * 2f, -1f, 1f) * jetpackClimbSpeed;
                _verticalVelocity = Mathf.MoveTowards(_verticalVelocity, desired, 24f * Time.deltaTime);
            }
            else
            {
                if (groundedNow && _verticalVelocity < 0f)
                {
                    _verticalVelocity = -1.5f; // small stick-to-ground force
                }

                _verticalVelocity += gravity * Time.deltaTime;
            }

            Vector3 motion;
            motion.x = _laneX - transform.position.x;
            motion.y = _verticalVelocity * Time.deltaTime;
            motion.z = Speed * Time.deltaTime * (_jetpackActive ? jetpackForwardBonus : 1f);
            _controller.Move(motion);

            _wasGroundedLastFrame = groundedNow;
            IsGrounded = groundedNow;
        }

        private bool CheckGrounded()
        {
            if (_controller.isGrounded)
            {
                return true;
            }

            Vector3 origin = transform.position + Vector3.up * 0.1f;
            return Physics.Raycast(
                origin,
                Vector3.down,
                groundedRayLength,
                groundedMask,
                QueryTriggerInteraction.Ignore);
        }

        // ------------------------------------------------------------------
        // Input handlers (wired from InputService)
        // ------------------------------------------------------------------

        private void HandleMove(MoveDirection direction)
        {
            if (!IsAlive)
            {
                return;
            }

            if (direction == MoveDirection.Left)
            {
                CurrentLane = Mathf.Max(0, CurrentLane - 1);
            }
            else if (direction == MoveDirection.Right)
            {
                CurrentLane = Mathf.Min(LaneCount - 1, CurrentLane + 1);
            }
        }

        private void HandleJump()
        {
            if (!IsAlive)
            {
                return;
            }

            if (IsGrounded || _jetpackActive)
            {
                _verticalVelocity = jumpVelocity * (_sneakersActive ? 1.25f : 1f);
                OnJump?.Invoke();
            }
        }

        private void HandleRoll()
        {
            if (!IsAlive || IsRolling)
            {
                return;
            }

            if (!IsGrounded)
            {
                // Air-roll slams the player down for a fast landing.
                _verticalVelocity = fastFallVelocity;
            }

            if (_rollRoutine != null)
            {
                StopCoroutine(_rollRoutine);
            }

            _rollRoutine = StartCoroutine(RollRoutine());
            OnRoll?.Invoke();
        }

        private IEnumerator RollRoutine()
        {
            IsRolling = true;
            SetControllerHeight(rollingHeight);
            yield return new WaitForSeconds(rollDuration);
            SetControllerHeight(standingHeight);
            IsRolling = false;
            _rollRoutine = null;
        }

        private void SetControllerHeight(float height)
        {
            _controller.height = height;
            _controller.center = new Vector3(0f, height * 0.5f, 0f);
        }

        // ------------------------------------------------------------------
        // Damage / power-up hooks
        // ------------------------------------------------------------------

        /// <summary>
        /// Called by obstacles when the player runs into them. The hoverboard
        /// grants exactly one free crash; anything else is lethal.
        /// </summary>
        public void RegisterHit()
        {
            if (!IsAlive)
            {
                return;
            }

            if (_hoverboardCharges > 0)
            {
                _hoverboardCharges--;
                OnHoverboardBreak?.Invoke();
                return;
            }

            Die();
        }

        public void Die()
        {
            if (!IsAlive)
            {
                return;
            }

            IsAlive = false;
            OnDeath?.Invoke();
            if (GameBootstrap.Instance != null)
            {
                GameBootstrap.Instance.EndRun();
            }
        }

        /// <summary>Resets all per-run state. Call when a new run starts.</summary>
        public void ResetForRun()
        {
            IsAlive = true;
            IsRolling = false;
            _elapsedRunTime = 0f;
            _verticalVelocity = 0f;
            _laneVelocity = 0f;
            _hoverboardCharges = 0;
            _jetpackActive = false;
            _sneakersActive = false;
            _wasGroundedLastFrame = true;
            CurrentLane = 1;
            _laneX = transform.position.x;
            SetControllerHeight(standingHeight);
        }

        // Power-up hooks, invoked by PowerUpSystem.
        public void SetJetpack(bool active) => _jetpackActive = active;

        public void SetSneakers(bool active) => _sneakersActive = active;

        public void ProvideHoverboard() => _hoverboardCharges = 1;
    }
}
