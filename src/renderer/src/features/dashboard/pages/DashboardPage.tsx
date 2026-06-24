import { useCallback, useMemo, useState } from "react";
import { Bug } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { desktopAppService } from "../../../shared/services/desktopAppService";
import { isElectronDesktop } from "../../../shared/utils/isElectronDesktop";
import { useAuth } from "../../auth/hooks/useAuth";
import { FirebaseConnectionCard } from "../../firebase/components/FirebaseConnectionCard";
import { RoleGate } from "../../permissions/components/RoleGate";
import { permissionService } from "../../permissions/services/permissionService";

export function DashboardPage() {
  const { user } = useAuth();
  const [devToolsError, setDevToolsError] = useState<string | null>(null);
  const [isOpeningDevTools, setIsOpeningDevTools] = useState(false);
  const showDevToolsCard = import.meta.env.DEV && isElectronDesktop();

  const handleOpenDevTools = useCallback(async () => {
    setDevToolsError(null);
    setIsOpeningDevTools(true);

    try {
      await desktopAppService.openDevTools();
    } catch (error) {
      setDevToolsError(
        error instanceof Error ? error.message : "Unable to open DevTools. Please try again.",
      );
    } finally {
      setIsOpeningDevTools(false);
    }
  }, []);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Dashboard",
        description:
          "Core access, roles, shell navigation, and theme support are being established before design workflows begin.",
        search: null,
        primaryAction: null,
      }),
      [],
    ),
  );

  const foundationStats = [
    { label: "Firebase", value: "Connected", isVisible: true },
    { label: "Authentication", value: "Active", isVisible: true },
    { label: "Theme", value: "Ready", isVisible: true },
    { label: "Staff tools", value: "Authorized", isVisible: permissionService.canImportDesigns(user) },
    { label: "Admin tools", value: "Authorized", isVisible: permissionService.canManageUsers(user) },
    { label: "Customer portal", value: "Authorized", isVisible: permissionService.canSubmitCustomerRequests(user) },
  ];

  return (
    <main className="page-layout page-layout-shell">
      <section className="stats-grid" aria-label="Foundation status">
        {foundationStats.filter((stat) => stat.isVisible).map((stat) => (
          <Card className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </Card>
        ))}
      </section>

      <Card className="dashboard-welcome" aria-labelledby="dashboard-welcome-title">
        <div>
          <p className="eyebrow">Signed in</p>
          <h2 id="dashboard-welcome-title">Welcome, {user?.displayName ?? "Fresh Prints user"}</h2>
          <p>Your current role is {user?.role}. Advanced workflows remain locked until later roadmap phases.</p>
        </div>

        <RoleGate
          permission="manageUsers"
          fallback={<p className="auth-message">Owner and admin controls will appear as Phase 1 permissions expand.</p>}
        >
          <p className="auth-message auth-message-success">Owner/admin access confirmed.</p>
        </RoleGate>
      </Card>

      <FirebaseConnectionCard />

      {showDevToolsCard ? (
        <Card className="dashboard-devtools-card" aria-labelledby="dashboard-devtools-title">
          <div className="dashboard-devtools-card-content">
            <div>
              <p className="eyebrow">Development</p>
              <h3 id="dashboard-devtools-title">Developer tools</h3>
              <p>
                Open Electron DevTools to inspect <code>window.freshPrints</code>, test IPC responses,
                and debug the desktop app when keyboard shortcuts are unavailable.
              </p>
              {devToolsError ? <p className="auth-message auth-message-error">{devToolsError}</p> : null}
            </div>

            <Button
              className="button-leading-icon"
              disabled={isOpeningDevTools}
              onClick={() => {
                void handleOpenDevTools();
              }}
              variant="secondary"
            >
              <Bug aria-hidden="true" size={16} strokeWidth={2} />
              {isOpeningDevTools ? "Opening DevTools..." : "Open DevTools"}
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="dashboard-permission-grid" aria-label="Available foundation areas">
        <RoleGate permission="importDesigns">
          <Card>
            <p className="eyebrow">Staff</p>
            <h3>Operational access</h3>
            <p>Design, import, request, and queue permissions are available for future Phase 2 and Phase 3 screens.</p>
          </Card>
        </RoleGate>

        <RoleGate permission="viewAuditLogs">
          <Card>
            <p className="eyebrow">Admin</p>
            <h3>Audit visibility</h3>
            <p>Audit log visibility is enabled for owner and admin roles only.</p>
          </Card>
        </RoleGate>

        <RoleGate permission="submitCustomerRequests">
          <Card>
            <p className="eyebrow">Customer</p>
            <h3>Customer access</h3>
            <p>Customer request permissions are active for future customer-facing workflows.</p>
          </Card>
        </RoleGate>
      </section>

      <EmptyState
        title="No operational workflows yet"
        message="Image imports, queues, and customer requests intentionally start after the Phase 1 foundation is complete."
      />
    </main>
  );
}
