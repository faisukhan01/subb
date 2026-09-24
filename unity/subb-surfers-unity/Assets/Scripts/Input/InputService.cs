using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace SubbSurfers.Input
{
    public enum MoveDirection
    {
        None,
        Left,
        Right
    }

    /// <summary>
    /// Central input service built on the new Input System package:
    ///  - keyboard bindings (A/D or arrows to change lanes, Space/W/Up to jump,
    ///    S/Down/Ctrl to roll, Esc/P to pause),
    ///  - touch + mouse-drag swipe detection evaluated in <c>Update</c>
    ///    (no on-screen stick required).
    ///
    /// Other systems subscribe to the events; nothing polls this class.
    /// </summary>
    [DefaultExecutionOrder(-50)]
    public sealed class InputService : MonoBehaviour
    {
        public static InputService Instance { get; private set; }

        [Header("Swipe detection")]
        [SerializeField] private float swipeThresholdPixels = 60f;

        public event Action<MoveDirection> Move;
        public event Action Jump;
        public event Action Roll;
        public event Action PausePressed;

        private InputAction _moveLeft;
        private InputAction _moveRight;
        private InputAction _jump;
        private InputAction _roll;
        private InputAction _pause;

        private Vector2 _pointerDownPosition;
        private bool _pointerActive;
        private bool _swipeConsumed;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
        }

        private void OnEnable()
        {
            _moveLeft = new InputAction("MoveLeft", InputActionType.Button);
            _moveLeft.AddBinding("<Keyboard>/a");
            _moveLeft.AddBinding("<Keyboard>/leftArrow");
            _moveLeft.performed += OnMoveLeft;

            _moveRight = new InputAction("MoveRight", InputActionType.Button);
            _moveRight.AddBinding("<Keyboard>/d");
            _moveRight.AddBinding("<Keyboard>/rightArrow");
            _moveRight.performed += OnMoveRight;

            _jump = new InputAction("Jump", InputActionType.Button);
            _jump.AddBinding("<Keyboard>/space");
            _jump.AddBinding("<Keyboard>/w");
            _jump.AddBinding("<Keyboard>/upArrow");
            _jump.performed += OnJumpPerformed;

            _roll = new InputAction("Roll", InputActionType.Button);
            _roll.AddBinding("<Keyboard>/s");
            _roll.AddBinding("<Keyboard>/downArrow");
            _roll.AddBinding("<Keyboard>/leftCtrl");
            _roll.performed += OnRollPerformed;

            _pause = new InputAction("Pause", InputActionType.Button);
            _pause.AddBinding("<Keyboard>/escape");
            _pause.AddBinding("<Keyboard>/p");
            _pause.performed += OnPausePerformed;

            _moveLeft.Enable();
            _moveRight.Enable();
            _jump.Enable();
            _roll.Enable();
            _pause.Enable();
        }

        private void OnDisable()
        {
            InputAction[] actions = { _moveLeft, _moveRight, _jump, _roll, _pause };
            foreach (InputAction action in actions)
            {
                if (action == null)
                {
                    continue;
                }

                action.Disable();
                action.Dispose();
            }

            _moveLeft = null;
            _moveRight = null;
            _jump = null;
            _roll = null;
            _pause = null;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Update()
        {
            PollGestures();
        }

        // ------------------------------------------------------------------
        // Swipe detection (touch first, mouse-drag as editor fallback)
        // ------------------------------------------------------------------

        private void PollGestures()
        {
            Touchscreen screen = Touchscreen.current;
            if (screen != null)
            {
                TouchControl touch = screen.primaryTouch;
                if (touch.press.wasPressedThisFrame)
                {
                    BeginSwipe(touch.position.ReadValue());
                }
                else if (_pointerActive && !touch.press.isPressed)
                {
                    EndSwipe(touch.position.ReadValue());
                }
                else if (_pointerActive)
                {
                    TryConsumeSwipe(touch.position.ReadValue());
                }

                return;
            }

            Mouse mouse = Mouse.current;
            if (mouse == null)
            {
                return;
            }

            if (mouse.leftButton.wasPressedThisFrame)
            {
                BeginSwipe(mouse.position.ReadValue());
            }
            else if (_pointerActive && mouse.leftButton.wasReleasedThisFrame)
            {
                EndSwipe(mouse.position.ReadValue());
            }
            else if (_pointerActive)
            {
                TryConsumeSwipe(mouse.position.ReadValue());
            }
        }

        private void BeginSwipe(Vector2 position)
        {
            _pointerDownPosition = position;
            _pointerActive = true;
            _swipeConsumed = false;
        }

        private void EndSwipe(Vector2 position)
        {
            if (!_swipeConsumed)
            {
                FireSwipeIfPastThreshold(position);
            }

            _pointerActive = false;
        }

        private void TryConsumeSwipe(Vector2 position)
        {
            if (_swipeConsumed)
            {
                return;
            }

            if (FireSwipeIfPastThreshold(position))
            {
                _swipeConsumed = true;
            }
        }

        private bool FireSwipeIfPastThreshold(Vector2 position)
        {
            Vector2 delta = position - _pointerDownPosition;
            if (delta.magnitude < swipeThresholdPixels)
            {
                return false;
            }

            FireSwipe(delta);
            return true;
        }

        private void FireSwipe(Vector2 delta)
        {
            if (Mathf.Abs(delta.x) > Mathf.Abs(delta.y))
            {
                Move?.Invoke(delta.x > 0f ? MoveDirection.Right : MoveDirection.Left);
            }
            else if (delta.y > 0f)
            {
                Jump?.Invoke();
            }
            else
            {
                Roll?.Invoke();
            }
        }

        // ------------------------------------------------------------------
        // InputAction callbacks
        // ------------------------------------------------------------------

        private void OnMoveLeft(InputAction.CallbackContext context) =>
            Move?.Invoke(MoveDirection.Left);

        private void OnMoveRight(InputAction.CallbackContext context) =>
            Move?.Invoke(MoveDirection.Right);

        private void OnJumpPerformed(InputAction.CallbackContext context) =>
            Jump?.Invoke();

        private void OnRollPerformed(InputAction.CallbackContext context) =>
            Roll?.Invoke();

        private void OnPausePerformed(InputAction.CallbackContext context) =>
            PausePressed?.Invoke();
    }
}
