import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decentralized Time Capsule",
  description:
    "Store encrypted content with blockchain-based unlock conditions",
};

import { QueryProvider } from "../providers/QueryProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <div id="root">{children}</div>
        </QueryProvider>
      </body>
    </html>
  );
}
