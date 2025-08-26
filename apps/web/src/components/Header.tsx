"use client";

import Link from "next/link";
import { WalletConnection } from "./WalletConnection";

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Time Capsule
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/create"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Create
              </Link>
              <Link
                href="/capsules"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                My Capsules
              </Link>
            </nav>
          </div>
          <WalletConnection />
        </div>
      </div>
    </header>
  );
}
