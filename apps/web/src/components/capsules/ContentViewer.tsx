"use client";

import { useState, useEffect } from "react";
import type { UnlockResult } from "@time-capsule/types";

interface ContentViewerProps {
  unlockResult: UnlockResult;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export function ContentViewer({
  unlockResult,
  isOpen,
  onClose,
  onDownload,
}: ContentViewerProps) {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>(
    "application/octet-stream"
  );
  const [isImage, setIsImage] = useState(false);
  const [isText, setIsText] = useState(false);
  const [textContent, setTextContent] = useState<string>("");

  useEffect(() => {
    if (isOpen && unlockResult.content) {
      processContent();
    }

    return () => {
      if (contentUrl) {
        URL.revokeObjectURL(contentUrl);
      }
    };
  }, [isOpen, unlockResult]);

  const processContent = async () => {
    if (!unlockResult.content) return;

    const content = unlockResult.content;
    const detectedType = unlockResult.contentType || detectContentType(content);
    setContentType(detectedType);

    // Create blob URL for content
    const blob = new Blob([new Uint8Array(content)], { type: detectedType });
    const url = URL.createObjectURL(blob);
    setContentUrl(url);

    // Determine content type for display
    if (detectedType.startsWith("image/")) {
      setIsImage(true);
      setIsText(false);
    } else if (
      detectedType.startsWith("text/") ||
      detectedType === "application/json" ||
      detectedType === "application/xml"
    ) {
      setIsText(true);
      setIsImage(false);

      // Convert to text for display
      try {
        const text = new TextDecoder("utf-8").decode(content);
        setTextContent(text);
      } catch (error) {
        console.error("Failed to decode text content:", error);
        setTextContent("Failed to decode text content");
      }
    } else {
      setIsImage(false);
      setIsText(false);
    }
  };

  const detectContentType = (content: Uint8Array): string => {
    // Simple content type detection based on file signatures
    const bytes = Array.from(content.slice(0, 16));

    // PNG
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return "image/png";
    }

    // JPEG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }

    // GIF
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return "image/gif";
    }

    // WebP
    if (
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "image/webp";
    }

    // PDF
    if (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    ) {
      return "application/pdf";
    }

    // Try to detect if it's text
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        content.slice(0, 1024)
      );
      // If we can decode it and it contains mostly printable characters, assume it's text
      const printableRatio =
        text
          .split("")
          .filter(
            (c) =>
              c.charCodeAt(0) >= 32 || c === "\n" || c === "\r" || c === "\t"
          ).length / text.length;
      if (printableRatio > 0.8) {
        return "text/plain";
      }
    } catch {
      // Not valid UTF-8
    }

    return "application/octet-stream";
  };

  const handleDownload = () => {
    if (!contentUrl || !unlockResult.content) return;

    const link = document.createElement("a");
    link.href = contentUrl;
    link.download = `capsule-${
      unlockResult.capsuleId?.slice(0, 8) || "content"
    }.${getFileExtension(contentType)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onDownload?.();
  };

  const getFileExtension = (mimeType: string): string => {
    const extensions: { [key: string]: string } = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "text/plain": "txt",
      "text/html": "html",
      "application/json": "json",
      "application/pdf": "pdf",
      "application/xml": "xml",
    };

    return extensions[mimeType] || "bin";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Capsule Content
            </h2>
            <div className="text-sm text-gray-600 mt-1">
              <span>Type: {contentType}</span>
              {unlockResult.content && (
                <span className="ml-4">
                  Size: {formatFileSize(unlockResult.content.length)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isImage && contentUrl && (
            <div className="flex justify-center">
              <img
                src={contentUrl}
                alt="Capsule content"
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                onError={() => {
                  setIsImage(false);
                  setIsText(false);
                }}
              />
            </div>
          )}

          {isText && (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-auto max-h-96">
                {textContent}
              </pre>
            </div>
          )}

          {!isImage && !isText && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Binary Content
              </h3>
              <p className="text-gray-600 mb-4">
                This content cannot be previewed in the browser.
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Download to View
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">Capsule ID:</span>
              <span className="ml-2 font-mono">{unlockResult.capsuleId}</span>
            </div>
            {unlockResult.cid && (
              <div>
                <span className="font-medium">IPFS CID:</span>
                <span className="ml-2 font-mono">
                  {unlockResult.cid.slice(0, 20)}...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
