import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Studio deletion same-service warmup wiring", () => {
  const warmupService = read(
    "apps/studio/src/renderer/src/features/deletion/services/deletionCallableWarmupService.ts",
  );
  const schedule = read(
    "apps/studio/src/renderer/src/features/deletion/services/schedulePostAuthDeletionWarmup.ts",
  );
  const appShell = read("apps/studio/src/renderer/src/shared/components/AppShell.tsx");
  const printDialog = read(
    "apps/studio/src/renderer/src/features/print-requests/components/PrintRequestDeletionDialog.tsx",
  );
  const showDialog = read(
    "apps/studio/src/renderer/src/features/upcoming-shows/components/UpcomingShowDeletionDialog.tsx",
  );
  const uploadDialog = read(
    "apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadDeletionDialog.tsx",
  );
  const hardDeleteDialog = read(
    "apps/studio/src/renderer/src/features/users/components/HardDeleteCustomerConfirmDialog.tsx",
  );
  const staffInbox = read("apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx");

  it("warms named existing callables with { warmup: true } (no generic ping Function)", () => {
    assert.match(warmupService, /warmup: true/);
    assert.match(warmupService, /callTracedFunction/);
    assert.doesNotMatch(warmupService, /pingDeletionServices|warmAllDeletion/);
  });

  it("post-auth warmup is role-gated and capped to high-frequency preview surfaces", () => {
    assert.match(schedule, /previewPrintRequestDeletion/);
    assert.match(schedule, /previewUpcomingShowDeletion/);
    assert.match(schedule, /previewCustomerUploadDeletion/);
    assert.match(schedule, /deleteEligibleUnapprovedDesign/);
    assert.match(schedule, /purgeArchivedDesignAssets/);
    assert.match(schedule, /previewHardDeleteCustomerAccount/);
    assert.match(schedule, /previewShowProductionRecovery/);
    assert.match(schedule, /canDeleteEligiblePrintRequest/);
    assert.match(schedule, /canPurgeArchivedDesignAssets/);
    assert.match(schedule, /isStaff/);
    assert.match(schedule, /requestIdleCallback|setTimeout/);
  });

  it("AppShell schedules warmup after bootstrap ready without blocking render", () => {
    assert.match(appShell, /schedulePostAuthDeletionWarmup\(user\)/);
    assert.match(appShell, /bootstrapStatus !== "ready"/);
  });

  it("delete dialogs warm mutate callables without coupling warmup failure to preview", () => {
    assert.match(printDialog, /warmMutateCallables\(\)/);
    assert.match(printDialog, /\.preview\(printRequestId\)/);
    assert.match(showDialog, /warmMutateCallables\(\)/);
    assert.match(uploadDialog, /warmMutateCallables\(\)/);
    assert.match(hardDeleteDialog, /warmHardDeleteMutateCallable\(\)/);
  });

  it("purge dialog warms purgeArchivedDesignAssets and archiveDesign stays client-only", () => {
    const purgeDialog = read(
      "apps/studio/src/renderer/src/features/designs/components/PurgeArchivedDesignAssetsDialog.tsx",
    );
    const purgeService = read(
      "apps/studio/src/renderer/src/features/designs/services/purgeArchivedDesignAssetsService.ts",
    );
    const archiveHook = read(
      "apps/studio/src/renderer/src/features/designs/hooks/useArchiveDesign.ts",
    );
    assert.match(purgeDialog, /warmPurgeArchivedDesignAssetsCallable\(\)/);
    assert.match(purgeService, /warmDeletionCallableBackground\("purgeArchivedDesignAssets"\)/);
    assert.doesNotMatch(archiveHook, /warmDeletionCallable|purgeArchivedDesignAssets|warmup/);
  });

  it("show production recovery dialogs warm apply and do not re-fetch on schedule clock ticks", () => {
    const recoveryDialog = read(
      "apps/studio/src/renderer/src/features/upcoming-shows/components/ShowProductionRecoveryDialog.tsx",
    );
    const didNotPrintDialog = read(
      "apps/studio/src/renderer/src/features/upcoming-shows/components/DidNotPrintRecoveryDialog.tsx",
    );
    assert.match(recoveryDialog, /warmDeletionCallableBackground\("applyShowProductionRecovery"\)/);
    assert.match(recoveryDialog, /\[action, isOpen, upcomingShowId\]/);
    assert.match(didNotPrintDialog, /warmDeletionCallableBackground\("applyShowProductionRecovery"\)/);
    assert.match(didNotPrintDialog, /\[isOpen, selectedShowId, upcomingShowId\]/);
  });

  it("Staff Inbox does not invoke deletion callable warmup", () => {
    assert.doesNotMatch(staffInbox, /warmDeletionCallable|warmMutateCallables|schedulePostAuthDeletionWarmup/);
  });
});

describe("print request parallel preview equivalence shape", () => {
  it("server still returns the same preview outcome fields used by the dialog", () => {
    const source = read("functions/src/deleteEligiblePrintRequest.ts");
    assert.match(source, /outcome: "allowed_hard_delete"/);
    assert.match(source, /outcome: "blocked"/);
    assert.match(source, /outcome: "archive"/);
    assert.match(source, /code: "has_show_allocations"/);
    assert.match(source, /code: "has_production_history"/);
  });
});
