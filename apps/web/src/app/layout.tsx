import type { Metadata } from "next";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";

export const metadata: Metadata = {
  title: "Decentralized Time Capsule",
  description:
    "Store encrypted content with blockchain-based unlock conditions",
};

import { SuiProvider } from "../providers/SuiProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <SuiProvider>
            <div id="root">{children}</div>
          </SuiProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
