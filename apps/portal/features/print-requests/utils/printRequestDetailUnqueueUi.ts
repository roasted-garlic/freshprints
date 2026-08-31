import type { EvaluatePortalPrintRequestUnqueueResult } from '@fresh-prints/shared/utils/portalPrintRequestUnqueue';

export function resolveCanShowUnqueueFromShowCta(input: {
  isEditable: boolean;
  unqueueEligibility: Pick<EvaluatePortalPrintRequestUnqueueResult, 'eligible'>;
  hasPrimaryScheduledShow: boolean;
}): boolean {
  return (
    !input.isEditable && input.unqueueEligibility.eligible && input.hasPrimaryScheduledShow
  );
}
