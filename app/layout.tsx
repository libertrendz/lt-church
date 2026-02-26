/* PATH: app/layout.tsx */
import type { Metadata } from "next";
import AuthGate from "./components/AuthGate";
import AppHeader from "./components/AppHeader";

export const metadata: Metadata = {
  title: "LTZ-CHURCH",
  description: "Multi-tenant SaaS para igrejas"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <AuthGate>
          <AppHeader />
          {children}
        </AuthGate>
      </body>
    </html>
  );
}