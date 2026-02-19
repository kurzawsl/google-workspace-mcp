import { invalidParams } from "./errors.js";

const REQUIRED_FIELDS: Record<string, string[]> = {
  read_email: ["messageId"],
  send_email: ["to", "subject", "body"],
  draft_email: ["to", "subject", "body"],
  modify_email: ["messageId"],
  download_attachment: ["messageId", "attachmentId"],
  read_attachment_text: ["messageId", "attachmentId"],
  batch_modify_emails: ["messageIds"],
  create_label: ["name"],
  update_label: ["id"],
  delete_label: ["id"],
  get_or_create_label: ["name"],
  get_filter: ["filterId"],
  get_event: ["eventId"],
  create_event: ["summary", "start", "end"],
  update_event: ["eventId"],
  delete_event: ["eventId"],
  find_free_time: ["timeMin", "timeMax"],
  check_conflicts: ["start", "end"],
};

export function validateArgs(toolName: string, args: Record<string, unknown>): void {
  const required = REQUIRED_FIELDS[toolName];
  if (!required) return;

  for (const field of required) {
    if (args[field] === undefined || args[field] === null) {
      throw invalidParams(`Missing required parameter: ${field}`);
    }
  }
}
