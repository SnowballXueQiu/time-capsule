import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-600 text-sm">
            <p>
              &copy; 2025 Decentralized Time Capsule. Built with Sui blockchain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
