import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./renderer/src/features/auth/context/AuthProvider";
import { ThemeProvider } from "./renderer/src/features/theme/context/ThemeProvider";
import { AppRoutes } from "./renderer/src/routes/AppRoutes";
import { ViewportDebugTool } from "./renderer/src/shared/components/ViewportDebugTool";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
          <ViewportDebugTool />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
