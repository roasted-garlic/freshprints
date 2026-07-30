import { FirebaseError } from 'firebase/app';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import { ETSY_RECOMMENDATION_COLLECTION } from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';
import type {
  EtsyRecommendationRequestIdRequest,
  EtsyRecommendationRequestIdResponse,
  GetEtsyRecommendationSearchQuotaRequest,
  GetEtsyRecommendationSearchQuotaResponse,
  EtsyRecommendationPreviewQuota,
  SearchEtsyRecommendationsRequest,
  SearchEtsyRecommendationsResponse,
  SubmitEtsyRecommendationRequestRequest,
  SubmitEtsyRecommendationRequestResponse,
} from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types';
import type {
  EtsyRecommendationAnswers,
  EtsyRecommendationRequest,
} from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.types';
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalDb } from '../../../lib/firebase/client';
import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { portalAuthService } from '../../auth/services/authService';

export class EtsyRecommendationCallableError extends Error {
  readonly code: string;
  readonly previewQuota?: EtsyRecommendationPreviewQuota;

  constructor(message: string, code: string, previewQuota?: EtsyRecommendationPreviewQuota) {
    super(message);
    this.name = 'EtsyRecommendationCallableError';
    this.code = code;
    this.previewQuota = previewQuota;
  }
}

export function isReplaceActiveRequiredError(error: unknown): boolean {
  return (
    error instanceof EtsyRecommendationCallableError &&
    error.code === 'functions/failed-precondition'
  );
}

function extractPreviewQuota(error: FirebaseError): EtsyRecommendationPreviewQuota | undefined {
  const details = (error as FirebaseError & { details?: { previewQuota?: EtsyRecommendationPreviewQuota } })
    .details;
  if (details && typeof details === 'object' && details.previewQuota) {
    return details.previewQuota;
  }
  return undefined;
}

function mapCallableError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    return new EtsyRecommendationCallableError(
      portalAuthService.getCallableErrorMessage(error),
      error.code,
      extractPreviewQuota(error),
    );
  }
  return new Error(portalAuthService.getCallableErrorMessage(error));
}

function parseRequestDoc(
  id: string,
  data: Record<string, unknown> | undefined,
): EtsyRecommendationRequest | null {
  if (!data) {
    return null;
  }
  if (data.status !== 'active' && data.status !== 'completed' && data.status !== 'cancelled') {
    return null;
  }
  if (data.route !== 'etsy_recommendations') {
    return null;
  }
  const answersRaw = data.answers;
  if (answersRaw == null || typeof answersRaw !== 'object' || Array.isArray(answersRaw)) {
    return null;
  }
  const answersRecord = answersRaw as Record<string, unknown>;
  const subjectText =
    typeof answersRecord.subjectText === 'string' ? answersRecord.subjectText.trim() : '';
  const subjects = Array.isArray(answersRecord.subjects)
    ? answersRecord.subjects.filter(
        (entry): entry is NonNullable<EtsyRecommendationAnswers['subjects']>[number] =>
          typeof entry === 'string',
      )
    : [];
  if (!subjectText && subjects.length === 0) {
    return null;
  }
  const answers: EtsyRecommendationAnswers = {};
  if (subjectText) {
    answers.subjectText = subjectText;
  }
  if (subjects.length > 0) {
    answers.subjects = subjects;
  }
  if (typeof answersRecord.wording === 'string' && answersRecord.wording.trim()) {
    answers.wording = answersRecord.wording;
  }
  if (Array.isArray(answersRecord.styles)) {
    const styles = answersRecord.styles.filter((entry): entry is string => typeof entry === 'string');
    if (styles.length > 0) {
      answers.styles = styles;
    }
  }
  if (Array.isArray(answersRecord.occasions)) {
    answers.occasions = answersRecord.occasions.filter(
      (entry): entry is NonNullable<EtsyRecommendationAnswers['occasions']>[number] =>
        typeof entry === 'string',
    );
  }

  return {
    id,
    schemaVersion: 1,
    customerId: typeof data.customerId === 'string' ? data.customerId : '',
    customerUid: typeof data.customerUid === 'string' ? data.customerUid : '',
    route: 'etsy_recommendations',
    status: data.status,
    answers,
    canonicalQuery: typeof data.canonicalQuery === 'string' ? data.canonicalQuery : '',
    etsySearchUrl: typeof data.etsySearchUrl === 'string' ? data.etsySearchUrl : '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export const etsyRecommendationService = {
  async submitRequest(
    input: SubmitEtsyRecommendationRequestRequest,
  ): Promise<SubmitEtsyRecommendationRequestResponse> {
    try {
      return await callTracedFunction<
        SubmitEtsyRecommendationRequestRequest,
        SubmitEtsyRecommendationRequestResponse
      >('submitEtsyRecommendationRequest', {
        source: 'etsyRecommendationService.submitRequest',
      })(input);
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async completeRequest(requestId: string): Promise<EtsyRecommendationRequestIdResponse> {
    try {
      return await callTracedFunction<
        EtsyRecommendationRequestIdRequest,
        EtsyRecommendationRequestIdResponse
      >('completeEtsyRecommendationRequest', {
        source: 'etsyRecommendationService.completeRequest',
      })({ requestId });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async cancelRequest(requestId: string): Promise<EtsyRecommendationRequestIdResponse> {
    try {
      return await callTracedFunction<
        EtsyRecommendationRequestIdRequest,
        EtsyRecommendationRequestIdResponse
      >('cancelEtsyRecommendationRequest', {
        source: 'etsyRecommendationService.cancelRequest',
      })({ requestId });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async searchListings(requestId: string): Promise<SearchEtsyRecommendationsResponse> {
    try {
      return await callTracedFunction<
        SearchEtsyRecommendationsRequest,
        SearchEtsyRecommendationsResponse
      >('searchEtsyRecommendations', {
        source: 'etsyRecommendationService.searchListings',
      })({ requestId });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async getSearchQuota(requestId: string): Promise<GetEtsyRecommendationSearchQuotaResponse> {
    try {
      return await callTracedFunction<
        GetEtsyRecommendationSearchQuotaRequest,
        GetEtsyRecommendationSearchQuotaResponse
      >('getEtsyRecommendationSearchQuota', {
        source: 'etsyRecommendationService.getSearchQuota',
      })({ requestId });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async getRequest(requestId: string): Promise<EtsyRecommendationRequest | null> {
    try {
      const ref = doc(getPortalDb(), ETSY_RECOMMENDATION_COLLECTION, requestId.trim());
      const traceMetadata = {
        app: 'portal' as const,
        collection: ETSY_RECOMMENDATION_COLLECTION,
        documentPathPattern: `${ETSY_RECOMMENDATION_COLLECTION}/{requestId}`,
        source: 'etsyRecommendationService.getRequest',
        triggerReason: 'route' as const,
      };
      traceFirestoreOneShotStart('getDoc', traceMetadata);
      const snapshot = await getDoc(ref);
      traceFirestoreOneShotComplete('getDoc', traceMetadata, snapshot.exists() ? 1 : 0);
      if (!snapshot.exists()) {
        return null;
      }
      return parseRequestDoc(snapshot.id, snapshot.data() as Record<string, unknown>);
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  listenToRequest(
    requestId: string,
    onUpdate: (request: EtsyRecommendationRequest | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const ref = doc(getPortalDb(), ETSY_RECOMMENDATION_COLLECTION, requestId);
    const traceMetadata = {
      app: 'portal' as const,
      collection: ETSY_RECOMMENDATION_COLLECTION,
      documentPathPattern: `${ETSY_RECOMMENDATION_COLLECTION}/{requestId}`,
      source: 'etsyRecommendationService.listenToRequest',
      triggerReason: 'route' as const,
    };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.exists() ? 1 : 0);
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate(parseRequestDoc(snapshot.id, snapshot.data() as Record<string, unknown>));
      },
      (error) => {
        onError?.(new Error(portalAuthService.getCallableErrorMessage(error)));
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },
};
