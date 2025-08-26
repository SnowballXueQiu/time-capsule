"use client";

import { useState, useCallback, useRef } from "react";
import type { ContentData } from "../../types/capsule";

interface ContentUploadProps {
  onSubmit: (data: ContentData) => void;
}

export function ContentUpload({ onSubmit }: ContentUploadProps) {
  const [contentType, setContentType] = useState<"text" | "file">("text");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setContentType("file");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (contentType === "text") {
        if (!textContent.trim()) {
          alert("Please enter some text content");
          return;
        }

        const content = new TextEncoder().encode(textContent);
        onSubmit({
          content,
          contentType: "text/plain",
          filename: "text-content.txt",
        });
      } else {
        if (!selectedFile) {
          alert("Please select a file");
          return;
        }

        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const content = new Uint8Array(arrayBuffer);

          onSubmit({
            content,
            contentType: selectedFile.type || "application/octet-stream",
            filename: selectedFile.name,
          });
        } catch (error) {
          alert("Failed to read file. Please try again.");
        }
      }
    },
    [contentType, textContent, selectedFile, onSubmit]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Upload Your Content
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Content Type
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setContentType("text")}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                contentType === "text"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-medium">Text Content</div>
              <div className="text-sm text-gray-500">Enter text directly</div>
            </button>
            <button
              type="button"
              onClick={() => setContentType("file")}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                contentType === "file"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">📁</div>
              <div className="font-medium">File Upload</div>
              <div className="text-sm text-gray-500">Upload any file</div>
            </button>
          </div>
        </div>

        {/* Text content input */}
        {contentType === "text" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter the text you want to store in your time capsule..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="mt-2 text-sm text-gray-500">
              {textContent.length} characters • {new Blob([textContent]).size}{" "}
              bytes
            </div>
          </div>
        )}

        {/* File upload */}
        {contentType === "file" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>

            {/* Drag and drop area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-4xl">📄</div>
                  <div className="font-medium text-gray-900">
                    {selectedFile.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} •{" "}
                    {selectedFile.type || "Unknown type"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl text-gray-400">📁</div>
                  <div className="text-lg font-medium text-gray-900">
                    Drop your file here
                  </div>
                  <div className="text-sm text-gray-500">
                    or click to browse files
                  </div>
                  <div className="text-xs text-gray-400">
                    Maximum file size: 10MB
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-blue-400 text-xl mr-3">🔒</div>
            <div>
              <h3 className="text-blue-800 font-medium">Security Notice</h3>
              <p className="text-blue-600 text-sm mt-1">
                Your content will be encrypted using XChaCha20-Poly1305 before
                being stored on IPFS. Only you will have the decryption key,
                which will be stored securely in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              (contentType === "text" && !textContent.trim()) ||
              (contentType === "file" && !selectedFile)
            }
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Continue to Unlock Conditions
          </button>
        </div>
      </form>
    </div>
  );
}
