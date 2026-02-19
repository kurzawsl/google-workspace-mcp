import { Tool } from "@modelcontextprotocol/sdk/types.js";

export function getToolDefinitions(): Tool[] {
  return [...getGmailTools(), ...getCalendarTools()];
}

function getGmailTools(): Tool[] {
  return [
    {
      name: "search_emails",
      description: "Searches for emails using Gmail search syntax",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Gmail search query (e.g., 'from:example@gmail.com')" },
          maxResults: { type: "number", description: "Maximum number of results to return" },
        },
        required: ["query"],
      },
    },
    {
      name: "read_email",
      description: "Retrieves the content of a specific email",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "ID of the email message to retrieve" },
        },
        required: ["messageId"],
      },
    },
    {
      name: "send_email",
      description: "Sends a new email",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "array", items: { type: "string" }, description: "List of recipient email addresses" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body content (used for text/plain or when htmlBody not provided)" },
          cc: { type: "array", items: { type: "string" }, description: "List of CC recipients" },
          bcc: { type: "array", items: { type: "string" }, description: "List of BCC recipients" },
          htmlBody: { type: "string", description: "HTML version of the email body" },
          mimeType: {
            type: "string",
            enum: ["text/plain", "text/html", "multipart/alternative"],
            default: "text/plain",
            description: "Email content type",
          },
          inReplyTo: { type: "string", description: "Message ID being replied to" },
          threadId: { type: "string", description: "Thread ID to reply to" },
          attachments: { type: "array", items: { type: "string" }, description: "List of file paths to attach" },
        },
        required: ["to", "subject", "body"],
      },
    },
    {
      name: "draft_email",
      description: "Draft a new email",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "array", items: { type: "string" }, description: "List of recipient email addresses" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body content" },
          cc: { type: "array", items: { type: "string" }, description: "List of CC recipients" },
          bcc: { type: "array", items: { type: "string" }, description: "List of BCC recipients" },
          htmlBody: { type: "string", description: "HTML version of the email body" },
          mimeType: {
            type: "string",
            enum: ["text/plain", "text/html", "multipart/alternative"],
            default: "text/plain",
          },
          inReplyTo: { type: "string", description: "Message ID being replied to" },
          threadId: { type: "string", description: "Thread ID to reply to" },
          attachments: { type: "array", items: { type: "string" }, description: "List of file paths to attach" },
        },
        required: ["to", "subject", "body"],
      },
    },
    {
      name: "modify_email",
      description: "Modifies email labels (move to different folders)",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "ID of the email message to modify" },
          addLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to add" },
          removeLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to remove" },
          labelIds: { type: "array", items: { type: "string" }, description: "Label IDs to apply" },
        },
        required: ["messageId"],
      },
    },
    {
      name: "delete_email",
      description: "Permanently deletes an email",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "ID of the email message to delete" },
        },
        required: ["messageId"],
      },
    },
    {
      name: "list_email_labels",
      description: "Retrieves all available Gmail labels",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "batch_modify_emails",
      description: "Modifies labels for multiple emails in batches",
      inputSchema: {
        type: "object",
        properties: {
          messageIds: { type: "array", items: { type: "string" }, description: "List of message IDs to modify" },
          addLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to add" },
          removeLabelIds: { type: "array", items: { type: "string" }, description: "Label IDs to remove" },
          batchSize: { type: "number", default: 50, description: "Number of messages per batch" },
        },
        required: ["messageIds"],
      },
    },
    {
      name: "batch_delete_emails",
      description: "Permanently deletes multiple emails in batches",
      inputSchema: {
        type: "object",
        properties: {
          messageIds: { type: "array", items: { type: "string" }, description: "List of message IDs to delete" },
          batchSize: { type: "number", default: 50, description: "Number of messages per batch" },
        },
        required: ["messageIds"],
      },
    },
    {
      name: "create_label",
      description: "Creates a new Gmail label",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the new label" },
          labelListVisibility: { type: "string", enum: ["labelShow", "labelShowIfUnread", "labelHide"] },
          messageListVisibility: { type: "string", enum: ["show", "hide"] },
        },
        required: ["name"],
      },
    },
    {
      name: "update_label",
      description: "Updates an existing Gmail label",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID of the label to update" },
          name: { type: "string", description: "New name for the label" },
          labelListVisibility: { type: "string", enum: ["labelShow", "labelShowIfUnread", "labelHide"] },
          messageListVisibility: { type: "string", enum: ["show", "hide"] },
        },
        required: ["id"],
      },
    },
    {
      name: "delete_label",
      description: "Deletes a Gmail label",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID of the label to delete" },
        },
        required: ["id"],
      },
    },
    {
      name: "get_or_create_label",
      description: "Gets an existing label by name or creates it if it doesn't exist",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the label to get or create" },
          labelListVisibility: { type: "string", enum: ["labelShow", "labelShowIfUnread", "labelHide"] },
          messageListVisibility: { type: "string", enum: ["show", "hide"] },
        },
        required: ["name"],
      },
    },
    {
      name: "create_filter",
      description: "Creates a new Gmail filter with custom criteria and actions",
      inputSchema: {
        type: "object",
        properties: {
          criteria: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              subject: { type: "string" },
              query: { type: "string" },
              negatedQuery: { type: "string" },
              hasAttachment: { type: "boolean" },
              excludeChats: { type: "boolean" },
              size: { type: "number" },
              sizeComparison: { type: "string", enum: ["unspecified", "smaller", "larger"] },
            },
          },
          action: {
            type: "object",
            properties: {
              addLabelIds: { type: "array", items: { type: "string" } },
              removeLabelIds: { type: "array", items: { type: "string" } },
              forward: { type: "string" },
            },
          },
        },
        required: ["criteria", "action"],
      },
    },
    {
      name: "list_filters",
      description: "Retrieves all Gmail filters",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_filter",
      description: "Gets details of a specific Gmail filter",
      inputSchema: {
        type: "object",
        properties: {
          filterId: { type: "string", description: "ID of the filter to retrieve" },
        },
        required: ["filterId"],
      },
    },
    {
      name: "delete_filter",
      description: "Deletes a Gmail filter",
      inputSchema: {
        type: "object",
        properties: {
          filterId: { type: "string", description: "ID of the filter to delete" },
        },
        required: ["filterId"],
      },
    },
    {
      name: "create_filter_from_template",
      description: "Creates a filter using a pre-defined template for common scenarios",
      inputSchema: {
        type: "object",
        properties: {
          template: {
            type: "string",
            enum: ["fromSender", "withSubject", "withAttachments", "largeEmails", "containingText", "mailingList"],
          },
          parameters: {
            type: "object",
            properties: {
              senderEmail: { type: "string" },
              subjectText: { type: "string" },
              searchText: { type: "string" },
              listIdentifier: { type: "string" },
              sizeInBytes: { type: "number" },
              labelIds: { type: "array", items: { type: "string" } },
              archive: { type: "boolean" },
              markAsRead: { type: "boolean" },
              markImportant: { type: "boolean" },
            },
          },
        },
        required: ["template", "parameters"],
      },
    },
    {
      name: "download_attachment",
      description: "Downloads an email attachment to a specified location",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "ID of the email containing the attachment" },
          attachmentId: { type: "string", description: "ID of the attachment to download" },
          filename: { type: "string", description: "Filename to save as (optional)" },
          savePath: { type: "string", description: "Directory to save the attachment" },
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
      description: "List all available Google Calendars",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "list_events",
      description: "List calendar events within a date range",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary", description: 'Calendar ID (use "primary" for main calendar)' },
          timeMin: { type: "string", description: "Start time in ISO format (e.g., 2024-09-12T00:00:00Z)" },
          timeMax: { type: "string", description: "End time in ISO format" },
          maxResults: { type: "number", default: 50 },
          query: { type: "string", description: "Search query for events" },
        },
      },
    },
    {
      name: "get_event",
      description: "Get details of a specific event",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary" },
          eventId: { type: "string", description: "Event ID" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "create_event",
      description: "Create a new calendar event",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary" },
          summary: { type: "string", description: "Event title" },
          description: { type: "string", description: "Event description" },
          start: {
            type: "object",
            properties: {
              dateTime: { type: "string" },
              date: { type: "string" },
              timeZone: { type: "string" },
            },
          },
          end: {
            type: "object",
            properties: {
              dateTime: { type: "string" },
              date: { type: "string" },
              timeZone: { type: "string" },
            },
          },
          attendees: {
            type: "array",
            items: { type: "object", properties: { email: { type: "string" } } },
          },
          reminders: {
            type: "object",
            properties: {
              useDefault: { type: "boolean" },
              overrides: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    method: { type: "string", enum: ["email", "popup"] },
                    minutes: { type: "number" },
                  },
                },
              },
            },
          },
          location: { type: "string", description: "Event location" },
        },
        required: ["summary", "start", "end"],
      },
    },
    {
      name: "update_event",
      description: "Update an existing calendar event",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary" },
          eventId: { type: "string", description: "Event ID to update" },
          summary: { type: "string" },
          description: { type: "string" },
          start: { type: "object" },
          end: { type: "object" },
          location: { type: "string" },
          reminders: { type: "object" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "delete_event",
      description: "Delete a calendar event",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary" },
          eventId: { type: "string", description: "Event ID to delete" },
        },
        required: ["eventId"],
      },
    },
    {
      name: "find_free_time",
      description: "Find available time slots in the calendar",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary" },
          timeMin: { type: "string", description: "Start of search period (ISO format)" },
          timeMax: { type: "string", description: "End of search period (ISO format)" },
          duration: { type: "number", default: 60, description: "Duration needed in minutes" },
        },
        required: ["timeMin", "timeMax"],
      },
    },
    {
      name: "check_conflicts",
      description: "Check for scheduling conflicts",
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: "string", default: "primary" },
          start: { type: "string", description: "Proposed start time (ISO format)" },
          end: { type: "string", description: "Proposed end time (ISO format)" },
        },
        required: ["start", "end"],
      },
    },
  ];
}
