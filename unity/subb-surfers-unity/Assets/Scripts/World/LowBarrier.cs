using UnityEngine;
using SubbSurfers.Player;

namespace SubbSurfers.World
{
    /// <summary>
    /// Low barrier spanning a lane — cleared by <b>rolling under</b> it.
    /// Trigger overlap with a non-rolling player counts as a hit.
    /// </summary>
    [RequireComponent(typeof(BoxCollider))]
    public class LowBarrier : MonoBehaviour
    {
        [Header("Body geometry (also applied to the collider on Reset)")]
        [SerializeField] private Vector3 bodySize = new Vector3(2.0f, 0.9f, 0.4f);
        [SerializeField] private Vector3 bodyCenter = new Vector3(0f, 0.45f, 0f);

        [SerializeField] private string playerTag = "Player";

        public bool ClearedByRoll => true;
        public bool ClearedByJump => false;

        /// <summary>World-space Y of the top surface of the barrier body.</summary>
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

            if (player.IsRolling)
            {
                return; // slid cleanly under the barrier
            }

            player.RegisterHit();
        }
    }
}
