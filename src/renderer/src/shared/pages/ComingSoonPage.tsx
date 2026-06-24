import { useMemo, type ReactNode } from "react";

import { useShellHeaderConfig } from "../hooks/useShellHeaderConfig";

interface ComingSoonPageProps {
  children?: ReactNode;
  description: string;
  message: string;
  title: string;
}

export function ComingSoonPage({ children, description, message, title }: ComingSoonPageProps) {
  useShellHeaderConfig(
    useMemo(
      () => ({
        title,
        description,
        search: null,
        primaryAction: null,
      }),
      [description, title],
    ),
  );

  return (
    <main className="page-layout page-layout-shell">
      <section aria-labelledby="coming-soon-title" className="coming-soon-page">
        {children}
        <p className="eyebrow">Roadmap</p>
        <h2 id="coming-soon-title">Coming Soon</h2>
        <p className="coming-soon-message">{message}</p>
      </section>
    </main>
  );
}
