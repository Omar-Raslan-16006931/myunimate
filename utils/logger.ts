/**
 * Secure Logging Utility
 * Prevents sensitive data from being logged in production
 */

interface LogContext {
  context: string;
  userId?: string;
  timestamp: string;
  environment: string;
}

interface LogEntry extends LogContext {
  level: "error" | "warn" | "info" | "debug";
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Storage for log history (in-memory, cleared periodically)
const logHistory: LogEntry[] = [];
const MAX_LOGS = 1000;

/**
 * Check if error contains sensitive information
 */
const hasSensitiveData = (error: any): boolean => {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /credential/i,
    /api[_-]?key/i,
    /authorization/i,
    /bearer/i,
  ];

  const errorStr = String(error).toLowerCase();
  return sensitivePatterns.some((pattern) => pattern.test(errorStr));
};

/**
 * Sanitize error message - remove sensitive data
 */
const sanitizeError = (error: any): { message: string; code?: string } => {
  const message = error.message || String(error);

  if (hasSensitiveData(message)) {
    // Return generic message if contains sensitive data
    return {
      message: "An error occurred",
      code: error.code || "UNKNOWN_ERROR",
    };
  }

  // Return only first line of error message
  return {
    message: message.split("\n")[0],
    code: error.code,
  };
};

/**
 * Build log context
 */
const buildContext = (context: string, userId?: string): LogContext => {
  return {
    context,
    userId,
    timestamp: new Date().toISOString(),
    environment: typeof process !== "undefined" ? process.env.NODE_ENV || "production" : "browser",
  };
};

/**
 * Add log entry to history
 */
const addToHistory = (entry: LogEntry): void => {
  logHistory.push(entry);

  // Keep history size manageable
  if (logHistory.length > MAX_LOGS) {
    logHistory.shift();
  }
};

/**
 * Format log for console output
 */
const formatLog = (entry: LogEntry): string => {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
  let message = `${prefix} ${entry.message}`;

  if (entry.code) {
    message += ` (code: ${entry.code})`;
  }

  if (entry.details && Object.keys(entry.details).length > 0) {
    message += ` ${JSON.stringify(entry.details)}`;
  }

  return message;
};

/**
 * Log error with sanitization
 */
export const logError = (
  context: string,
  error: any,
  userId?: string,
  additionalDetails?: Record<string, any>
): void => {
  const sanitized = sanitizeError(error);
  const logContext = buildContext(context, userId);

  const entry: LogEntry = {
    ...logContext,
    level: "error",
    message: sanitized.message,
    code: sanitized.code,
    details: additionalDetails,
  };

  addToHistory(entry);

  // Log based on environment
  if (process.env.NODE_ENV === "development") {
    console.error(formatLog(entry));
    // In development, also log additional context
    if (process.env.DEBUG) {
      console.error("Full error:", error);
    }
  } else {
    // In production, send to monitoring service (Sentry, etc.)
    // For now, just store in history for manual inspection
    console.error(formatLog(entry));
  }
};

/**
 * Log warning
 */
export const logWarn = (
  context: string,
  message: string,
  userId?: string,
  additionalDetails?: Record<string, any>
): void => {
  const logContext = buildContext(context, userId);

  const entry: LogEntry = {
    ...logContext,
    level: "warn",
    message,
    details: additionalDetails,
  };

  addToHistory(entry);

  if (process.env.NODE_ENV === "development") {
    console.warn(formatLog(entry));
  }
};

/**
 * Log info message
 */
export const logInfo = (
  context: string,
  message: string,
  userId?: string,
  additionalDetails?: Record<string, any>
): void => {
  const logContext = buildContext(context, userId);

  const entry: LogEntry = {
    ...logContext,
    level: "info",
    message,
    details: additionalDetails,
  };

  addToHistory(entry);

  if (process.env.NODE_ENV === "development") {
    console.info(formatLog(entry));
  }
};

/**
 * Log debug message (only in development)
 */
export const logDebug = (
  context: string,
  message: string,
  userId?: string,
  additionalDetails?: Record<string, any>
): void => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const logContext = buildContext(context, userId);

  const entry: LogEntry = {
    ...logContext,
    level: "debug",
    message,
    details: additionalDetails,
  };

  addToHistory(entry);
  console.debug(formatLog(entry));
};

/**
 * Get log history (for debugging, admin only)
 */
export const getLogHistory = (limit: number = 100): LogEntry[] => {
  return logHistory.slice(-limit);
};

/**
 * Clear log history
 */
export const clearLogHistory = (): void => {
  logHistory.length = 0;
};

/**
 * Log authentication event
 */
export const logAuthEvent = (
  event: "signin" | "signup" | "logout" | "session_check",
  userId?: string,
  success: boolean = true
): void => {
  logInfo(
    "AUTH_EVENT",
    `${event}: ${success ? "success" : "failed"}`,
    userId,
    { event, success }
  );
};

/**
 * Log data access event
 */
export const logDataAccess = (
  operation: "read" | "create" | "update" | "delete",
  resource: string,
  userId?: string,
  success: boolean = true
): void => {
  logInfo(
    "DATA_ACCESS",
    `${operation} ${resource}: ${success ? "success" : "failed"}`,
    userId,
    { operation, resource, success }
  );
};

/**
 * Log API call
 */
export const logAPICall = (
  endpoint: string,
  method: string,
  userId?: string,
  statusCode?: number
): void => {
  logInfo(
    "API_CALL",
    `${method} ${endpoint}: ${statusCode || "pending"}`,
    userId,
    { endpoint, method, statusCode }
  );
};

/**
 * Log rate limit event
 */
export const logRateLimitEvent = (
  userId: string,
  endpoint: string,
  limit: number
): void => {
  logWarn(
    "RATE_LIMIT",
    `User exceeded rate limit on ${endpoint}`,
    userId,
    { endpoint, limit }
  );
};

/**
 * Log security event (potential threat)
 */
export const logSecurityEvent = (
  event: string,
  userId?: string,
  details?: Record<string, any>
): void => {
  logError(
    "SECURITY_EVENT",
    event,
    userId,
    details
  );
};

/**
 * Export logs for analysis
 */
export const exportLogs = (): { logs: LogEntry[]; count: number } => {
  return {
    logs: [...logHistory],
    count: logHistory.length,
  };
};
