import { Navigate, Route, Routes } from "react-router-dom";

import { AuthBootstrapGate } from "../features/auth/components/AuthBootstrapGate";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { AiReviewPage } from "../features/ai-review/pages/AiReviewPage";
import { CustomerRequestsPage } from "../features/customer-requests/pages/CustomerRequestsPage";
import { DesignLibraryPage } from "../features/designs/pages/DesignLibraryPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ImportsPage } from "../features/imports/pages/ImportsPage";
import { PrintRequestsPage } from "../features/print-requests/pages/PrintRequestsPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { ShowQueuePage } from "../features/show-queue/pages/ShowQueuePage";
import { UserManagementPage } from "../features/users/pages/UserManagementPage";
import { AuthenticatedLayout } from "./AuthenticatedLayout";
import { LoginRoute } from "./LoginRoute";

export function AppRoutes() {
  return (
    <AuthBootstrapGate>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<Navigate replace to="/designs" />} />
          <Route
            path="/designs"
            element={
              <ProtectedRoute permission="viewDesigns">
                <DesignLibraryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dev-dashboard"
            element={
              <ProtectedRoute permission="accessDashboard">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/imports"
            element={
              <ProtectedRoute permission="importDesigns">
                <ImportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-review"
            element={
              <ProtectedRoute permission="viewAiReview">
                <AiReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/print-requests"
            element={
              <ProtectedRoute permission="viewPrintRequests">
                <PrintRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/show-queue"
            element={
              <ProtectedRoute permission="manageQueues">
                <ShowQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer-requests"
            element={
              <ProtectedRoute permission="manageRequests">
                <CustomerRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute permission="viewUsers">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute permission="manageSettings">
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate replace to="/designs" />} />
      </Routes>
    </AuthBootstrapGate>
  );
}
