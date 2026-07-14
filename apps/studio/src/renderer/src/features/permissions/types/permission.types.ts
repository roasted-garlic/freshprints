export type PermissionKey =
  | "accessDashboard"
  | "viewUsers"
  | "manageUsers"
  | "manageRoles"
  | "manageSettings"
  | "manageDesigns"
  | "viewDesigns"
  | "createDesigns"
  | "editDesigns"
  | "archiveDesigns"
  | "manageCategories"
  | "importDesigns"
  | "manageQueues"
  | "viewPrintRequests"
  | "managePrintRequests"
  | "managePrintRequestItems"
  | "viewUpcomingShows"
  | "manageUpcomingShows"
  | "manageGuestCustomers"
  | "manageCustomers"
  | "manageRequests"
  | "viewAuditLogs"
  | "viewOriginals"
  | "viewAiReview"
  | "manageAiReview"
  | "wipeOperationalTestData"
  | "submitCustomerRequests"
  | "viewOwnCustomerRequests";

export interface PermissionContext {
  customerId?: string;
}
