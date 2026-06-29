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
  | "manageGuestCustomers"
  | "manageCustomers"
  | "manageRequests"
  | "viewAuditLogs"
  | "viewOriginals"
  | "viewAiReview"
  | "manageAiReview"
  | "submitCustomerRequests"
  | "viewOwnCustomerRequests";

export interface PermissionContext {
  customerId?: string;
}
