import type { TeamUserRole, User, UserRole } from "../../users/types/user.types";
import type { PermissionContext, PermissionKey } from "../types/permission.types";

type UserLike = Pick<User, "id" | "role" | "isActive"> | null | undefined;
type TargetUserLike = Pick<User, "id" | "role" | "isActive"> | null | undefined;

const staffRoles: UserRole[] = ["owner", "admin", "helper"];
const desktopRoles: UserRole[] = ["owner", "admin", "helper"];
const ownerEditableTeamRoles: UserRole[] = ["admin", "helper"];

function hasActiveRole(user: UserLike, roles: UserRole[]) {
  return Boolean(user?.isActive && roles.includes(user.role));
}

function isOwner(user: UserLike) {
  return hasActiveRole(user, ["owner"]);
}

function isAdmin(user: UserLike) {
  return hasActiveRole(user, ["admin"]);
}

function isHelper(user: UserLike) {
  return hasActiveRole(user, ["helper"]);
}

function isCustomer(user: UserLike) {
  return hasActiveRole(user, ["customer"]);
}

function isStaff(user: UserLike) {
  return hasActiveRole(user, staffRoles);
}

export const permissionService = {
  isOwner,
  isAdmin,
  isHelper,
  isCustomer,
  isStaff,

  canAccessDesktopApp(user: UserLike) {
    return hasActiveRole(user, desktopRoles);
  },

  canAccessDashboard(user: UserLike) {
    return this.canAccessDesktopApp(user);
  },

  canViewUsers(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canManageUsers(user: UserLike) {
    return this.canViewUsers(user);
  },

  getReadableTeamUserRoles(user: UserLike): UserRole[] {
    if (!user?.isActive) {
      return [];
    }

    if (isOwner(user)) {
      return ["owner", "admin", "helper"];
    }

    if (isAdmin(user)) {
      return ["admin", "helper"];
    }

    return [];
  },

  getCreatableTeamUserRoles(user: UserLike): TeamUserRole[] {
    if (!user?.isActive) {
      return [];
    }

    if (isOwner(user)) {
      return ["admin", "helper"];
    }

    if (isAdmin(user)) {
      return ["helper"];
    }

    return [];
  },

  canCreateAdmin(user: UserLike) {
    return isOwner(user);
  },

  canCreateHelper(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  isProtectedOwnerAccount(target: TargetUserLike) {
    return target?.role === "owner";
  },

  canEditUser(caller: UserLike, target: TargetUserLike) {
    if (!caller?.isActive || !target) {
      return false;
    }

    if (caller.id === target.id) {
      return false;
    }

    if (isAdmin(caller)) {
      return target.role === "helper";
    }

    if (isOwner(caller)) {
      return ownerEditableTeamRoles.includes(target.role);
    }

    return false;
  },

  canShowUserDirectoryEditAction(caller: UserLike, target: TargetUserLike) {
    return !this.isProtectedOwnerAccount(target) && this.canEditUser(caller, target);
  },

  canDeactivateUser(caller: UserLike, target: TargetUserLike) {
    return this.canEditUser(caller, target) && Boolean(target?.isActive);
  },

  canReactivateUser(caller: UserLike, target: TargetUserLike) {
    return this.canEditUser(caller, target) && Boolean(target && !target.isActive);
  },

  canChangeUserRole(caller: UserLike, target: TargetUserLike, nextRole?: UserRole) {
    if (!caller || !target || !isOwner(caller)) {
      return false;
    }

    if (caller.id === target.id || target.role === "owner") {
      return false;
    }

    if (nextRole && nextRole !== "admin" && nextRole !== "helper") {
      return false;
    }

    return target.role === "admin" || target.role === "helper";
  },

  canManageRoles(user: UserLike) {
    return isOwner(user);
  },

  canManageSettings(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  /** Owner/admin settings tabs (FAQ, AI enrichment, etc.). Helpers never get these. */
  canViewAdministrativeSettings(user: UserLike) {
    return this.canManageSettings(user);
  },

  /** Settings route — full settings for owner/admin; Studio updates only for helpers. */
  canAccessSettingsPage(user: UserLike) {
    return this.canManageSettings(user) || isHelper(user);
  },

  canManageEmailProviders(user: UserLike) {
    return isOwner(user);
  },

  canManageCustomerUploadQuotas(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only temporary per-customer Portal print/show quota overrides. */
  canManageCustomerPrintRequestQuotaOverrides(user: UserLike) {
    return isOwner(user);
  },

  canManageStandardPrintSizes(user: UserLike) {
    return isOwner(user);
  },

  /** Dev-only operational wipe; server also enforces owner + project allowlist. */
  canWipeOperationalTestData(user: UserLike) {
    return isOwner(user);
  },

  /** Slice 4 — Catalog Reprocessing + live Autonomous enablement (owner-only). */
  canManageCatalogReprocessing(user: UserLike) {
    return isOwner(user);
  },

  canManageCatalogWorkflowMode(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only: Design Library Ready → AI Processing reprocess. */
  canReprocessReadyDesignWithAi(user: UserLike) {
    return isOwner(user);
  },

  canPurgeArchivedDesignAssets(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only hard-delete of eligible unapproved (imported/processing) designs. */
  canDeleteEligibleUnapprovedDesigns(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only product tombstone for customers (Auth disable + retain history). */
  canTombstoneCustomerAccount(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only history-free permanent customer deletion (dev-gated Apply). */
  canHardDeleteCustomerAccount(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only reversible disable / restore. */
  canDisableCustomerAccount(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only Transfer Username preview and apply (WS2). */
  canResolveDuplicateCustomerAccount(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only Merge Accounts preview and apply (WS3). */
  canMergeCustomerAccounts(user: UserLike) {
    return isOwner(user);
  },

  /** Owner and admin may change customer username via updateCustomer. */
  canChangeCustomerUsername(user: UserLike) {
    return this.canManageCustomers(user);
  },

  /** Owner/admin hard delete of unattached, unpromoted customer uploads. */
  canDeleteEligibleCustomerUpload(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  /** Owner-only for this phase (extra safeguard). */
  canDeleteEligiblePrintRequest(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only for this phase (extra safeguard). */
  canDeleteEligibleUpcomingShow(user: UserLike) {
    return isOwner(user);
  },

  /** Owner-only manual edit of Whatnot / DEV fixture show metadata (title, schedule, notes, URL). */
  canEditUpcomingShowMetadata(user: UserLike) {
    return isOwner(user);
  },

  canManageDesigns(user: UserLike) {
    return this.canViewDesigns(user);
  },

  canViewDesigns(user: UserLike) {
    return isStaff(user);
  },

  canCreateDesigns(user: UserLike) {
    return isStaff(user);
  },

  canEditDesigns(user: UserLike) {
    return isStaff(user);
  },

  canEditSmartProfile(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canEditDesignStatus(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canArchiveDesigns(user: UserLike) {
    return isStaff(user);
  },

  canRestoreDesigns(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canManageCategories(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canManageTags(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canBulkImportTags(user: UserLike) {
    return isOwner(user);
  },

  canApproveSuggestedTags(user: UserLike) {
    return this.canManageTags(user);
  },

  canImportDesigns(user: UserLike) {
    return isStaff(user);
  },

  canViewCustomerUploadIntake(user: UserLike) {
    return this.canImportDesigns(user);
  },

  canExcludeCustomerUploadFromCatalog(user: UserLike) {
    return this.canImportDesigns(user);
  },

  canPromoteCustomerUploadToAiReview(user: UserLike) {
    return this.canApproveDesignForCatalog(user);
  },

  canRetryCustomerUploadProcessing(user: UserLike) {
    return this.canApproveDesignForCatalog(user);
  },

  canManageQueues(user: UserLike) {
    return isStaff(user);
  },

  canViewPrintRequests(user: UserLike) {
    return isStaff(user);
  },

  canViewDesignIssueReports(user: UserLike) { return isStaff(user); },
  canResolveDesignIssueReports(user: UserLike) { return isStaff(user); },

  canManagePrintRequests(user: UserLike) {
    return isStaff(user);
  },

  canManagePrintRequestItems(user: UserLike) {
    return isStaff(user);
  },

  canViewUpcomingShows(user: UserLike) {
    return isStaff(user);
  },

  canManageUpcomingShows(user: UserLike) {
    return isStaff(user);
  },

  /** Show Queue settings (capacity, Whatnot URL, cutoff, gang sheet). Owner/admin only. */
  canManageShowQueueSettings(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  /** Staff-assisted Whatnot Import Shows flow (not manual Add show). */
  canImportWhatnotShows(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  /** Owner-only permanent delete from inbox Done history. */
  canDeleteStaffInboxCompletedAlerts(user: UserLike) {
    return isOwner(user);
  },

  /** Any active Studio staff may create the initial shared Internal Gang Sheet. */
  canCreateStaffGangSheetLane(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin", "helper"]);
  },

  /**
   * Any active Studio staff may manage the shared Staff Gang Sheet.
   * Rules remain the security boundary for create/update.
   */
  canManageStaffGangSheetShow(user: UserLike, show: { source: string }) {
    if (!isStaff(user)) {
      return false;
    }
    return show.source === "staff_gang_sheet";
  },

  /** Dev Electron sidebar action to open Chromium DevTools. Owner-only. */
  canOpenDevTools(user: UserLike) {
    return isOwner(user);
  },

  canManageGuestCustomers(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canManageCustomers(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canManageRequests(user: UserLike) {
    return isStaff(user);
  },

  canViewAuditLogs(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canViewOriginals(user: UserLike) {
    return isStaff(user);
  },

  canViewAiReview(user: UserLike) {
    return isStaff(user);
  },

  canSkipAiReview(user: UserLike) {
    return isStaff(user);
  },

  canEditAiReviewInbox(user: UserLike) {
    return this.canManageAiReview(user);
  },

  canManageAiReview(user: UserLike) {
    // Operational AI Review (edit/approve/reject/rerun) — active staff including helper.
    // Taxonomy / settings / users remain separate owner-admin gates.
    return isStaff(user);
  },

  canApproveAiReview(user: UserLike) {
    return this.canManageAiReview(user);
  },

  canRejectAiReview(user: UserLike) {
    return this.canManageAiReview(user);
  },

  canOverrideAiReview(user: UserLike) {
    return this.canManageAiReview(user);
  },

  canApproveDesignForCatalog(user: UserLike) {
    // Operational catalog approve/reject/promote/retry/rerun — active staff including helper.
    return isStaff(user);
  },

  canRejectDesignFromCatalog(user: UserLike) {
    return this.canApproveDesignForCatalog(user);
  },

  canReopenRejectedDesign(user: UserLike) {
    return this.canRejectDesignFromCatalog(user);
  },

  canRerunAiSuggestions(user: UserLike) {
    return this.canApproveDesignForCatalog(user);
  },

  canSubmitCustomerRequests(user: UserLike) {
    return isCustomer(user);
  },

  canViewOwnCustomerRequests(user: UserLike, customerId?: string) {
    return Boolean(isCustomer(user) && customerId && user?.id === customerId);
  },

  hasPermission(user: UserLike, permission: PermissionKey, context: PermissionContext = {}) {
    switch (permission) {
      case "accessDashboard":
        return this.canAccessDashboard(user);
      case "viewUsers":
        return this.canViewUsers(user);
      case "manageUsers":
        return this.canManageUsers(user);
      case "manageRoles":
        return this.canManageRoles(user);
      case "manageSettings":
        return this.canManageSettings(user);
      case "accessSettingsPage":
        return this.canAccessSettingsPage(user);
      case "manageEmailProviders":
        return this.canManageEmailProviders(user);
      case "wipeOperationalTestData":
        return this.canWipeOperationalTestData(user);
      case "purgeArchivedDesignAssets":
        return this.canPurgeArchivedDesignAssets(user);
      case "deleteEligibleUnapprovedDesigns":
        return this.canDeleteEligibleUnapprovedDesigns(user);
      case "manageDesigns":
        return this.canManageDesigns(user);
      case "viewDesigns":
        return this.canViewDesigns(user);
      case "createDesigns":
        return this.canCreateDesigns(user);
      case "editDesigns":
        return this.canEditDesigns(user);
      case "archiveDesigns":
        return this.canArchiveDesigns(user);
      case "restoreDesigns":
        return this.canRestoreDesigns(user);
      case "manageCategories":
        return this.canManageCategories(user);
      case "importDesigns":
        return this.canImportDesigns(user);
      case "manageQueues":
        return this.canManageQueues(user);
      case "viewPrintRequests":
        return this.canViewPrintRequests(user);
      case "managePrintRequests":
        return this.canManagePrintRequests(user);
      case "managePrintRequestItems":
        return this.canManagePrintRequestItems(user);
      case "viewUpcomingShows":
        return this.canViewUpcomingShows(user);
      case "manageUpcomingShows":
        return this.canManageUpcomingShows(user);
      case "manageShowQueueSettings":
        return this.canManageShowQueueSettings(user);
      case "importWhatnotShows":
        return this.canImportWhatnotShows(user);
      case "createStaffGangSheetLane":
        return this.canCreateStaffGangSheetLane(user);
      case "manageStaffGangSheetLane":
        return this.canManageUpcomingShows(user);
      case "openDevTools":
        return this.canOpenDevTools(user);
      case "manageGuestCustomers":
        return this.canManageGuestCustomers(user);
      case "manageCustomers":
        return this.canManageCustomers(user);
      case "manageRequests":
        return this.canManageRequests(user);
      case "viewAuditLogs":
        return this.canViewAuditLogs(user);
      case "viewOriginals":
        return this.canViewOriginals(user);
      case "viewAiReview":
        return this.canViewAiReview(user);
      case "manageAiReview":
        return this.canManageAiReview(user);
      case "submitCustomerRequests":
        return this.canSubmitCustomerRequests(user);
      case "viewOwnCustomerRequests":
        return this.canViewOwnCustomerRequests(user, context.customerId);
    }
  },

  hasAnyPermission(user: UserLike, permissions: PermissionKey[], context: PermissionContext = {}) {
    return permissions.some((permission) => this.hasPermission(user, permission, context));
  },
};
