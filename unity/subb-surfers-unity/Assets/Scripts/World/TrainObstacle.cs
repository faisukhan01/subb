using System;
using UnityEngine;

namespace SubbSurfers.World
{
    /// <summary>
    /// Train obstacle. Players can land on its roof (roofHeight = 3) or crash
    /// into its side; optionally moves backwards relative to the world with an
    /// optional headlight child.
    /// </summary>
    [RequireComponent(typeof(BoxCollider))]
    public class TrainObstacle : MonoBehaviour
    {
        public const float DefaultRoofHeight = 3f;

        [Header("Roof")]
        [SerializeField] private float roofHeight = DefaultRoofHeight;

        [Header("Movement (relative to the world)")]
        [SerializeField] private bool isMoving;
        [SerializeField, Min(0f)] private float relativeSpeed = 6f;

        [Header("Optional headlight child")]
        [SerializeField] private Light headlight;

        [SerializeField] private string playerTag = "Player";

        /// <summary>Raised when the player controller lands on the train roof.</summary>
        public event Action<GameObject> OnPlayerLandOnRoof;

        public float RoofHeight => roofHeight;
        public bool IsMoving => isMoving;

        /// <summary>World-space Y of the roof surface (pivot assumed at the base).</summary>
        public float RoofWorldY => transform.position.y + roofHeight;

        private void OnEnable()
        {
            if (headlight != null)
            {
                headlight.enabled = true;
            }
        }

        private void Update()
        {
            if (!isMoving)
            {
                return;
            }

            transform.Translate(Vector3.back * (relativeSpeed * Time.deltaTime), Space.World);
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (!collision.collider.CompareTag(playerTag))
            {
                return;
            }

            foreach (ContactPoint contact in collision.contacts)
            {
                if (contact.point.y >= RoofWorldY - 0.5f)
                {
                    OnPlayerLandOnRoof?.Invoke(collision.collider.gameObject);
                    return;
                }
            }

            // Side hit — lethal (hoverboard still applies inside the controller).
            Player.PlayerController player = collision.collider.GetComponent<Player.PlayerController>();
            if (player != null)
            {
                player.RegisterHit();
            }
        }
    }
}
