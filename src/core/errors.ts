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
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("invalid_client") || message.includes("invalid_grant")) {
    return authError(`Authentication error during ${operation}: ${message}`);
  }

  if (message.includes("Rate Limit") || message.includes("rateLimitExceeded")) {
    return internalError(`Rate limit hit during ${operation}. Please retry later.`);
  }

  if (message.includes("notFound") || message.includes("Not Found")) {
    return invalidParams(`Resource not found during ${operation}: ${message}`);
  }

  return internalError(`${operation} failed: ${message}`);
}
