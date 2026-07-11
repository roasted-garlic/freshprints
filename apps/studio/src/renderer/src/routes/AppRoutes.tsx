import { Navigate, Route, Routes } from "react-router-dom";

import { AuthBootstrapGate } from "../features/auth/components/AuthBootstrapGate";
import { AuthenticatedRouteGate } from "../features/auth/components/AuthenticatedRouteGate";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { AiReviewPage } from "../features/ai-review/pages/AiReviewPage";
import { CustomerRequestsPage } from "../features/customer-requests/pages/CustomerRequestsPage";
import { DesignLibraryPage } from "../features/designs/pages/DesignLibraryPage";
import { GangSheetBuilderPage } from "../features/gang-sheets/pages/GangSheetBuilderPage";
import { ImportsPage } from "../features/imports/pages/ImportsPage";
import { PrintRequestsPage } from "../features/print-requests/pages/PrintRequestsPage";
import { StaffInboxPage } from "../features/staff-inbox/pages/StaffInboxPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { TestDataResetPage } from "../features/test-data-reset/pages/TestDataResetPage";
import { UpcomingShowsPage } from "../features/upcoming-shows/pages/UpcomingShowsPage";
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
            path="/inbox"
            element={
              <ProtectedRoute permission="viewPrintRequests">
                <StaffInboxPage />
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
              <ProtectedRoute permission="viewUpcomingShows">
                <UpcomingShowsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/print-runs" element={<Navigate replace to="/show-queue" />} />
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
          <Route
            path="/test-data-reset"
            element={
              <ProtectedRoute permission="manageSettings">
                <TestDataResetPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route
          path="/show-queue/:showId/gang-sheet"
          element={
            <AuthenticatedRouteGate>
              <ProtectedRoute permission="manageUpcomingShows">
                <GangSheetBuilderPage />
              </ProtectedRoute>
            </AuthenticatedRouteGate>
          }
        />
        <Route path="*" element={<Navigate replace to="/designs" />} />
      </Routes>
    </AuthBootstrapGate>
  );
}
