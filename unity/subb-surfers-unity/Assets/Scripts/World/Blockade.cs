using UnityEngine;
using SubbSurfers.Player;

namespace SubbSurfers.World
{
    /// <summary>
    /// Tall blockade filling a lane — cleared by <b>jumping over</b> it.
    /// A trigger overlap only counts as a hit when the player's feet are still
    /// below the top of the blockade (with a small forgiveness margin).
    /// </summary>
    [RequireComponent(typeof(BoxCollider))]
    public class Blockade : MonoBehaviour
    {
        [Header("Body geometry (also applied to the collider on Reset)")]
        [SerializeField] private Vector3 bodySize = new Vector3(2.0f, 2.2f, 0.5f);
        [SerializeField] private Vector3 bodyCenter = new Vector3(0f, 1.1f, 0f);

        [SerializeField] private string playerTag = "Player";
        [SerializeField] private float clearanceForgiveness = 0.25f;

        public bool ClearedByRoll => false;
        public bool ClearedByJump => true;

        /// <summary>World-space Y of the top surface of the blockade body.</summary>
        public float TopHeight => transform.position.y + bodyCenter.y + bodySize.y * 0.5f;

        private void Reset()
        {
            BoxCollider collider = GetComponent<BoxCollider>();
            collider.isTrigger = true;
            collider.size = bodySize;
            collider.center = bodyCenter;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (!other.CompareTag(playerTag))
            {
                return;
            }

            PlayerController player = other.GetComponent<PlayerController>();
            if (player == null)
            {
                return;
            }

            // Cleared if the player's feet are above the top of the blockade.
            if (other.bounds.min.y >= TopHeight - clearanceForgiveness)
            {
                return;
            }

            player.RegisterHit();
        }
    }
}
