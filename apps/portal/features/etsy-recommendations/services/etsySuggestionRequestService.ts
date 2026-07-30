'use client';

import { FirebaseError } from 'firebase/app';

import type {
  SubmitEtsySuggestionRequestRequest,
  SubmitEtsySuggestionRequestResponse,
} from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';

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
    return await callTracedFunction<
      SubmitEtsySuggestionRequestRequest,
      SubmitEtsySuggestionRequestResponse
    >('submitEtsySuggestionRequest', {
      source: 'etsySuggestionRequestService.submitEtsySuggestionRequest',
    })(input);
  } catch (error) {
    throw mapCallableError(error);
  }
}
