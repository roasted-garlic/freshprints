import { HashRouter } from "react-router-dom";

import { AuthProvider } from "./renderer/src/features/auth/context/AuthProvider";
import { ThemeProvider } from "./renderer/src/features/theme/context/ThemeProvider";
import { AppRoutes } from "./renderer/src/routes/AppRoutes";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
