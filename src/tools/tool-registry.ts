import type { ToolHandler } from "../types.js";

// Gmail handlers
import {
  searchEmails,
  readEmail,
  sendEmail,
  draftEmail,
  modifyEmail,
  listEmailLabels,
  batchModifyEmails,
  downloadAttachment,
  readAttachmentText,
  createLabel,
  updateLabel,
  deleteLabel,
  getOrCreateLabel,
  listFilters,
  getFilter,
} from "../handlers/gmail.js";

// Calendar handlers
import {
  listCalendars,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  findFreeTime,
  checkConflicts,
} from "../handlers/calendar.js";

export const toolHandlers: Record<string, ToolHandler> = {
  // Gmail
  search_emails: searchEmails,
  read_email: readEmail,
  send_email: sendEmail,
  draft_email: draftEmail,
  modify_email: modifyEmail,
  list_email_labels: listEmailLabels,
  batch_modify_emails: batchModifyEmails,
  download_attachment: downloadAttachment,
  read_attachment_text: readAttachmentText,
  create_label: createLabel,
  update_label: updateLabel,
  delete_label: deleteLabel,
  get_or_create_label: getOrCreateLabel,
  list_filters: listFilters,
  get_filter: getFilter,

  // Calendar
  list_calendars: listCalendars,
  list_events: listEvents,
  get_event: getEvent,
  create_event: createEvent,
  update_event: updateEvent,
  delete_event: deleteEvent,
  find_free_time: findFreeTime,
  check_conflicts: checkConflicts,
};
