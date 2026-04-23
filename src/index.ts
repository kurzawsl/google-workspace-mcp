import { GoogleWorkspaceServer } from "./google-workspace-server.js";

// Surface process-level errors so they land in Claude Code logs instead of silently
// killing the stdio transport.
process.on('uncaughtException', (err: Error) => {
  console.error(JSON.stringify({ type: 'uncaughtException', error: err?.stack || String(err), ts: new Date().toISOString() }));
  process.exit(1);
});
process.on('unhandledRejection', (reason: unknown) => {
  console.error(JSON.stringify({ type: 'unhandledRejection', reason: reason instanceof Error ? reason.stack : String(reason), ts: new Date().toISOString() }));
  process.exit(1);
});

const server = new GoogleWorkspaceServer();
server.run().catch(console.error);
