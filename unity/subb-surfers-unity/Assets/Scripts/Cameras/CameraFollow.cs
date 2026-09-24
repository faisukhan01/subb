using UnityEngine;
using SubbSurfers.Core;

namespace SubbSurfers.Cameras
{
    /// <summary>
    /// Chase camera: SmoothDamps behind the player and opens the field of view
    /// slightly as the world speeds up for a sense of acceleration.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public sealed class CameraFollow : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0f, 4.5f, -7.5f);

        [Header("Smoothing")]
        [SerializeField] private float positionSmoothTime = 0.22f;
        [SerializeField] private float maxPositionSpeed = 60f;

        [Header("Field of view")]
        [SerializeField] private float baseFieldOfView = 62f;
        [SerializeField] private float fovPerSpeedUnit = 0.35f;
        [SerializeField] private float maxFieldOfView = 78f;

        private Camera _camera;
        private Vector3 _positionVelocity;

        private void Awake()
        {
            _camera = GetComponent<Camera>();
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            Vector3 desired = target.position + offset;
            transform.position = Vector3.SmoothDamp(
                transform.position,
                desired,
                ref _positionVelocity,
                positionSmoothTime,
                maxPositionSpeed);

            if (_camera != null)
            {
                float worldSpeed = GameBootstrap.Instance != null
                    ? GameBootstrap.Instance.CurrentWorldSpeed
                    : 0f;
                float desiredFov = Mathf.Min(
                    maxFieldOfView,
                    baseFieldOfView + worldSpeed * fovPerSpeedUnit);
                _camera.fieldOfView = Mathf.MoveTowards(
                    _camera.fieldOfView,
                    desiredFov,
                    30f * Time.deltaTime);
            }
        }

        /// <summary>Teleports the camera to the follow position (run start).</summary>
        public void SnapToTarget()
        {
            if (target == null)
            {
                return;
            }

            transform.position = target.position + offset;
            _positionVelocity = Vector3.zero;
        }
    }
}
