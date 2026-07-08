import assert from "node:assert/strict";
import { test } from "node:test";

import type { ParsedWhatnotShowImportCandidate } from "./whatnotShowImportCandidate";
import { planWhatnotShowImport } from "./whatnotShowImportPlan";

function readyCandidate(overrides: Partial<ParsedWhatnotShowImportCandidate> = {}): ParsedWhatnotShowImportCandidate {
  return {
    status: "ready",
    whatnotShowId: "bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    whatnotUrl: "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    title: "Sunday Show",
    scheduledStartAt: new Date(2026, 6, 12, 20, 0, 0, 0),
    rawDateText: "Sun, Jul 12, 8:00 PM",
    ...overrides,
  };
}

test("planWhatnotShowImport: classifies a new show as create", () => {
  const [entry] = planWhatnotShowImport([readyCandidate()], []);
  assert.equal(entry.action, "create");
});

test("planWhatnotShowImport: classifies a matching, unchanged show as unchanged", () => {
  const candidate = readyCandidate();
  const [entry] = planWhatnotShowImport(
    [candidate],
    [
      {
        id: "show-1",
        whatnotShowId: candidate.whatnotShowId!,
        title: candidate.title,
        whatnotUrl: candidate.whatnotUrl,
        scheduledStartAtMs: candidate.scheduledStartAt!.getTime(),
      },
    ],
  );

  assert.equal(entry.action, "unchanged");
  assert.equal(entry.existingShowId, "show-1");
});

test("planWhatnotShowImport: classifies a changed title/date as update", () => {
  const candidate = readyCandidate({ title: "New Title" });
  const [entry] = planWhatnotShowImport(
    [candidate],
    [
      {
        id: "show-1",
        whatnotShowId: candidate.whatnotShowId!,
        title: "Old Title",
        whatnotUrl: candidate.whatnotUrl,
        scheduledStartAtMs: candidate.scheduledStartAt!.getTime(),
      },
    ],
  );

  assert.equal(entry.action, "update");
  assert.equal(entry.existingShowId, "show-1");
});

test("planWhatnotShowImport: classifies a needs_review candidate as needs_review regardless of existing shows", () => {
  const candidate: ParsedWhatnotShowImportCandidate = {
    status: "needs_review",
    title: "Mystery",
    rawDateText: "Starting soon",
    reviewReason: "Could not parse the show date/time.",
  };

  const [entry] = planWhatnotShowImport([candidate], []);
  assert.equal(entry.action, "needs_review");
});

test("planWhatnotShowImport: handles an empty candidate list", () => {
  assert.deepEqual(planWhatnotShowImport([], []), []);
});

test("planWhatnotShowImport: classifies a new 'live' candidate (no scheduledStartAt) as create", () => {
  const liveCandidate: ParsedWhatnotShowImportCandidate = {
    status: "live",
    whatnotShowId: "bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    whatnotUrl: "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    title: "Currently live show",
    rawDateText: "Live · 24",
  };

  const [entry] = planWhatnotShowImport([liveCandidate], []);
  assert.equal(entry.action, "create");
});

test("planWhatnotShowImport: classifies a matching 'live' candidate with no schedule change as unchanged", () => {
  const liveCandidate: ParsedWhatnotShowImportCandidate = {
    status: "live",
    whatnotShowId: "bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    whatnotUrl: "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    title: "Currently live show",
    rawDateText: "Live · 24",
  };

  const [entry] = planWhatnotShowImport(
    [liveCandidate],
    [
      {
        id: "show-1",
        whatnotShowId: liveCandidate.whatnotShowId!,
        title: liveCandidate.title,
        whatnotUrl: liveCandidate.whatnotUrl,
        scheduledStartAtMs: undefined,
      },
    ],
  );

  assert.equal(entry.action, "unchanged");
});
