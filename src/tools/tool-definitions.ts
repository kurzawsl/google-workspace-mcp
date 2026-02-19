import { Tool } from "@modelcontextprotocol/sdk/types.js";

export function getToolDefinitions(): Tool[] {
  return [...getGmailTools(), ...getCalendarTools()];
}

function getGmailTools(): Tool[] {
  return [
    {
      name: "search_emails",
      description: "Searches for emails using Gmail search syntax. Returns a list of matching emails with metadata (from, to, subject, date, snippet, labels). Use Gmail query operators like 'from:', 'to:', 'subject:', 'has:attachment', 'after:', 'before:', 'is:unread', 'label:', 'in:inbox', etc. Example queries: 'from:john@example.com subject:invoice after:2024/01/01', 'is:unread has:attachment'.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Gmail search query using standard Gmail search operators (e.g., 'from:example@gmail.com subject:meeting after:2024/01/01')",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of emails to return (default: 20, max recommended: 50)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "read_email",
      description: "Retrieves the full content of a specific email by its message ID. Returns the complete email including headers (from, to, cc, subject, date, message-id), decoded body text, attachment metadata, and label IDs. Use search_emails first to find the message ID.",
      inputSchema: {
        type: "object",
        properties: {
          messageId: {
            type: "string",
            description: "The Gmail message ID (obtained from search_emails results)",
          },
        },
        required: ["messageId"],
      },
    },
    {
      name: "send_email",
      description: "Sends a new email or replies to an existing thread. Supports plain text, HTML, and multipart/alternative content. To reply to a thread, provide both 'inReplyTo' (the Message-ID header value) and 'threadId'. Supports file attachments via local file paths.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "array", items: { type: "string" }, description: "List of recipient email addresses (e.g., ['user@example.com'])" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Plain text email body. Used as the body for text/plain emails, or as the text fallback for multipart/alternative." },
          cc: { type: "array", items: { type: "string" }, description: "List of CC recipient email addresses" },
          bcc: { type: "array", items: { type: "string" }, description: "List of BCC recipient email addresses" },
          htmlBody: { type: "string", description: "HTML version of the email body. Used when mimeType is 'text/html' or 'multipart/alternative'." },
          mimeType: {
            type: "string",
            enum: ["text/plain", "text/html", "multipart/alternative"],
            default: "text/plain",
            description: "Email content type. Use 'text/plain' for simple text, 'text/html' for HTML-only, or 'multipart/alternative' to send both text and HTML versions.",
          },
          inReplyTo: { type: "string", description: "The Message-ID header of the email being replied to (for threading)" },
          threadId: { type: "string", description: "Gmail thread ID to add this reply to (use together with inReplyTo)" },
          attachments: { type: "array", items: { type: "string" }, description: "List of absolute file paths to attach to the email" },
        },
        required: ["to", "subject", "body"],
      },
    },
    {
      name: "draft_email",
      description: "Creates a draft email without sending it. The draft will appear in Gmail's Drafts folder. Supports the same options as send_email (plain text, HTML, multipart, threading, attachments). Useful for composing emails that need review before sending.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "array", items: { type: "string" }, description: "List of recipient email addresses" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Plain text email body" },
          cc: { type: "array", items: { type: "string" }, description: "List of CC recipient email addresses" },
          bcc: { type: "array", items: { type: "string" }, description: "List of BCC recipient email addresses" },
          htmlBody: { type: "string", description: "HTML version of the email body" },
          mimeType: {
            type: "string",
            enum: ["text/plain", "text/html", "multipart/alternative"],
            default: "text/plain",
            description: "Email content type",
          },
          inReplyTo: { type: "string", description: "Message-ID header of the email being replied to" },
          threadId: { type: "string", description: "Gmail thread ID for threading replies" },
          attachments: { type: "array", items: { type: "string" }, description: "List of absolute file paths to attach" },
        },
        required: ["to", "subject", "body"],
      },
    },
    {
      name: "modify_email",
      description: "Modifies an email's labels to organize, archive, mark as read/unread, star, or move between folders. Common label IDs: 'INBOX', 'UNREAD', 'STARRED', 'IMPORTANT', 'SPAM', 'TRASH', 'SENT', 'DRAFT'. To archive: removeLabelIds=['INBOX']. To mark as read: removeLabelIds=['UNREAD']. To star: addLabelIds=['STARRED']. Custom label IDs can be obtained from list_email_labels.",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The Gmail message ID to modify" },
          addLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to add to the message (e.g., ['STARRED', 'IMPORTANT'])" },
          removeLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to remove from the message (e.g., ['INBOX', 'UNREAD'])" },
        },
        required: ["messageId"],
      },
    },
    {
      name: "list_email_labels",
      description: "Retrieves all available Gmail labels (both system and user-created). Returns label ID, name, type, and message/thread counts. Use this to discover label IDs needed for modify_email, batch_modify_emails, and filtering operations.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "batch_modify_emails",
      description: "Modifies labels for multiple emails at once in batches. More efficient than calling modify_email repeatedly. Processes emails in configurable batch sizes. Use the same label ID conventions as modify_email.",
      inputSchema: {
        type: "object",
        properties: {
          messageIds: { type: "array", items: { type: "string" }, description: "List of Gmail message IDs to modify" },
          addLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to add to all specified messages" },
          removeLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to remove from all specified messages" },
          batchSize: { type: "number", default: 50, description: "Number of messages to process per batch (default: 50)" },
        },
        required: ["messageIds"],
      },
    },
    {
      name: "create_label",
      description: "Creates a new custom Gmail label. Labels can be used to organize emails and are visible in the Gmail sidebar. After creation, use the returned label ID with modify_email or batch_modify_emails to apply it to messages.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Display name for the new label (e.g., 'Projects/ClientA'). Use '/' for nested labels." },
          labelListVisibility: {
            type: "string",
            enum: ["labelShow", "labelShowIfUnread", "labelHide"],
            description: "Controls label visibility in Gmail sidebar: 'labelShow' (always visible), 'labelShowIfUnread' (visible only when it has unread messages), 'labelHide' (hidden)",
          },
          messageListVisibility: {
            type: "string",
            enum: ["show", "hide"],
            description: "Controls whether the label appears in the message list view",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "update_label",
      description: "Updates an existing Gmail label's name or visibility settings. Use list_email_labels to find the label ID first.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "The label ID to update (obtained from list_email_labels)" },
          name: { type: "string", description: "New display name for the label" },
          labelListVisibility: { type: "string", enum: ["labelShow", "labelShowIfUnread", "labelHide"], description: "New sidebar visibility setting" },
          messageListVisibility: { type: "string", enum: ["show", "hide"], description: "New message list visibility setting" },
        },
        required: ["id"],
      },
    },
    {
      name: "delete_label",
      description: "Permanently deletes a Gmail label. Messages with this label will NOT be deleted — only the label itself is removed. System labels (INBOX, SENT, etc.) cannot be deleted. Use list_email_labels to find the label ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "The label ID to delete (obtained from list_email_labels)" },
        },
        required: ["id"],
      },
    },
    {
      name: "get_or_create_label",
      description: "Gets an existing label by name (case-insensitive match) or creates it if it doesn't exist. Returns the label with a 'created' boolean field indicating whether it was newly created. Useful for ensuring a label exists before applying it to messages.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Label name to find or create (case-insensitive search)" },
          labelListVisibility: { type: "string", enum: ["labelShow", "labelShowIfUnread", "labelHide"], description: "Sidebar visibility (only used if creating new label)" },
          messageListVisibility: { type: "string", enum: ["show", "hide"], description: "Message list visibility (only used if creating new label)" },
        },
        required: ["name"],
      },
    },
    {
      name: "list_filters",
      description: "Retrieves all Gmail filters (server-side rules that automatically process incoming emails). Returns each filter's criteria (from, to, subject, query, etc.) and actions (add/remove labels, forward). Note: listing filters requires read-only access but creating/deleting filters requires additional OAuth scopes.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_filter",
      description: "Gets the details of a specific Gmail filter by its ID. Returns the filter's criteria and actions. Use list_filters first to find the filter ID.",
      inputSchema: {
        type: "object",
        properties: {
          filterId: { type: "string", description: "The Gmail filter ID (obtained from list_filters)" },
        },
        required: ["filterId"],
      },
    },
    {
      name: "download_attachment",
      description: "Downloads an email attachment to a local file. Use read_email first to get the attachmentId from the email's attachment metadata. Files are saved to the specified directory (defaults to system temp directory). Filenames are sanitized to prevent path traversal.",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The Gmail message ID containing the attachment" },
          attachmentId: { type: "string", description: "The attachment ID (obtained from read_email's attachments list)" },
          filename: { type: "string", description: "Filename to save as (optional — defaults to 'attachment_{id}')" },
          savePath: { type: "string", description: "Directory to save the attachment to (optional — defaults to system temp directory)" },
        },
        required: ["messageId", "attachmentId"],
      },
    },
  ];
}

function getCalendarTools(): Tool[] {
  return [
    {
      name: "list_calendars",
      description: "Lists all Google Calendars accessible by the authenticated user. Returns each calendar's ID, summary (name), description, timezone, and access role. The primary calendar has ID 'primary'. Use the calendar ID from results when calling other calendar tools.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "list_events",
      description: "Lists calendar events within a time range, sorted by start time. Returns event ID, title, start/end times, location, attendees, and description. Defaults to the next 7 days from now if no time range specified. Supports text search via the query parameter.",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: "Calendar ID (use 'primary' for main calendar, or a specific calendar ID from list_calendars)" },
          timeMin: { type: "string", description: "Start of time range in ISO 8601 format (e.g., '2024-09-12T00:00:00Z'). Defaults to now." },
          timeMax: { type: "string", description: "End of time range in ISO 8601 format. Defaults to 7 days from now." },
          maxResults: { type: "number", default: 50, description: "Maximum number of events to return (default: 50)" },
          query: { type: "string", description: "Free-text search query to filter events by title, description, location, or attendees" },
        },
      },
    },
    {
      name: "get_event",
      description: "Gets full details of a specific calendar event by its event ID. Returns all event fields including title, description, start/end, location, attendees with RSVP status, reminders, and recurrence info. Use list_events or search to find the event ID first.",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: "Calendar ID (default: 'primary')" },
          eventId: { type: "string", description: "The calendar event ID (obtained from list_events)" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "create_event",
      description: "Creates a new calendar event. For timed events, use 'dateTime' in start/end (ISO 8601 with timezone, e.g., '2024-09-12T10:00:00+02:00'). For all-day events, use 'date' (e.g., '2024-09-12'). Optionally add attendees (sends invitation emails), location, description, and custom reminders.",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: "Calendar ID (default: 'primary')" },
          summary: { type: "string", description: "Event title/name" },
          description: { type: "string", description: "Event description or notes" },
          start: {
            type: "object",
            description: "Event start time. Use 'dateTime' for timed events or 'date' for all-day events.",
            properties: {
              dateTime: { type: "string", description: "ISO 8601 datetime (e.g., '2024-09-12T10:00:00+02:00')" },
              date: { type: "string", description: "Date for all-day events (e.g., '2024-09-12')" },
              timeZone: { type: "string", description: "IANA timezone (e.g., 'Europe/Warsaw')" },
            },
          },
          end: {
            type: "object",
            description: "Event end time. Must match start format (dateTime or date).",
            properties: {
              dateTime: { type: "string", description: "ISO 8601 datetime" },
              date: { type: "string", description: "Date for all-day events" },
              timeZone: { type: "string", description: "IANA timezone" },
            },
          },
          attendees: {
            type: "array",
            items: { type: "object", properties: { email: { type: "string" } } },
            description: "List of attendee email addresses (invitation emails will be sent)",
          },
          reminders: {
            type: "object",
            description: "Custom reminder settings. Set useDefault:false to override default reminders.",
            properties: {
              useDefault: { type: "boolean" },
              overrides: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    method: { type: "string", enum: ["email", "popup"], description: "Reminder method" },
                    minutes: { type: "number", description: "Minutes before event to trigger reminder" },
                  },
                },
              },
            },
          },
          location: { type: "string", description: "Event location (address, room name, or virtual meeting URL)" },
        },
        required: ["summary", "start", "end"],
      },
    },
    {
      name: "update_event",
      description: "Updates an existing calendar event. Only the fields you provide will be changed — all other fields remain unchanged (partial update / PATCH). Use get_event first to see current values if needed.",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: "Calendar ID (default: 'primary')" },
          eventId: { type: "string", description: "The event ID to update (obtained from list_events)" },
          summary: { type: "string", description: "New event title" },
          description: { type: "string", description: "New event description" },
          start: { type: "object", description: "New start time ({dateTime, date, timeZone})" },
          end: { type: "object", description: "New end time ({dateTime, date, timeZone})" },
          location: { type: "string", description: "New event location" },
          reminders: { type: "object", description: "New reminder settings" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "delete_event",
      description: "Permanently deletes a calendar event. This cannot be undone. If the event has attendees, cancellation notifications may be sent. Use list_events to find the event ID.",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: "Calendar ID (default: 'primary')" },
          eventId: { type: "string", description: "The event ID to delete" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "find_free_time",
      description: "Finds available (free) time slots within a date range by analyzing existing calendar events. Returns gaps between events that are at least as long as the requested duration. Useful for scheduling meetings or finding open slots. Returns up to 10 free slots.",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: "Calendar ID (default: 'primary')" },
          timeMin: { type: "string", description: "Start of search period in ISO 8601 format (e.g., '2024-09-12T08:00:00+02:00')" },
          timeMax: { type: "string", description: "End of search period in ISO 8601 format (e.g., '2024-09-12T18:00:00+02:00')" },
          duration: { type: "number", default: 60, description: "Minimum duration needed in minutes (default: 60)" },
        },
        required: ["timeMin", "timeMax"],
      },
    },
    {
      name: "check_conflicts",
      description: "Checks if a proposed time slot conflicts with any existing calendar events. Returns a boolean 'hasConflicts' and a list of conflicting events with their details. Use this before creating events to avoid double-booking.",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: "Calendar ID (default: 'primary')" },
          start: { type: "string", description: "Proposed start time in ISO 8601 format" },
          end: { type: "string", description: "Proposed end time in ISO 8601 format" },
        },
        required: ["start", "end"],
      },
    },
  ];
}
