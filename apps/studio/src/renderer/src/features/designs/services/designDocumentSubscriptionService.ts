import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { designService } from "./designService";
import type { Design } from "../types/design.types";

export const designDocumentSubscriptionService = {
  subscribeToDesign(
    designId: string,
    onDesignChange: (design: Design | null) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    const designRef = doc(firestoreCollectionService.getDesignsCollection(), designId);

    return onSnapshot(
      designRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onDesignChange(null);
          return;
        }

        try {
          const design = designService.mapFirestoreDesign(snapshot.id, snapshot.data());
          onDesignChange(design);
        } catch (error) {
          onError(error instanceof Error ? error : new Error("Unable to read the design update."));
        }
      },
      (error) => {
        onError(error);
      },
    );
  },
};
