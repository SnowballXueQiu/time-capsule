"use client";

import { useMobileTabBarHeight } from "../hooks/useMobileTabBarHeight";
import { useLatestCommit } from "../hooks/useLatestCommit";

export function Footer() {
  const { height: tabBarHeight, isMobile } = useMobileTabBarHeight();
  const { commit, loading, error } = useLatestCommit();

  return (
    <footer
      className="bg-gray-50 border-t border-gray-200 md:pb-0"
      style={{
        paddingBottom: isMobile ? `${tabBarHeight + 16}px` : "0",
      }}
    >
      <div className="max-w-7xl mx-auto py-4 md:py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <img
                src="/logo.svg"
                alt="TimeCapsule Logo"
                className="w-6 h-6 mr-3"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  TimeCapsule
                </h3>
                <p className="text-sm text-gray-600">
                  Decentralized Time Storage
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 max-w-md">
              Store your messages and files with blockchain-enforced time locks.
              Built on Sui blockchain with IPFS storage.
            </p>
          </div>

          {/* Technology Stack */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Powered By
            </h4>
            <div className="space-y-2">
              <a
                href="https://sui.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <span className="mr-2 group-hover:scale-110 transition-transform">
                  🔗
                </span>
                Sui Blockchain
              </a>
              <a
                href="https://www.rust-lang.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <span className="mr-2 group-hover:scale-110 transition-transform">
                  🦀
                </span>
                Rust WASM Crypto
              </a>
              <a
                href="https://pinata.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <span className="mr-2 group-hover:scale-110 transition-transform">
                  📁
                </span>
                Pinata IPFS
              </a>
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <span className="mr-2 group-hover:scale-110 transition-transform">
                  ⚛️
                </span>
                Next.js
              </a>
              <a
                href="https://reactjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <span className="mr-2 group-hover:scale-110 transition-transform">
                  ⚛️
                </span>
                React
              </a>
            </div>
          </div>

          {/* Links and Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Open Source
            </h4>
            <div className="space-y-2">
              <a
                href="https://github.com/SnowballXueQiu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <svg
                  className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                SnowballXueQiu
              </a>
              <a
                href="https://github.com/SnowballXueQiu/time-capsule"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <svg
                  className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Project Repository
              </a>
              <div className="text-sm text-gray-500">MIT License</div>
            </div>
          </div>
        </div>

        {/* Latest Commit Info */}
        {commit && (
          <div className="mt-6 p-3 sm:p-4 bg-gray-100 rounded-lg border border-gray-200">
            {/* Mobile Layout */}
            <div className="block sm:hidden space-y-3">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-gray-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Latest Commit
                </span>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono text-gray-800 ml-auto">
                  {commit.sha.slice(0, 7)}
                </code>
              </div>
              <div
                className="text-sm text-gray-600 break-words overflow-hidden"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {commit.message}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <span>by {commit.author}</span>
                  <span>•</span>
                  <span>{new Date(commit.date).toLocaleDateString()}</span>
                </div>
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                >
                  View →
                </a>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    Latest Commit
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono text-gray-800">
                    {commit.sha.slice(0, 7)}
                  </code>
                  <span className="text-sm text-gray-600 truncate max-w-xs">
                    {commit.message}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span>by {commit.author}</span>
                <span>•</span>
                <span>{new Date(commit.date).toLocaleDateString()}</span>
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Loading/Error State for Commit */}
        {loading && (
          <div className="mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0"></div>
              <span>Loading latest commit...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2 text-sm text-red-600">
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="break-words">
                Failed to load commit info: {error}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2025 SnowballXueQiu. Built with ❤️ for the decentralized future.
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-xs text-gray-400">Powered by</span>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Sui</span>
                <span>•</span>
                <span>Pinata</span>
                <span>•</span>
                <span>IPFS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
