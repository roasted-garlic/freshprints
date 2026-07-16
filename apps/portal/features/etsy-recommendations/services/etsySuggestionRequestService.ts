'use client';

import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

import type {
  SubmitEtsySuggestionRequestRequest,
  SubmitEtsySuggestionRequestResponse,
} from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types';

import { getPortalFunctions } from '../../../lib/firebase/client';

function mapCallableError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    return new Error(error.message);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('Unable to submit that suggestion request.');
}

export async function submitEtsySuggestionRequest(
  input: SubmitEtsySuggestionRequestRequest,
): Promise<SubmitEtsySuggestionRequestResponse> {
  try {
    const callable = httpsCallable<
      SubmitEtsySuggestionRequestRequest,
      SubmitEtsySuggestionRequestResponse
    >(getPortalFunctions(), 'submitEtsySuggestionRequest');
    const response = await callable(input);
    return response.data;
  } catch (error) {
    throw mapCallableError(error);
  }
}
