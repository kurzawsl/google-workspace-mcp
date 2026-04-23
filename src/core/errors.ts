import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export function toolNotFound(name: string): McpError {
  return new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
}

export function invalidParams(message: string): McpError {
  return new McpError(ErrorCode.InvalidParams, message);
}

export function internalError(message: string): McpError {
  return new McpError(ErrorCode.InternalError, message);
}

export function authError(message: string): McpError {
  return new McpError(ErrorCode.InvalidRequest, message);
}

export function wrapGoogleError(error: unknown, operation: string): McpError {
  // Log full error server-side (may contain URLs, tokens, internal details)
  console.error(`[google-workspace] ${operation} error:`, error);

  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("invalid_client") ||
    message.includes("invalid_grant") ||
    message.includes("unauthorized") ||
    message.includes("401")
  ) {
    return authError(`Authentication failed during ${operation}. Please re-run auth setup.`);
  }

  if (message.includes("Rate Limit") || message.includes("rateLimitExceeded") || message.includes("429")) {
    return internalError(`Quota exceeded during ${operation}. Please retry later.`);
  }

  if (message.includes("notFound") || message.includes("Not Found") || message.includes("404")) {
    return invalidParams(`Resource not found during ${operation}.`);
  }

  if (message.includes("forbidden") || message.includes("403")) {
    return authError(`Access denied during ${operation}. Check OAuth scopes.`);
  }

  return internalError(`${operation} failed. Check server logs for details.`);
}
