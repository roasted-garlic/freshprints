import {
  deleteField,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from "firebase/firestore";

import { runTracedWrite } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { getFirestoreErrorMessage } from "../../firebase/utils/firestoreErrorMessage";
import { assertNoUndefinedFirestoreFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import type { Design } from "../types/design.types";
import { addCompanionNeighbor, buildCompanionLinkId, listCompanionPeerLinkPairs, listFullMeshLinkPairs, removeCompanionNeighbor, sortedCompanionPair } from "../utils/companionSetHelpers";
import { designService } from "./designService";

/**
 * Sole owner of `companionLinks/{id}` mutations and the denormalized `companionDesignIds` /
 * `companionSetIncomplete` fields on linked `designs` documents. Writes those design fields
 * (plus `updatedAt` / `updatedBy`) directly via Firestore transactions — it never calls
 * `designService.updateDesign` and never writes `status` or any other lifecycle field.
 *
 * Companions are **pairwise (non-transitive) edges**, not transitive groups: linking B↔D when D
 * is already linked to A must never make A and B "match". Every link/unlink operates on exactly
 * one edge between exactly two designs; a design's matches are only its direct
 * `companionDesignIds` neighbors. The legacy transitive `companionSets` / `companionSetId` group
 * model is retired for product behavior — see `CompanionSet` in `companionSet.types.ts` — and is
 * never read here. Any pairwise write this service makes to a design also heals (deletes) a
 * stale legacy `companionSetId` on that design, so staff UI can never see mixed old/new signals.
 */

const MARK_NEEDS_COMPANION_LINKED_ERROR_MESSAGE =
  "This design already has a companion link. Unlink it before marking it as needing a companion.";

const CLEAR_NEEDS_COMPANION_LINKED_ERROR_MESSAGE =
  "This design has a companion link. Unlink it before clearing the companion queue flag.";

const KNOWN_COMPANION_LINK_ERROR_MESSAGES = [
  "The design record was not found.",
  "The anchor design record was not found.",
  "The target design record was not found.",
  "A design cannot be linked to itself as a companion.",
  "A design cannot be unlinked from itself.",
  MARK_NEEDS_COMPANION_LINKED_ERROR_MESSAGE,
  CLEAR_NEEDS_COMPANION_LINKED_ERROR_MESSAGE,
];

function isKnownCompanionLinkError(error: unknown): error is Error {
  return error instanceof Error && KNOWN_COMPANION_LINK_ERROR_MESSAGES.includes(error.message);
}

function assertCanManageCompanionLinks(caller: User): void {
  if (!permissionService.canEditDesigns(caller)) {
    throw new Error("You do not have permission to manage companion design links.");
  }
}

function companionLinkDocRef(linkId: string): DocumentReference {
  return doc(firestoreCollectionService.getCompanionLinksCollection(), linkId);
}

function designDocRef(designId: string): DocumentReference {
  return doc(firestoreCollectionService.getDesignsCollection(), designId);
}

function getCompanionLinksFirestore() {
  return firestoreCollectionService.getCompanionLinksCollection().firestore;
}

function readCompanionDesignIds(designData: Record<string, unknown>): string[] {
  const companionDesignIds = designData.companionDesignIds;
  return Array.isArray(companionDesignIds)
    ? companionDesignIds.filter((id): id is string => typeof id === "string")
    : [];
}

/**
 * Denorm write for one side of a link. Syncs the neighbor array, clears the unlinked-only queue
 * flag (a linked design is never "Needs Companion"), and heals a stale legacy `companionSetId`
 * pointer. Never writes `status`.
 */
function linkDenormPayload(callerId: string, companionDesignIds: string[]): Record<string, unknown> {
  return {
    companionDesignIds,
    companionSetId: deleteField(),
    companionSetIncomplete: false,
    updatedAt: serverTimestamp(),
    updatedBy: callerId,
  };
}

/**
 * Denorm write for one side of an unlink. Syncs the neighbor array (deleting the field entirely
 * once empty, matching the optional-array field convention) and heals a stale legacy
 * `companionSetId` pointer. Deliberately never touches `companionSetIncomplete` — unlink never
 * auto-raises Needs Companion, and a design that was linked must already have the flag cleared.
 * Never writes `status`.
 */
function unlinkDenormPayload(callerId: string, companionDesignIds: string[]): Record<string, unknown> {
  return {
    companionDesignIds: companionDesignIds.length > 0 ? companionDesignIds : deleteField(),
    companionSetId: deleteField(),
    updatedAt: serverTimestamp(),
    updatedBy: callerId,
  };
}

/**
 * Queue-only write — touches `companionSetIncomplete` alone (set to the given boolean, or
 * deleted when `null`) and never includes `companionDesignIds` / `companionSetId` in the
 * payload. Used for designs that are not (and must not become) linked. Never writes `status`.
 */
function queueOnlyCompanionDenormPayload(
  callerId: string,
  companionSetIncomplete: boolean | null,
): Record<string, unknown> {
  return {
    companionSetIncomplete: companionSetIncomplete === null ? deleteField() : companionSetIncomplete,
    updatedAt: serverTimestamp(),
    updatedBy: callerId,
  };
}

/**
 * Links two designs by creating the canonical `companionLinks/{minId_maxId}` edge (if it does not
 * already exist — duplicate links are prevented by the deterministic ID) and symmetrically
 * syncing both designs' `companionDesignIds`. Firestore transactions require all reads before
 * any writes, so both design docs and the edge doc are read up front.
 *
 * - Edge already exists: idempotent no-op success (nothing to heal or write — the two designs'
 *   neighbor arrays are already in sync from when the edge was first created).
 * - Edge does not exist: create it, add each design to the other's `companionDesignIds`, and
 *   clear `companionSetIncomplete` on both (first/any link always clears the unlinked queue).
 */
async function linkDesignInTransaction(
  transaction: Transaction,
  callerId: string,
  designAId: string,
  designBId: string,
): Promise<void> {
  if (designAId === designBId) {
    throw new Error("A design cannot be linked to itself as a companion.");
  }

  const linkRef = companionLinkDocRef(buildCompanionLinkId(designAId, designBId));
  const designARef = designDocRef(designAId);
  const designBRef = designDocRef(designBId);

  const [linkSnapshot, designASnapshot, designBSnapshot] = await Promise.all([
    transaction.get(linkRef),
    transaction.get(designARef),
    transaction.get(designBRef),
  ]);

  if (!designASnapshot.exists()) {
    throw new Error("The anchor design record was not found.");
  }

  if (!designBSnapshot.exists()) {
    throw new Error("The target design record was not found.");
  }

  if (linkSnapshot.exists()) {
    return;
  }

  const [sortedFirst, sortedSecond] = sortedCompanionPair(designAId, designBId);
  const linkPayload = {
    id: linkRef.id,
    designIds: [sortedFirst, sortedSecond],
    createdBy: callerId,
    updatedBy: callerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  assertNoUndefinedFirestoreFields(linkPayload, "Companion link create payload");
  transaction.set(linkRef, linkPayload);

  const designACompanionIds = addCompanionNeighbor(readCompanionDesignIds(designASnapshot.data()), designBId);
  const designBCompanionIds = addCompanionNeighbor(readCompanionDesignIds(designBSnapshot.data()), designAId);

  transaction.update(designARef, linkDenormPayload(callerId, designACompanionIds));
  transaction.update(designBRef, linkDenormPayload(callerId, designBCompanionIds));
}

/**
 * Unlinks two designs by deleting the `companionLinks/{minId_maxId}` edge (if present) and
 * symmetrically removing each from the other's `companionDesignIds`. Idempotent when the edge is
 * already absent. Never auto-raises "Needs Companion" — a design that falls out of its last link
 * simply becomes unlinked; staff must explicitly mark it again to join the working queue.
 */
async function unlinkPairInTransaction(
  transaction: Transaction,
  callerId: string,
  designAId: string,
  designBId: string,
): Promise<void> {
  if (designAId === designBId) {
    throw new Error("A design cannot be unlinked from itself.");
  }

  const linkRef = companionLinkDocRef(buildCompanionLinkId(designAId, designBId));
  const designARef = designDocRef(designAId);
  const designBRef = designDocRef(designBId);

  const [linkSnapshot, designASnapshot, designBSnapshot] = await Promise.all([
    transaction.get(linkRef),
    transaction.get(designARef),
    transaction.get(designBRef),
  ]);

  if (!designASnapshot.exists()) {
    throw new Error("The anchor design record was not found.");
  }

  if (!designBSnapshot.exists()) {
    throw new Error("The target design record was not found.");
  }

  if (!linkSnapshot.exists()) {
    return;
  }

  transaction.delete(linkRef);

  const designACompanionIds = removeCompanionNeighbor(readCompanionDesignIds(designASnapshot.data()), designBId);
  const designBCompanionIds = removeCompanionNeighbor(readCompanionDesignIds(designBSnapshot.data()), designAId);

  transaction.update(designARef, unlinkDenormPayload(callerId, designACompanionIds));
  transaction.update(designBRef, unlinkDenormPayload(callerId, designBCompanionIds));
}

/**
 * Raises the "Needs Companion" queue flag. **Unlinked-only** — rejects outright once a design
 * has any companion neighbor (`companionDesignIds` non-empty); the caller must unlink first.
 * Never creates or touches a companion link.
 */
async function markNeedsCompanionInTransaction(
  transaction: Transaction,
  callerId: string,
  designId: string,
): Promise<void> {
  const designRef = designDocRef(designId);
  const designSnapshot = await transaction.get(designRef);

  if (!designSnapshot.exists()) {
    throw new Error("The design record was not found.");
  }

  const companionDesignIds = readCompanionDesignIds(designSnapshot.data());

  if (companionDesignIds.length > 0) {
    throw new Error(MARK_NEEDS_COMPANION_LINKED_ERROR_MESSAGE);
  }

  transaction.update(designRef, queueOnlyCompanionDenormPayload(callerId, true));
}

/**
 * Clears the "Needs Companion" queue flag, but only for a design that has no companion
 * neighbors. Rejects if the design has any link — the caller must unlink first.
 */
async function clearNeedsCompanionUnlinkedInTransaction(
  transaction: Transaction,
  callerId: string,
  designId: string,
): Promise<void> {
  const designRef = designDocRef(designId);
  const designSnapshot = await transaction.get(designRef);

  if (!designSnapshot.exists()) {
    throw new Error("The design record was not found.");
  }

  const companionDesignIds = readCompanionDesignIds(designSnapshot.data());

  if (companionDesignIds.length > 0) {
    throw new Error(CLEAR_NEEDS_COMPANION_LINKED_ERROR_MESSAGE);
  }

  transaction.update(designRef, queueOnlyCompanionDenormPayload(callerId, null));
}

async function listLinkedDesignsSnapshots(companionDesignIds: string[]): Promise<DocumentSnapshot[]> {
  return Promise.all(companionDesignIds.map((companionDesignId) => getDoc(designDocRef(companionDesignId))));
}

async function runLinkDesign(caller: User, designAId: string, designBId: string): Promise<void> {
  assertCanManageCompanionLinks(caller);

  try {
    await runTracedWrite(
      "runTransaction",
      () =>
        runTransaction(getCompanionLinksFirestore(), (transaction) =>
          linkDesignInTransaction(transaction, caller.id, designAId, designBId),
        ),
      {
        app: "studio",
        collection: "companionLinks",
        documentPathPattern: "companionLinks/{linkId}",
        source: "companionSetService.linkDesign",
      },
      { writeCount: 3 },
    );
    designService.invalidateReadCaches(designAId);
    designService.invalidateReadCaches(designBId);
  } catch (error) {
    if (isKnownCompanionLinkError(error)) {
      throw error;
    }

    throw new Error(getFirestoreErrorMessage(error, "Unable to link the companion design. Please try again."));
  }
}

export const companionSetService = {
  /**
   * Raises the "Needs Companion" queue flag. Rejects if the design already has any companion
   * link — see `markNeedsCompanionInTransaction`.
   */
  async markNeedsCompanion(caller: User, designId: string): Promise<void> {
    assertCanManageCompanionLinks(caller);

    try {
      await runTracedWrite(
        "runTransaction",
        () =>
          runTransaction(getCompanionLinksFirestore(), (transaction) =>
            markNeedsCompanionInTransaction(transaction, caller.id, designId),
          ),
        {
          app: "studio",
          collection: "designs",
          documentPathPattern: "designs/{designId}",
          source: "companionSetService.markNeedsCompanion",
        },
        { writeCount: 1 },
      );
      designService.invalidateReadCaches(designId);
    } catch (error) {
      if (isKnownCompanionLinkError(error)) {
        throw error;
      }

      throw new Error(
        getFirestoreErrorMessage(error, "Unable to mark this design as needing a companion. Please try again."),
      );
    }
  },

  /**
   * Clears the "Needs Companion" queue flag on a design that has no companion links. Throws if
   * the design has any link — unlink it first.
   */
  async clearNeedsCompanionUnlinked(caller: User, designId: string): Promise<void> {
    assertCanManageCompanionLinks(caller);

    try {
      await runTracedWrite(
        "runTransaction",
        () =>
          runTransaction(getCompanionLinksFirestore(), (transaction) =>
            clearNeedsCompanionUnlinkedInTransaction(transaction, caller.id, designId),
          ),
        {
          app: "studio",
          collection: "designs",
          documentPathPattern: "designs/{designId}",
          source: "companionSetService.clearNeedsCompanionUnlinked",
        },
        { writeCount: 1 },
      );
      designService.invalidateReadCaches(designId);
    } catch (error) {
      if (isKnownCompanionLinkError(error)) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to clear the companion queue flag. Please try again."));
    }
  },

  /**
   * Links `designAId` and `designBId` as direct companions. Idempotent — linking an already-
   * linked pair is a no-op success. See `linkDesignInTransaction`.
   */
  async linkDesign(caller: User, designAId: string, designBId: string): Promise<void> {
    await runLinkDesign(caller, designAId, designBId);
  },

  /**
   * Links `peerIds` to `anchorId` and fully meshes the new peers with each other. Use when
   * linking color variants or other siblings that should all see one another — not only the anchor.
   */
  async linkCompanionPeers(caller: User, anchorId: string, peerIds: string[]): Promise<void> {
    const pairs = listCompanionPeerLinkPairs(anchorId, peerIds);

    for (const [designAId, designBId] of pairs) {
      await runLinkDesign(caller, designAId, designBId);
    }
  },

  /**
   * Creates any missing direct links among this design and its current companion neighbors so
   * every member of the group can see every other member (e.g. repair a star-only color set).
   */
  async meshAllCompanionNeighbors(caller: User, designId: string): Promise<void> {
    assertCanManageCompanionLinks(caller);

    const designSnapshot = await getDoc(designDocRef(designId));

    if (!designSnapshot.exists()) {
      throw new Error("The design record was not found.");
    }

    const neighborIds = readCompanionDesignIds(designSnapshot.data() as Record<string, unknown>);

    if (neighborIds.length === 0) {
      return;
    }

    const pairs = listFullMeshLinkPairs([designId, ...neighborIds]);

    for (const [designAId, designBId] of pairs) {
      await runLinkDesign(caller, designAId, designBId);
    }
  },

  /**
   * Removes the direct companion link between `designAId` and `designBId`. Idempotent — unlinking
   * an already-unlinked pair is a no-op success. Never auto-raises Needs Companion on either
   * side. See `unlinkPairInTransaction`.
   */
  async unlinkPair(caller: User, designAId: string, designBId: string): Promise<void> {
    assertCanManageCompanionLinks(caller);

    try {
      await runTracedWrite(
        "runTransaction",
        () =>
          runTransaction(getCompanionLinksFirestore(), (transaction) =>
            unlinkPairInTransaction(transaction, caller.id, designAId, designBId),
          ),
        {
          app: "studio",
          collection: "companionLinks",
          documentPathPattern: "companionLinks/{linkId}",
          source: "companionSetService.unlinkPair",
        },
        { writeCount: 3 },
      );
      designService.invalidateReadCaches(designAId);
      designService.invalidateReadCaches(designBId);
    } catch (error) {
      if (isKnownCompanionLinkError(error)) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to unlink the companion design. Please try again."));
    }
  },

  /**
   * @deprecated Companion links have no group completion state — pairwise links are either
   * present or absent. Kept as a stub only so any lingering caller fails loudly instead of
   * silently touching a `companionSets` document.
   */
  async setCompanionSetComplete(): Promise<never> {
    throw new Error(
      "setCompanionSetComplete is deprecated — companion designs are pairwise links with no group completion state.",
    );
  },

  /**
   * Reads `designId`'s direct `companionDesignIds` neighbors and loads those designs (Studio
   * Companion modal). Skips (and logs) any neighbor ID that no longer resolves to a design.
   */
  async listLinkedDesigns(designId: string): Promise<Design[]> {
    try {
      const designSnapshot = await getDoc(designDocRef(designId));

      if (!designSnapshot.exists()) {
        return [];
      }

      const companionDesignIds = readCompanionDesignIds(designSnapshot.data() as Record<string, unknown>);

      if (companionDesignIds.length === 0) {
        return [];
      }

      const snapshots = await listLinkedDesignsSnapshots(companionDesignIds);

      return snapshots.flatMap((snapshot) => {
        if (!snapshot.exists()) {
          return [];
        }

        try {
          return [designService.mapFirestoreDesign(snapshot.id, snapshot.data())];
        } catch (error) {
          console.warn(
            `[companionSetService] Skipping incomplete companion neighbor design ${snapshot.id}:`,
            error instanceof Error ? error.message : error,
          );
          return [];
        }
      });
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to load companion designs. Please try again."));
    }
  },
};
