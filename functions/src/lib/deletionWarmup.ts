import {
  isDeletionCallableWarmupRequest,
  type DeletionCallableWarmupResponse,
} from "../../../packages/shared/src/types/deletion/deletionWarmup.types";

export { isDeletionCallableWarmupRequest };

/** Side-effect-free success payload after Auth + role asserts. */
export function deletionWarmupOk(): DeletionCallableWarmupResponse {
  return { warmed: true };
}
