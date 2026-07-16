'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { EtsyRecommendationPreviewQuota } from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types';
import type {
  EtsyRecommendationAnswers,
  EtsyRecommendationListing,
  EtsyRecommendationRequest,
} from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.types';
import {
  buildEtsyRecommendationBroaderQuery,
  buildEtsyRecommendationCanonicalQuery,
  buildEtsyRecommendationSearchUrl,
} from '@fresh-prints/shared/utils/etsyRecommendationQueryBuilder';
import { parseEtsyRecommendationAnswers } from '@fresh-prints/shared/utils/etsyRecommendationValidation';

import { etsyRecommendationService, EtsyRecommendationCallableError } from '../services/etsyRecommendationService';
import {
  listEtsyMultiValueInputValues,
  normalizeEtsyMultiValueInput,
} from '../utils/applyEtsySubjectSuggestion';
import {
  clearEtsyRecommendationDraft,
} from '../utils/etsyRecommendationDraftStorage';
import {
  buildEtsyRecommendationHref,
  parseEtsyRecommendationUrl,
  urlStepToView,
  type EtsyRecommendationView,
} from '../utils/etsyRecommendationUrlState';

export type { EtsyRecommendationView };

export interface EtsyRecommendationAnswersState {
  subjectText: string;
  styleText: string;
  wording: string;
}

const EMPTY_ANSWERS: EtsyRecommendationAnswersState = {
  subjectText: '',
  styleText: '',
  wording: '',
};

function answersFromRequest(request: EtsyRecommendationRequest): EtsyRecommendationAnswersState {
  const styles = request.answers.styles ?? [];
  return {
    subjectText: request.answers.subjectText?.trim() || request.answers.subjects?.[0] || '',
    styleText: styles.map((style) => style.trim()).filter(Boolean).join(', '),
    wording: request.answers.wording?.trim() ?? '',
  };
}

function toParsedAnswers(answers: EtsyRecommendationAnswersState) {
  const styles = listEtsyMultiValueInputValues(answers.styleText);
  return parseEtsyRecommendationAnswers({
    subjectText: normalizeEtsyMultiValueInput(answers.subjectText) || undefined,
    styles: styles.length > 0 ? styles : undefined,
    wording: answers.wording || undefined,
  });
}

function buildBroaderUrlFromAnswers(answers: EtsyRecommendationAnswers): string {
  return buildEtsyRecommendationSearchUrl(buildEtsyRecommendationBroaderQuery(answers));
}

export function useEtsyRecommendationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<EtsyRecommendationView>('choose');
  const [answers, setAnswers] = useState<EtsyRecommendationAnswersState>(EMPTY_ANSWERS);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [canonicalQuery, setCanonicalQuery] = useState('');
  const [etsySearchUrl, setEtsySearchUrl] = useState('');
  const [broaderSearchUrl, setBroaderSearchUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [isSearchingAgain, setIsSearchingAgain] = useState(false);
  const [isRestoringFromUrl, setIsRestoringFromUrl] = useState(true);
  const [listings, setListings] = useState<EtsyRecommendationListing[]>([]);
  const [listingsMessage, setListingsMessage] = useState<string | null>(null);
  const [previewQuota, setPreviewQuota] = useState<EtsyRecommendationPreviewQuota | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const hasHydratedFromUrlRef = useRef(false);
  const previousViewRef = useRef<EtsyRecommendationView>('choose');
  const previousSearchKeyRef = useRef<string | null>(null);

  const searchPreview = useMemo(() => {
    try {
      return buildEtsyRecommendationCanonicalQuery(toParsedAnswers(answers));
    } catch {
      return '';
    }
  }, [answers]);

  const refreshPreviewQuota = useCallback(async (activeRequestId: string) => {
    try {
      const result = await etsyRecommendationService.getSearchQuota(activeRequestId);
      setPreviewQuota(result.previewQuota);
    } catch {
      // Quota display is optional if the read fails.
    }
  }, []);

  const loadListingsForRequest = useCallback(async (activeRequestId: string) => {
    setIsLoadingListings(true);
    setListingsMessage(null);
    try {
      const response = await etsyRecommendationService.searchListings(activeRequestId);
      setListings(response.listings);
      setPreviewQuota(response.previewQuota);
      if (response.status === 'unavailable') {
        setListingsMessage(
          'Listing previews are unavailable right now. Use the Etsy browse cards above to open a search in a new tab.',
        );
      } else if (response.status === 'empty' || response.listings.length === 0) {
        setListingsMessage(
          'No listing previews matched this search. Try Best match or More options on Etsy, or edit your search details.',
        );
      } else {
        setListingsMessage(null);
      }
    } catch (error) {
      setListings([]);
      if (error instanceof EtsyRecommendationCallableError && error.previewQuota) {
        setPreviewQuota(error.previewQuota);
      }
      setListingsMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load listing previews. Use the Etsy browse cards above to search in a new tab.',
      );
    } finally {
      setIsLoadingListings(false);
    }
  }, []);

  const restoreResultsFromRequest = useCallback(
    async (activeRequestId: string) => {
      const request = await etsyRecommendationService.getRequest(activeRequestId);
      if (!request) {
        throw new Error('That design search could not be found.');
      }
      const restoredAnswers = answersFromRequest(request);
      setAnswers(restoredAnswers);
      setRequestId(request.id);
      setCanonicalQuery(request.canonicalQuery);
      setEtsySearchUrl(buildEtsyRecommendationSearchUrl(request.canonicalQuery));
      setBroaderSearchUrl(buildBroaderUrlFromAnswers(request.answers));
      setListings([]);
      setListingsMessage(null);
      setView('results');
      void loadListingsForRequest(request.id);
    },
    [loadListingsForRequest],
  );

  useEffect(() => {
    if (hasHydratedFromUrlRef.current) {
      return;
    }
    hasHydratedFromUrlRef.current = true;

    const parsed = parseEtsyRecommendationUrl(searchParams);
    const restore = async () => {
      try {
        if (parsed.step === 'results') {
          if (!parsed.requestId) {
            setActionError('This results link is missing its search id. Start a new search below.');
            setView('choose');
            return;
          }
          await restoreResultsFromRequest(parsed.requestId);
          return;
        }

        if (parsed.step !== 'choose') {
          // Deep links open the step blank. Drafts are not resumed after leaving.
          clearEtsyRecommendationDraft();
          setAnswers(EMPTY_ANSWERS);
          setView(urlStepToView(parsed.step));
          return;
        }

        clearEtsyRecommendationDraft();
        setAnswers(EMPTY_ANSWERS);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Unable to restore this design search link.',
        );
        setView('choose');
      } finally {
        setIsRestoringFromUrl(false);
      }
    };

    void restore();
  }, [restoreResultsFromRequest, searchParams]);

  const goToChoose = useCallback(() => {
    clearEtsyRecommendationDraft();
    setAnswers(EMPTY_ANSWERS);
    setView('choose');
    previousViewRef.current = 'choose';
    setFieldError(null);
    setActionError(null);
    setRequestId(null);
    setCanonicalQuery('');
    setEtsySearchUrl('');
    setBroaderSearchUrl('');
    setListings([]);
    setListingsMessage(null);
    setPreviewQuota(null);
    router.replace(buildEtsyRecommendationHref({ view: 'choose' }), { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!hasHydratedFromUrlRef.current || isRestoringFromUrl) {
      return;
    }

    const parsed = parseEtsyRecommendationUrl(searchParams);
    const searchKey = searchParams.toString();
    const urlChanged =
      previousSearchKeyRef.current !== null && previousSearchKeyRef.current !== searchKey;
    const viewChanged = previousViewRef.current !== view;
    previousSearchKeyRef.current = searchKey;
    previousViewRef.current = view;

    // Custom Designs nav lands on /custom-designs with no step while still mid-wizard.
    // Only then reset to options. Do NOT reset when Find a design advances view first
    // and the URL has not caught up yet (that caused the flash / no-op).
    if (parsed.step === 'choose' && view !== 'choose') {
      if (urlChanged && !viewChanged) {
        goToChoose();
        return;
      }
      const nextHref = buildEtsyRecommendationHref({ view, requestId });
      router.replace(nextHref, { scroll: false });
      return;
    }

    if (parsed.step === 'choose' && view === 'choose') {
      return;
    }

    const nextHref = buildEtsyRecommendationHref({ view, requestId });
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [goToChoose, isRestoringFromUrl, requestId, router, searchParams, view]);

  useEffect(() => {
    if (view !== 'results' || !requestId) {
      return;
    }
    void refreshPreviewQuota(requestId);
  }, [view, requestId, refreshPreviewQuota]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [view]);

  const startFreshWizard = useCallback(() => {
    clearEtsyRecommendationDraft();
    setAnswers(EMPTY_ANSWERS);
    setFieldError(null);
    setActionError(null);
    setListings([]);
    setListingsMessage(null);
    setRequestId(null);
    setCanonicalQuery('');
    setEtsySearchUrl('');
    setBroaderSearchUrl('');
    setPreviewQuota(null);
    setView('screen1');
    previousViewRef.current = 'screen1';
    router.replace(buildEtsyRecommendationHref({ view: 'screen1' }), { scroll: false });
  }, [router]);

  const beginFindDesign = useCallback(() => {
    startFreshWizard();
  }, [startFreshWizard]);

  const updateSubjectText = useCallback((value: string) => {
    setAnswers((prev) => ({ ...prev, subjectText: value }));
    setFieldError(null);
  }, []);

  const updateStyleText = useCallback((value: string) => {
    setAnswers((prev) => ({ ...prev, styleText: value }));
    setFieldError(null);
  }, []);

  const updateWording = useCallback((value: string) => {
    setAnswers((prev) => ({ ...prev, wording: value }));
    setFieldError(null);
  }, []);

  const goNextFromScreen1 = useCallback(() => {
    try {
      toParsedAnswers({ ...answers, styleText: '', wording: '' });
      setFieldError(null);
      setView('screen2');
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Name a person, place, or thing.');
    }
  }, [answers]);

  const goNextFromScreen2 = useCallback(() => {
    try {
      toParsedAnswers({ ...answers, wording: '' });
      setFieldError(null);
      setView('screen3');
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Check your tone / style.');
    }
  }, [answers]);

  const goNextFromScreen3 = useCallback(() => {
    try {
      toParsedAnswers(answers);
      setFieldError(null);
      setView('review');
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Check your search details.');
    }
  }, [answers]);

  const goBack = useCallback(() => {
    setFieldError(null);
    setActionError(null);
    if (view === 'screen2') {
      setView('screen1');
      return;
    }
    if (view === 'screen3') {
      setView('screen2');
      return;
    }
    if (view === 'review') {
      setView('screen3');
      return;
    }
    if (view === 'screen1') {
      goToChoose();
    }
  }, [goToChoose, view]);

  const submitFromReview = useCallback(async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const parsed = toParsedAnswers(answers);
      const broaderUrl = buildEtsyRecommendationSearchUrl(
        buildEtsyRecommendationBroaderQuery(parsed),
      );
      const response = await etsyRecommendationService.submitRequest({
        answers: parsed,
        confirmReplaceActive: true,
      });
      clearEtsyRecommendationDraft();
      setRequestId(response.requestId);
      setCanonicalQuery(response.canonicalQuery);
      setEtsySearchUrl(buildEtsyRecommendationSearchUrl(response.canonicalQuery));
      setBroaderSearchUrl(broaderUrl);
      setListings([]);
      setListingsMessage(null);
      setView('results');
      void loadListingsForRequest(response.requestId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to find designs right now.');
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, loadListingsForRequest]);

  const editSearch = useCallback(() => {
    // Keep current answers in memory so Edit from results can revise them.
    // Leaving Custom Designs / returning via Find a design starts blank again.
    setActionError(null);
    setFieldError(null);
    setListings([]);
    setListingsMessage(null);
    setPreviewQuota(null);
    setView('screen1');
  }, []);

  const searchAgain = useCallback(async () => {
    if (!requestId) {
      return;
    }
    setIsSearchingAgain(true);
    setActionError(null);
    try {
      await loadListingsForRequest(requestId);
    } finally {
      setIsSearchingAgain(false);
    }
  }, [loadListingsForRequest, requestId]);

  const backToOptions = useCallback(() => {
    setActionError(null);
    goToChoose();
  }, [goToChoose]);

  return {
    view,
    answers,
    searchPreview,
    fieldError,
    actionError,
    requestId,
    canonicalQuery,
    etsySearchUrl,
    broaderSearchUrl,
    isSubmitting,
    isLoadingListings,
    isSearchingAgain,
    isRestoringFromUrl,
    listings,
    listingsMessage,
    previewQuota,
    focusHeadingRef: headingRef,
    beginFindDesign,
    updateSubjectText,
    updateStyleText,
    updateWording,
    goNextFromScreen1,
    goNextFromScreen2,
    goNextFromScreen3,
    goBack,
    goToChoose,
    submitFromReview,
    editSearch,
    searchAgain,
    backToOptions,
  };
}
