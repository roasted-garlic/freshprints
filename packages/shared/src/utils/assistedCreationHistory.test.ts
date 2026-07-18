import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE,
  ASSISTED_CREATION_REQUEST_UPDATED_NOTE,
  buildAssistedCreationHistoryTitles,
  buildAssistedCreationUpdateAckDocId,
  countUnreadAssistedCreationCustomerUpdates,
  formatAssistedCreationRequestUpdatedNote,
  isAssistedCreationCustomerUpdateEntry,
  isAssistedCreationCustomerUpdateUnread,
  isAssistedCreationProofEmailSentEntry,
  isAssistedProofEmailOptedIn,
  latestAssistedCreationCustomerUpdateAtMs,
  listReadAssistedCreationCustomerUpdates,
  listUnreadAssistedCreationCustomerUpdates,
  truncateAssistedCreationMessagePreview,
} from "./assistedCreationHistory";

describe("assistedCreationHistory helpers", () => {
  it("formats request-updated notes without redundant Customer actor", () => {
    assert.equal(formatAssistedCreationRequestUpdatedNote(), ASSISTED_CREATION_REQUEST_UPDATED_NOTE);
    assert.equal(
      formatAssistedCreationRequestUpdatedNote("  more detail  "),
      `${ASSISTED_CREATION_REQUEST_UPDATED_NOTE} — more detail`,
    );
  });

  it("detects customer update entries structurally and via legacy notes", () => {
    assert.equal(
      isAssistedCreationCustomerUpdateEntry({
        fromStatus: "submitted",
        toStatus: "submitted",
        byRole: "customer",
        note: ASSISTED_CREATION_REQUEST_UPDATED_NOTE,
      }),
      true,
    );
    assert.equal(
      isAssistedCreationCustomerUpdateEntry({
        fromStatus: "submitted",
        toStatus: "submitted",
        byRole: "system",
        note: "Customer updated request — hello",
      }),
      true,
    );
    assert.equal(
      isAssistedCreationCustomerUpdateEntry({
        fromStatus: "submitted",
        toStatus: "in_progress",
        byRole: "customer",
        note: "Request updated",
      }),
      false,
    );
  });

  it("counts unread updates after readThroughAt", () => {
    const older = {
      at: 1_000,
      byUid: "c1",
      byRole: "customer" as const,
      note: "Request updated",
      fromStatus: "submitted" as const,
      toStatus: "submitted" as const,
    };
    const newer = {
      at: 2_000,
      byUid: "c1",
      byRole: "customer" as const,
      note: "Request updated — again",
      fromStatus: "submitted" as const,
      toStatus: "submitted" as const,
    };
    const history = [older, newer];
    assert.equal(countUnreadAssistedCreationCustomerUpdates(history, null), 2);
    assert.equal(countUnreadAssistedCreationCustomerUpdates(history, 1_000), 1);
    assert.equal(countUnreadAssistedCreationCustomerUpdates(history, 2_000), 0);
    assert.equal(latestAssistedCreationCustomerUpdateAtMs(history), 2_000);
    assert.equal(isAssistedCreationCustomerUpdateUnread(older, null), true);
    assert.equal(isAssistedCreationCustomerUpdateUnread(older, 1_000), false);
    assert.equal(isAssistedCreationCustomerUpdateUnread(newer, 1_000), true);
  });

  it("lists unread updates newest-first and truncates previews", () => {
    const older = {
      at: 1_000,
      byUid: "c1",
      byRole: "customer" as const,
      kind: "customer_message" as const,
      note: "First note",
      fromStatus: "in_progress" as const,
      toStatus: "in_progress" as const,
    };
    const newer = {
      at: 2_000,
      byUid: "c1",
      byRole: "customer" as const,
      kind: "customer_message" as const,
      note: "Second note that is quite long and should be truncated for the inbox preview row",
      fromStatus: "in_progress" as const,
      toStatus: "in_progress" as const,
    };
    const listed = listUnreadAssistedCreationCustomerUpdates([older, newer], 1_000);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.at, 2_000);
    const readListed = listReadAssistedCreationCustomerUpdates([older, newer], 1_000);
    assert.equal(readListed.length, 1);
    assert.equal(readListed[0]?.at, 1_000);
    assert.deepEqual(listReadAssistedCreationCustomerUpdates([older, newer], null), []);
    assert.equal(truncateAssistedCreationMessagePreview("short"), "short");
    assert.equal(truncateAssistedCreationMessagePreview(""), "New customer message");
    assert.match(truncateAssistedCreationMessagePreview(newer.note, 40), /…$/);
  });

  it("recognizes structurally marked customer messages at active and terminal statuses", () => {
    const activeMessage = {
      at: 3_000,
      byUid: "c1",
      byRole: "customer" as const,
      kind: "customer_message" as const,
      note: "Can you make the text larger?",
      fromStatus: "in_progress" as const,
      toStatus: "in_progress" as const,
    };
    const terminalMessage = {
      ...activeMessage,
      at: 4_000,
      note: "Thank you!",
      fromStatus: "approved" as const,
      toStatus: "approved" as const,
    };

    assert.equal(isAssistedCreationCustomerUpdateEntry(activeMessage), true);
    assert.equal(isAssistedCreationCustomerUpdateEntry(terminalMessage), true);
    assert.deepEqual(buildAssistedCreationHistoryTitles([activeMessage, terminalMessage]), [
      "Message",
      "Message",
    ]);
    assert.equal(countUnreadAssistedCreationCustomerUpdates([activeMessage, terminalMessage], 3_000), 1);
    assert.equal(latestAssistedCreationCustomerUpdateAtMs([activeMessage, terminalMessage]), 4_000);
  });

  it("labels staff chat messages without counting them as unread customer updates", () => {
    const staffMessage = {
      at: 5_000,
      byUid: "s1",
      byRole: "staff" as const,
      kind: "staff_message" as const,
      note: "Working on a larger text version now.",
      fromStatus: "in_progress" as const,
      toStatus: "in_progress" as const,
    };
    assert.equal(isAssistedCreationCustomerUpdateEntry(staffMessage), false);
    assert.deepEqual(buildAssistedCreationHistoryTitles([staffMessage]), ["Message"]);
    assert.equal(countUnreadAssistedCreationCustomerUpdates([staffMessage], null), 0);
  });

  it("recognizes proof-ready email sent history", () => {
    assert.equal(
      isAssistedCreationProofEmailSentEntry({
        byRole: "system",
        note: ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE,
      }),
      true,
    );
    assert.equal(buildAssistedCreationUpdateAckDocId("u1", "r1"), "u1__r1");
    assert.equal(isAssistedProofEmailOptedIn(undefined), true);
    assert.equal(isAssistedProofEmailOptedIn(true), true);
    assert.equal(isAssistedProofEmailOptedIn(false), false);
  });

  it("numbers proof and revision-request events independently in chronological order", () => {
    const entry = (
      toStatus: "submitted" | "in_progress" | "proof_ready" | "revision_requested" | "approved",
      note: string,
      byRole: "customer" | "staff" | "system" = "staff",
    ) => ({
      at: 1_000,
      byUid: "u1",
      byRole,
      note,
      fromStatus: toStatus === "submitted" ? null : ("in_progress" as const),
      toStatus,
    });

    const history = [
      entry("submitted", "Request submitted", "customer"),
      entry("in_progress", "Started work"),
      entry("proof_ready", "First proof"),
      {
        ...entry("proof_ready", ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE, "system"),
        fromStatus: "proof_ready" as const,
      },
      entry("revision_requested", "Make the text larger", "customer"),
      entry("in_progress", "Resumed work"),
      entry("proof_ready", "Second proof"),
      entry("revision_requested", "Use a darker blue", "customer"),
      entry("proof_ready", "Third proof"),
      entry("approved", "Customer approved proof", "customer"),
    ];

    assert.deepEqual(buildAssistedCreationHistoryTitles(history), [
      "Submitted",
      "In progress",
      "Proof 1",
      "Email sent",
      "Revision request 1",
      "In progress",
      "Proof 2",
      "Revision request 2",
      "Proof 3",
      "Completed",
    ]);
  });

  it("keeps customer updates distinct from numbered events", () => {
    const history = [
      {
        at: 1_000,
        byUid: "c1",
        byRole: "customer" as const,
        note: "Request updated — add a flower",
        fromStatus: "submitted" as const,
        toStatus: "submitted" as const,
      },
    ];

    assert.deepEqual(buildAssistedCreationHistoryTitles(history), ["Updated"]);
    assert.deepEqual(buildAssistedCreationHistoryTitles(undefined), []);
  });
});
