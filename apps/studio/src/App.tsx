import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./renderer/src/features/auth/context/AuthProvider";
import { ThemeProvider } from "./renderer/src/features/theme/context/ThemeProvider";
import { AppRoutes } from "./renderer/src/routes/AppRoutes";
import { DiagnosticProjectGate } from "./renderer/src/shared/components/DiagnosticProjectGate";
import { ViewportDebugTool } from "./renderer/src/shared/components/ViewportDebugTool";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DiagnosticProjectGate>
          <HashRouter>
            <AppRoutes />
            <ViewportDebugTool />
          </HashRouter>
        </DiagnosticProjectGate>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
