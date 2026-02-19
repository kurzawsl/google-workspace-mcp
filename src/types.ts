import { gmail_v1 } from "googleapis";
import { calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface GoogleWorkspaceContext {
  auth: OAuth2Client;
  gmail: gmail_v1.Gmail;
  calendar: calendar_v3.Calendar;
}

export type ToolHandler = (
  ctx: GoogleWorkspaceContext,
  args: Record<string, unknown>
) => Promise<ToolResult>;

export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

// Gmail types
export interface ListEmailsArgs {
  query?: string;
  maxResults?: number;
  includeSpamTrash?: boolean;
}

export interface ReadEmailArgs {
  messageId: string;
}

export interface SendEmailArgs {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  htmlBody?: string;
  mimeType?: "text/plain" | "text/html" | "multipart/alternative";
  inReplyTo?: string;
  threadId?: string;
  attachments?: string[];
}

export type DraftEmailArgs = SendEmailArgs;

export interface ModifyEmailArgs {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
  labelIds?: string[];
}

export interface DeleteEmailArgs {
  messageId: string;
}

export interface DownloadAttachmentArgs {
  messageId: string;
  attachmentId: string;
  filename?: string;
  savePath?: string;
}

export interface BatchModifyEmailsArgs {
  messageIds: string[];
  addLabelIds?: string[];
  removeLabelIds?: string[];
  batchSize?: number;
}

export interface BatchDeleteEmailsArgs {
  messageIds: string[];
  batchSize?: number;
}

export interface LabelArgs {
  name: string;
  labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
  messageListVisibility?: "show" | "hide";
}

export interface UpdateLabelArgs {
  id: string;
  name?: string;
  labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
  messageListVisibility?: "show" | "hide";
}

export interface DeleteLabelArgs {
  id: string;
}

export interface GetOrCreateLabelArgs {
  name: string;
  labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
  messageListVisibility?: "show" | "hide";
}

export interface CreateFilterArgs {
  criteria: {
    from?: string;
    to?: string;
    subject?: string;
    query?: string;
    negatedQuery?: string;
    hasAttachment?: boolean;
    excludeChats?: boolean;
    size?: number;
    sizeComparison?: "unspecified" | "smaller" | "larger";
  };
  action: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
    forward?: string;
  };
}

export interface FilterTemplateArgs {
  template: "fromSender" | "withSubject" | "withAttachments" | "largeEmails" | "containingText" | "mailingList";
  parameters: {
    senderEmail?: string;
    subjectText?: string;
    searchText?: string;
    listIdentifier?: string;
    sizeInBytes?: number;
    labelIds?: string[];
    archive?: boolean;
    markAsRead?: boolean;
    markImportant?: boolean;
  };
}

// Calendar types
export interface ListEventsArgs {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  query?: string;
}

export interface GetEventArgs {
  eventId: string;
  calendarId?: string;
}

export interface CreateEventArgs {
  summary: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  calendarId?: string;
  description?: string;
  location?: string;
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: "email" | "popup"; minutes: number }>;
  };
}

export interface UpdateEventArgs {
  eventId: string;
  calendarId?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  reminders?: object;
}

export interface DeleteEventArgs {
  eventId: string;
  calendarId?: string;
}

export interface FindFreeTimeArgs {
  timeMin: string;
  timeMax: string;
  calendarId?: string;
  duration?: number;
}

export interface CheckConflictsArgs {
  start: string;
  end: string;
  calendarId?: string;
}
