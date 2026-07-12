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

  canEditDesignStatus(user: UserLike) {
    return hasActiveRole(user, ["owner", "admin"]);
  },

  canArchiveDesigns(user: UserLike) {
    return isStaff(user);
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
    return hasActiveRole(user, ["owner", "admin"]);
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
    return hasActiveRole(user, ["owner", "admin"]);
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
