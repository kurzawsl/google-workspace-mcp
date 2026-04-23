# google-workspace-mcp

MCP server that exposes Gmail and Google Calendar to Claude via OAuth. Lets Claude read, send, and organize email; manage calendar events; and extract text from email attachments — all through your own Google Cloud credentials.

## Prerequisites

- Node.js 20+
- A Google Cloud project with the Gmail API and Google Calendar API enabled
- An OAuth 2.0 Desktop client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

**You must supply your own `credentials.json`.** This repo does not include any Google credentials. See [Setup](#setup) below.

## Installation

```bash
git clone https://github.com/kurzawsl/google-workspace-mcp.git
cd google-workspace-mcp
npm install
npm run build
```

## Setup

1. In Google Cloud Console, create an OAuth 2.0 client (type: Desktop app).
2. Download the credentials file and save it as `config/credentials.json`.
   Use `config/credentials.json.example` as a reference for the expected format.
3. Run the auth flow once to generate `config/token.json`:
   ```bash
   npm run auth
   ```
   A browser window will open. Grant the requested Gmail and Calendar scopes.
   The token is saved locally and auto-refreshed on expiry.

## Usage

Register in your Claude Code MCP config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["/path/to/google-workspace-mcp/build/index.js"],
      "env": {}
    }
  }
}
```

## Tools

### Gmail

| Tool | Description |
|------|-------------|
| `search_emails` | Search email using Gmail query syntax (`from:`, `subject:`, `is:unread`, etc.) |
| `read_email` | Retrieve full email content by message ID |
| `send_email` | Send a new email or reply to a thread; supports HTML and attachments |
| `draft_email` | Create a draft without sending |
| `modify_email` | Add/remove labels (archive, star, mark read, etc.) |
| `batch_modify_emails` | Modify labels on multiple messages at once |
| `list_email_labels` | List all Gmail labels with IDs |
| `create_label` | Create a new custom label |
| `update_label` | Rename or change visibility of an existing label |
| `delete_label` | Delete a custom label |
| `get_or_create_label` | Idempotent: find a label by name or create it |
| `list_filters` | List server-side Gmail filters |
| `get_filter` | Get details of a specific filter |
| `download_attachment` | Download an email attachment to disk |
| `read_attachment_text` | Extract text from a PDF or plain-text attachment inline |

### Google Calendar

| Tool | Description |
|------|-------------|
| `list_calendars` | List all accessible calendars |
| `list_events` | List events in a time range with optional text search |
| `get_event` | Get full details of a specific event |
| `create_event` | Create a new event (timed or all-day, with attendees and reminders) |
| `update_event` | Partially update an existing event |
| `delete_event` | Delete an event |
| `find_free_time` | Find open time slots within a date range |
| `check_conflicts` | Check whether a proposed time slot has conflicts |

## Development

```bash
npm run build      # Compile TypeScript to build/
npm run dev        # Run directly with tsx (no compile step)
npm run auth       # Re-run OAuth flow
npm test           # Placeholder (no tests yet)
```

## License

MIT — see [LICENSE](LICENSE).
