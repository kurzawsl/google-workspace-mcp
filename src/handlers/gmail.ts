import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import type { GoogleWorkspaceContext, ToolHandler } from "../types.js";
import { formatSuccess } from "../core/response-formatter.js";
import { wrapGoogleError, invalidParams } from "../core/errors.js";

const GMAIL_USER = "me";

// --- Email Operations ---

export const searchEmails: ToolHandler = async (ctx, args) => {
  try {
    const query = (args.query as string) || "in:inbox";
    const maxResults = (args.maxResults as number) || 20;

    // Use messages.list with snippet format to avoid N+1 API calls.
    // For full content, use read_email on individual messages.
    const response = await ctx.gmail.users.messages.list({
      userId: GMAIL_USER,
      q: query,
      maxResults,
    });

    const messages = response.data.messages || [];
    if (messages.length === 0) {
      return formatSuccess({ emails: [], resultSizeEstimate: 0 });
    }

    // Batch fetch metadata for all messages concurrently (max 20 concurrent)
    const BATCH_SIZE = 20;
    const emails = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((msg) =>
          ctx.gmail.users.messages.get({
            userId: GMAIL_USER,
            id: msg.id!,
            format: "metadata",
            metadataHeaders: ["From", "To", "Subject", "Date"],
          })
        )
      );
      for (const email of results) {
        const headers = email.data.payload?.headers || [];
        emails.push({
          id: email.data.id,
          threadId: email.data.threadId,
          from: headers.find((h) => h.name === "From")?.value,
          to: headers.find((h) => h.name === "To")?.value,
          subject: headers.find((h) => h.name === "Subject")?.value,
          date: headers.find((h) => h.name === "Date")?.value,
          snippet: email.data.snippet,
          labelIds: email.data.labelIds,
        });
      }
    }

    return formatSuccess({
      emails,
      resultSizeEstimate: response.data.resultSizeEstimate,
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error) {
    throw wrapGoogleError(error, "search_emails");
  }
};

export const readEmail: ToolHandler = async (ctx, args) => {
  try {
    const messageId = args.messageId as string;
    const email = await ctx.gmail.users.messages.get({
      userId: GMAIL_USER,
      id: messageId,
      format: "full",
    });

    const headers = email.data.payload?.headers || [];
    const body = extractBody(email.data.payload);
    const attachments = extractAttachments(email.data.payload);

    return formatSuccess({
      id: email.data.id,
      threadId: email.data.threadId,
      from: headers.find((h) => h.name === "From")?.value,
      to: headers.find((h) => h.name === "To")?.value,
      cc: headers.find((h) => h.name === "Cc")?.value,
      subject: headers.find((h) => h.name === "Subject")?.value,
      date: headers.find((h) => h.name === "Date")?.value,
      messageId: headers.find((h) => h.name === "Message-ID")?.value,
      body,
      attachments,
      labelIds: email.data.labelIds,
    });
  } catch (error) {
    throw wrapGoogleError(error, "read_email");
  }
};

export const sendEmail: ToolHandler = async (ctx, args) => {
  try {
    const raw = await buildRawMessage(args);

    const params: Record<string, unknown> = {
      userId: GMAIL_USER,
      requestBody: { raw },
    };

    if (args.threadId) {
      (params.requestBody as Record<string, unknown>).threadId = args.threadId;
    }

    const response = await ctx.gmail.users.messages.send(params as any);

    return formatSuccess({
      id: response.data.id,
      threadId: response.data.threadId,
      labelIds: response.data.labelIds,
    });
  } catch (error) {
    throw wrapGoogleError(error, "send_email");
  }
};

export const draftEmail: ToolHandler = async (ctx, args) => {
  try {
    const raw = await buildRawMessage(args);

    const requestBody: Record<string, unknown> = {
      message: { raw },
    };

    if (args.threadId) {
      (requestBody.message as Record<string, unknown>).threadId = args.threadId;
    }

    const response = await ctx.gmail.users.drafts.create({
      userId: GMAIL_USER,
      requestBody: requestBody as any,
    });

    return formatSuccess({
      id: response.data.id,
      message: response.data.message,
    });
  } catch (error) {
    throw wrapGoogleError(error, "draft_email");
  }
};

export const modifyEmail: ToolHandler = async (ctx, args) => {
  try {
    const messageId = args.messageId as string;
    const requestBody: Record<string, unknown> = {};

    if (args.addLabelIds) requestBody.addLabelIds = args.addLabelIds;
    if (args.removeLabelIds) requestBody.removeLabelIds = args.removeLabelIds;

    const response = await ctx.gmail.users.messages.modify({
      userId: GMAIL_USER,
      id: messageId,
      requestBody: requestBody as any,
    });

    return formatSuccess({
      id: response.data.id,
      labelIds: response.data.labelIds,
    });
  } catch (error) {
    throw wrapGoogleError(error, "modify_email");
  }
};

export const listEmailLabels: ToolHandler = async (ctx) => {
  try {
    const response = await ctx.gmail.users.labels.list({ userId: "me" });
    return formatSuccess(response.data.labels || []);
  } catch (error) {
    throw wrapGoogleError(error, "list_email_labels");
  }
};

export const batchModifyEmails: ToolHandler = async (ctx, args) => {
  try {
    const messageIds = args.messageIds as string[];
    const batchSize = (args.batchSize as number) || 50;
    const results: Array<{ batch: number; count: number; status: string }> = [];

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const requestBody: Record<string, unknown> = { ids: batch };
      if (args.addLabelIds) requestBody.addLabelIds = args.addLabelIds;
      if (args.removeLabelIds) requestBody.removeLabelIds = args.removeLabelIds;

      await ctx.gmail.users.messages.batchModify({
        userId: GMAIL_USER,
        requestBody: requestBody as any,
      });

      results.push({
        batch: Math.floor(i / batchSize) + 1,
        count: batch.length,
        status: "success",
      });
    }

    return formatSuccess({ totalProcessed: messageIds.length, batches: results });
  } catch (error) {
    throw wrapGoogleError(error, "batch_modify_emails");
  }
};

// Default root directory for attachment downloads.
// Callers may only write within this directory (or a subdirectory they supply
// that is itself contained within this root).
const DEFAULT_ATTACHMENT_ROOT = path.join(os.homedir(), "Downloads", "gmail-attachments");

/**
 * Resolves and validates a caller-supplied savePath against an allowed root.
 *
 * Rules:
 * - If savePath is omitted → use DEFAULT_ATTACHMENT_ROOT.
 * - If savePath is absolute → it must be inside DEFAULT_ATTACHMENT_ROOT.
 * - If savePath is relative → resolve it relative to DEFAULT_ATTACHMENT_ROOT
 *   and verify the result still starts with that root.
 *
 * Throws McpError(InvalidParams) for any traversal attempt.
 */
function resolveAttachmentDir(savePath: string | undefined): string {
  const root = DEFAULT_ATTACHMENT_ROOT;

  if (!savePath) {
    return root;
  }

  // Resolve: absolute paths are taken as-is, relative ones are anchored to root.
  const candidate = path.isAbsolute(savePath)
    ? path.resolve(savePath)
    : path.resolve(root, savePath);

  // The resolved path must start with root + sep to prevent e.g. /home/lukaszDownloads
  // (a directory that shares the prefix but isn't inside root).
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (candidate !== root && !candidate.startsWith(rootWithSep)) {
    throw invalidParams(
      `savePath must be within the allowed downloads root (${root}). ` +
        `Attempted path: ${candidate}`
    );
  }

  return candidate;
}

export const downloadAttachment: ToolHandler = async (ctx, args) => {
  try {
    const messageId = args.messageId as string;
    const attachmentId = args.attachmentId as string;

    // Validate savePath — throws McpError on traversal
    const resolvedDir = resolveAttachmentDir(args.savePath as string | undefined);

    // Sanitize filename to prevent path traversal within the resolved directory
    const rawFilename = (args.filename as string) || `attachment_${attachmentId}`;
    const safeFilename = path.basename(rawFilename);

    const attachment = await ctx.gmail.users.messages.attachments.get({
      userId: GMAIL_USER,
      messageId,
      id: attachmentId,
    });

    const data = Buffer.from(attachment.data.data!, "base64");
    const filePath = path.join(resolvedDir, safeFilename);

    // Ensure parent directory exists before writing
    await fs.mkdir(resolvedDir, { recursive: true });
    await fs.writeFile(filePath, data);

    return formatSuccess({
      saved: true,
      path: filePath,
      size: data.length,
    });
  } catch (error) {
    if (error instanceof Error && error.constructor.name === "McpError") {
      throw error;
    }
    throw wrapGoogleError(error, "download_attachment");
  }
};

export const readAttachmentText: ToolHandler = async (ctx, args) => {
  try {
    const messageId = args.messageId as string;
    const attachmentId = args.attachmentId as string;
    const mimeType = (args.mimeType as string) || "";
    const filename = (args.filename as string) || "attachment";

    const attachment = await ctx.gmail.users.messages.attachments.get({
      userId: GMAIL_USER,
      messageId,
      id: attachmentId,
    });

    const data = Buffer.from(attachment.data.data!, "base64");

    // PDF extraction
    if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
      const pdfModule = await import("pdf-parse");
      const pdfParse = pdfModule.default || pdfModule;
      const result = await (pdfParse as (buf: Buffer) => Promise<{ numpages: number; text: string }>)(data);
      return formatSuccess({
        filename,
        mimeType: "application/pdf",
        pages: result.numpages,
        text: result.text,
      });
    }

    // Plain text formats
    const textTypes = ["text/plain", "text/csv", "text/html", "text/xml", "application/json", "application/xml"];
    const textExtensions = [".txt", ".csv", ".html", ".htm", ".json", ".xml", ".md", ".log"];
    const ext = path.extname(filename).toLowerCase();

    if (textTypes.includes(mimeType) || textExtensions.includes(ext)) {
      return formatSuccess({
        filename,
        mimeType: mimeType || "text/plain",
        text: data.toString("utf-8"),
      });
    }

    return formatSuccess({
      filename,
      mimeType,
      error: `Cannot extract text from ${mimeType || ext} files. Use download_attachment to save the file to disk instead.`,
    });
  } catch (error) {
    throw wrapGoogleError(error, "read_attachment_text");
  }
};

// --- Label Operations ---

export const createLabel: ToolHandler = async (ctx, args) => {
  try {
    const response = await ctx.gmail.users.labels.create({
      userId: GMAIL_USER,
      requestBody: {
        name: args.name as string,
        labelListVisibility: args.labelListVisibility as string,
        messageListVisibility: args.messageListVisibility as string,
      } as any,
    });
    return formatSuccess(response.data);
  } catch (error) {
    throw wrapGoogleError(error, "create_label");
  }
};

export const updateLabel: ToolHandler = async (ctx, args) => {
  try {
    const id = args.id as string;
    const requestBody: Record<string, unknown> = {};
    if (args.name) requestBody.name = args.name;
    if (args.labelListVisibility) requestBody.labelListVisibility = args.labelListVisibility;
    if (args.messageListVisibility) requestBody.messageListVisibility = args.messageListVisibility;

    const response = await ctx.gmail.users.labels.update({
      userId: GMAIL_USER,
      id,
      requestBody: requestBody as any,
    });
    return formatSuccess(response.data);
  } catch (error) {
    throw wrapGoogleError(error, "update_label");
  }
};

export const deleteLabel: ToolHandler = async (ctx, args) => {
  try {
    const id = args.id as string;
    await ctx.gmail.users.labels.delete({ userId: "me", id });
    return formatSuccess({ deleted: true, id });
  } catch (error) {
    throw wrapGoogleError(error, "delete_label");
  }
};

export const getOrCreateLabel: ToolHandler = async (ctx, args) => {
  try {
    const name = args.name as string;
    const labelsRes = await ctx.gmail.users.labels.list({ userId: "me" });
    const existing = (labelsRes.data.labels || []).find(
      (l) => l.name?.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      return formatSuccess({ ...existing, created: false });
    }

    const response = await ctx.gmail.users.labels.create({
      userId: GMAIL_USER,
      requestBody: {
        name,
        labelListVisibility: args.labelListVisibility as string,
        messageListVisibility: args.messageListVisibility as string,
      } as any,
    });
    return formatSuccess({ ...response.data, created: true });
  } catch (error) {
    throw wrapGoogleError(error, "get_or_create_label");
  }
};

// --- Filter Operations (read-only) ---

export const listFilters: ToolHandler = async (ctx) => {
  try {
    const response = await ctx.gmail.users.settings.filters.list({ userId: "me" });
    return formatSuccess(response.data.filter || []);
  } catch (error) {
    throw wrapGoogleError(error, "list_filters");
  }
};

export const getFilter: ToolHandler = async (ctx, args) => {
  try {
    const filterId = args.filterId as string;
    const response = await ctx.gmail.users.settings.filters.get({
      userId: GMAIL_USER,
      id: filterId,
    });
    return formatSuccess(response.data);
  } catch (error) {
    throw wrapGoogleError(error, "get_filter");
  }
};

// --- Helpers ---

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  if (payload.parts) {
    // Prefer text/plain, fallback to text/html
    let htmlBody = "";
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      if (part.mimeType === "text/html" && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      // Recurse into nested multipart
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
    return htmlBody;
  }

  return "";
}

function extractAttachments(payload: any, result: any[] = []): any[] {
  if (!payload?.parts) return result;

  for (const part of payload.parts) {
    if (part.filename && part.body?.attachmentId) {
      result.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      extractAttachments(part, result);
    }
  }
  return result;
}

// Maps common file extensions to MIME types for attachments
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".tar": "application/x-tar",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".html": "text/html",
  ".json": "application/json",
  ".xml": "application/xml",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

async function buildRawMessage(args: Record<string, unknown>): Promise<string> {
  const to = (args.to as string[]).join(", ");
  const subject = args.subject as string;
  const body = args.body as string;
  const cc = args.cc as string[] | undefined;
  const bcc = args.bcc as string[] | undefined;
  const htmlBody = args.htmlBody as string | undefined;
  const mimeType = (args.mimeType as string) || "text/plain";
  const inReplyTo = args.inReplyTo as string | undefined;
  const attachmentPaths = args.attachments as string[] | undefined;

  const headers: string[] = [
    `To: ${to}`,
    `Subject: ${encodeRFC2047(subject)}`,
    "MIME-Version: 1.0",
  ];

  if (cc?.length) headers.push(`Cc: ${cc.join(", ")}`);
  if (bcc?.length) headers.push(`Bcc: ${bcc.join(", ")}`);
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  // Build the text body part
  let bodyPart: string;
  if (mimeType === "multipart/alternative" && htmlBody) {
    const altBoundary = `alt_boundary_${Date.now()}`;
    bodyPart = [
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
      `--${altBoundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      htmlBody,
      `--${altBoundary}--`,
    ].join("\r\n");
  } else {
    const contentType = mimeType === "text/html" ? "text/html" : "text/plain";
    const content = htmlBody && mimeType === "text/html" ? htmlBody : body;
    bodyPart = [
      `Content-Type: ${contentType}; charset=UTF-8`,
      "",
      content,
    ].join("\r\n");
  }

  // If no attachments, send simple message
  if (!attachmentPaths?.length) {
    const raw = headers.join("\r\n") + "\r\n" + bodyPart;
    return Buffer.from(raw).toString("base64url");
  }

  // With attachments: wrap everything in multipart/mixed
  const mixedBoundary = `mixed_boundary_${Date.now()}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);

  const parts: string[] = [
    headers.join("\r\n"),
    "",
    `--${mixedBoundary}`,
    bodyPart,
  ];

  // Read and encode each attachment
  for (const filePath of attachmentPaths) {
    const resolvedPath = path.resolve(filePath);
    const fileData = await fs.readFile(resolvedPath);
    const base64Data = fileData.toString("base64");
    const filename = path.basename(resolvedPath);
    const fileMimeType = getMimeType(resolvedPath);

    parts.push(
      `--${mixedBoundary}`,
      `Content-Type: ${fileMimeType}; name="${encodeRFC2047(filename)}"`,
      `Content-Disposition: attachment; filename="${encodeRFC2047(filename)}"`,
      "Content-Transfer-Encoding: base64",
      "",
      // Split base64 into 76-char lines per RFC 2045
      base64Data.replace(/(.{76})/g, "$1\r\n"),
    );
  }

  parts.push(`--${mixedBoundary}--`);

  const raw = parts.join("\r\n");
  return Buffer.from(raw).toString("base64url");
}

function encodeRFC2047(str: string): string {
  if (!/[^\x00-\x7F]/.test(str)) return str;
  const encoded = Buffer.from(str, "utf-8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}
