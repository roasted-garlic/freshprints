import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import type {
  SetPrintRequestItemArtworkEnhanceModeRequest,
  SetPrintRequestItemArtworkEnhanceModeResponse,
} from '@fresh-prints/shared/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types';

export const setPrintRequestItemArtworkEnhanceModeService = {
  async setMode(
    request: SetPrintRequestItemArtworkEnhanceModeRequest,
  ): Promise<SetPrintRequestItemArtworkEnhanceModeResponse> {
    const invoke = callTracedFunction<
      SetPrintRequestItemArtworkEnhanceModeRequest,
      SetPrintRequestItemArtworkEnhanceModeResponse
    >('setPrintRequestItemArtworkEnhanceMode', {
      source: 'portal.setPrintRequestItemArtworkEnhanceMode',
    });
    return invoke(request);
  },
};
