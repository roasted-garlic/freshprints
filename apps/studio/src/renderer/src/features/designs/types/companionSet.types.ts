import type { Timestamp } from "firebase/firestore";

/**
 * @deprecated Legacy transitive group model, replaced 2026-08-09 by pairwise `companionLinks`
 * (see `CompanionLink`). New product code must not create, join, or read these — linking two
 * designs that already belonged to different sets used to incorrectly transit their other
 * members into "matches". No migration converts old set membership into pairwise edges. Kept
 * only so legacy DEV `companionSets` documents remain typeable for manual staff cleanup.
 */
export interface CompanionSet {
  id: string;
  memberDesignIds: string[];
  complete: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

/**
 * `companionLinks/{linkId}` — the canonical pairwise (non-transitive) companion edge between
 * exactly two designs. `linkId` = `${min(a,b)}_${max(a,b)}` and `designIds` is that same pair
 * sorted ascending, so the doc ID and contents are always derivable from either design ID and a
 * duplicate edge can never be created. Staff-only; never customer/public readable. Owned
 * exclusively by `companionSetService`, which mirrors each side of the edge onto the matching
 * design's `companionDesignIds` denorm array in the same transaction.
 */
export interface CompanionLink {
  id: string;
  designIds: [string, string];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
