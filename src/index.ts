import { GoogleWorkspaceServer } from "./google-workspace-server.js";

const server = new GoogleWorkspaceServer();
server.run().catch(console.error);
