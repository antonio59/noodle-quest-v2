import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// Hook for reporting errors from the client
export function useReportError() {
  const createReport = useMutation(api.reports.createReport);

  const reportError = async (options: {
    gameId?: string;
    errorType: "runtime" | "logic" | "ui" | "performance";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    stackTrace?: string;
    context?: any;
  }) => {
    try {
      // Generate a unique error ID based on the error signature
      const errorId = generateErrorId(options.gameId, options.message, options.errorType);

      await createReport({
        errorId,
        gameId: options.gameId,
        errorType: options.errorType,
        severity: options.severity,
        message: options.message,
        stackTrace: options.stackTrace,
        context: options.context,
      });

      console.log(`Error reported: ${errorId}`);
      return errorId;
    } catch (error) {
      console.error("Failed to report error:", error);
      return null;
    }
  };

  return reportError;
}

// Generate a stable error ID for deduplication
function generateErrorId(gameId: string | undefined, message: string, errorType: string): string {
  const key = `${gameId || "unknown"}:${errorType}:${message.substring(0, 50)}`;
  // Simple hash for deduplication
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `err_${Math.abs(hash).toString(36)}`;
}

// Global error boundary helper — returns cleanup function to remove listeners
export function setupGlobalErrorReporting(reportError: (opts: any) => Promise<string | null>): () => void {
  const rejectionHandler = (event: PromiseRejectionEvent) => {
    reportError({
      errorType: "runtime",
      severity: "high",
      message: `Unhandled rejection: ${event.reason?.message || event.reason}`,
      stackTrace: event.reason?.stack,
    });
  };

  const errorHandler = (event: ErrorEvent) => {
    reportError({
      errorType: "runtime",
      severity: "high",
      message: `Global error: ${event.message}`,
      stackTrace: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  window.addEventListener("unhandledrejection", rejectionHandler);
  window.addEventListener("error", errorHandler);

  return () => {
    window.removeEventListener("unhandledrejection", rejectionHandler);
    window.removeEventListener("error", errorHandler);
  };
}
