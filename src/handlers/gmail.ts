import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import type { GoogleWorkspaceContext, ToolHandler } from "../types.js";
import { formatSuccess, formatError } from "../core/response-formatter.js";
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
    const raw = buildRawMessage(args);

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
    const raw = buildRawMessage(args);

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

export const deleteEmail: ToolHandler = async (ctx, args) => {
  try {
    const messageId = args.messageId as string;
    await ctx.gmail.users.messages.delete({
      userId: GMAIL_USER,
      id: messageId,
    });
    return formatSuccess({ deleted: true, messageId });
  } catch (error) {
    throw wrapGoogleError(error, "delete_email");
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

export const batchDeleteEmails: ToolHandler = async (ctx, args) => {
  try {
    const messageIds = args.messageIds as string[];
    const batchSize = (args.batchSize as number) || 50;
    const results: Array<{ batch: number; count: number; status: string }> = [];

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      await ctx.gmail.users.messages.batchDelete({
        userId: GMAIL_USER,
        requestBody: { ids: batch },
      });

      results.push({
        batch: Math.floor(i / batchSize) + 1,
        count: batch.length,
        status: "success",
      });
    }

    return formatSuccess({ totalDeleted: messageIds.length, batches: results });
  } catch (error) {
    throw wrapGoogleError(error, "batch_delete_emails");
  }
};

export const downloadAttachment: ToolHandler = async (ctx, args) => {
  try {
    const messageId = args.messageId as string;
    const attachmentId = args.attachmentId as string;
    const savePath = (args.savePath as string) || os.tmpdir();
    // Sanitize filename to prevent path traversal
    const rawFilename = (args.filename as string) || `attachment_${attachmentId}`;
    const safeFilename = path.basename(rawFilename);

    const attachment = await ctx.gmail.users.messages.attachments.get({
      userId: GMAIL_USER,
      messageId,
      id: attachmentId,
    });

    const data = Buffer.from(attachment.data.data!, "base64");
    const filePath = path.join(savePath, safeFilename);

    // Verify resolved path stays within savePath
    const resolvedPath = path.resolve(filePath);
    const resolvedSavePath = path.resolve(savePath);
    if (!resolvedPath.startsWith(resolvedSavePath)) {
      throw invalidParams("Invalid filename: path traversal detected");
    }

    await fs.writeFile(filePath, data);

    return formatSuccess({
      saved: true,
      path: filePath,
      size: data.length,
    });
  } catch (error) {
    throw wrapGoogleError(error, "download_attachment");
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

// --- Filter Operations ---

export const createFilter: ToolHandler = async (ctx, args) => {
  try {
    const response = await ctx.gmail.users.settings.filters.create({
      userId: GMAIL_USER,
      requestBody: {
        criteria: args.criteria as any,
        action: args.action as any,
      },
    });
    return formatSuccess(response.data);
  } catch (error) {
    throw wrapGoogleError(error, "create_filter");
  }
};

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

export const deleteFilter: ToolHandler = async (ctx, args) => {
  try {
    const filterId = args.filterId as string;
    await ctx.gmail.users.settings.filters.delete({
      userId: GMAIL_USER,
      id: filterId,
    });
    return formatSuccess({ deleted: true, filterId });
  } catch (error) {
    throw wrapGoogleError(error, "delete_filter");
  }
};

export const createFilterFromTemplate: ToolHandler = async (ctx, args) => {
  try {
    const template = args.template as string;
    const params = args.parameters as Record<string, unknown>;

    const criteria: Record<string, unknown> = {};
    const action: Record<string, unknown> = {};

    switch (template) {
      case "fromSender":
        criteria.from = params.senderEmail;
        break;
      case "withSubject":
        criteria.subject = params.subjectText;
        break;
      case "withAttachments":
        criteria.hasAttachment = true;
        break;
      case "largeEmails":
        criteria.size = params.sizeInBytes || 5242880;
        criteria.sizeComparison = "larger";
        break;
      case "containingText":
        criteria.query = params.searchText;
        break;
      case "mailingList":
        criteria.query = `list:${params.listIdentifier}`;
        break;
      default:
        return formatError(`Unknown template: ${template}`);
    }

    if (params.labelIds) action.addLabelIds = params.labelIds;
    if (params.archive) {
      if (!action.removeLabelIds) action.removeLabelIds = [];
      (action.removeLabelIds as string[]).push("INBOX");
    }
    if (params.markAsRead) {
      if (!action.removeLabelIds) action.removeLabelIds = [];
      (action.removeLabelIds as string[]).push("UNREAD");
    }

    const response = await ctx.gmail.users.settings.filters.create({
      userId: GMAIL_USER,
      requestBody: { criteria, action } as any,
    });
    return formatSuccess(response.data);
  } catch (error) {
    throw wrapGoogleError(error, "create_filter_from_template");
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

function buildRawMessage(args: Record<string, unknown>): string {
  const to = (args.to as string[]).join(", ");
  const subject = args.subject as string;
  const body = args.body as string;
  const cc = args.cc as string[] | undefined;
  const bcc = args.bcc as string[] | undefined;
  const htmlBody = args.htmlBody as string | undefined;
  const mimeType = (args.mimeType as string) || "text/plain";
  const inReplyTo = args.inReplyTo as string | undefined;

  const headers: string[] = [
    `To: ${to}`,
    `Subject: ${encodeRFC2047(subject)}`,
  ];

  if (cc?.length) headers.push(`Cc: ${cc.join(", ")}`);
  if (bcc?.length) headers.push(`Bcc: ${bcc.join(", ")}`);
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  if (mimeType === "multipart/alternative" && htmlBody) {
    const boundary = `boundary_${Date.now()}`;
    headers.push("MIME-Version: 1.0");
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const parts = [
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "",
      htmlBody,
      `--${boundary}--`,
    ];

    const raw = headers.join("\r\n") + "\r\n\r\n" + parts.join("\r\n");
    return Buffer.from(raw).toString("base64url");
  }

  const contentType = mimeType === "text/html" ? "text/html" : "text/plain";
  headers.push(`Content-Type: ${contentType}; charset=UTF-8`);

  const raw = headers.join("\r\n") + "\r\n\r\n" + (htmlBody && mimeType === "text/html" ? htmlBody : body);
  return Buffer.from(raw).toString("base64url");
}

function encodeRFC2047(str: string): string {
  if (!/[^\x00-\x7F]/.test(str)) return str;
  const encoded = Buffer.from(str, "utf-8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}
