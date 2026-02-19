import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";

import type { GoogleWorkspaceContext } from "./types.js";
import { loadAuth } from "./core/auth.js";
import { validateArgs } from "./core/validation.js";
import { getToolDefinitions } from "./tools/tool-definitions.js";
import { toolHandlers } from "./tools/tool-registry.js";

export class GoogleWorkspaceServer {
  private server: Server;
  private ctx: GoogleWorkspaceContext | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "google-workspace-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async ensureContext(): Promise<GoogleWorkspaceContext> {
    if (!this.ctx) {
      const auth = await loadAuth();
      this.ctx = {
        auth,
        gmail: google.gmail({ version: "v1", auth }),
        calendar: google.calendar({ version: "v3", auth }),
      };
      console.error("[server] Google Workspace APIs initialized");
    }
    return this.ctx;
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: getToolDefinitions(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;
      const typedArgs = args as Record<string, unknown>;

      try {
        validateArgs(name, typedArgs);

        const ctx = await this.ensureContext();
        const handler = toolHandlers[name];

        if (!handler) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return await handler(ctx, typedArgs);
      } catch (error) {
        if (error instanceof McpError) throw error;

        console.error(`[error] Tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("[server] Google Workspace MCP server running on stdio");
  }
}
