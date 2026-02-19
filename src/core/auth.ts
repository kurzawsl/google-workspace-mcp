import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/calendar",
];

// Paths relative to project root (two levels up from core/)
const CONFIG_DIR = path.join(__dirname, "../../config");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");

// Legacy paths for migration from gmail-manager
const LEGACY_TOKEN_PATHS = [
  path.join(__dirname, "../../config/token.json"),
  process.env.GOOGLE_TOKEN_PATH,
].filter(Boolean) as string[];

interface CredentialsFile {
  installed?: OAuthClientConfig;
  web?: OAuthClientConfig;
}

interface OAuthClientConfig {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

interface LegacyTokenFile {
  token?: string;
  access_token?: string;
  refresh_token: string;
  client_id?: string;
  client_secret?: string;
  scopes?: string[];
  expiry?: string;
  expiry_date?: number;
}

interface StandardTokenFile {
  access_token: string;
  refresh_token: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export async function loadAuth(): Promise<OAuth2Client> {
  // Try standard credentials.json + token.json pattern first
  let clientId: string;
  let clientSecret: string;
  let redirectUri: string;

  try {
    const credContent = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    const credentials: CredentialsFile = JSON.parse(credContent);
    const config = credentials.installed || credentials.web;
    if (!config) throw new Error("Invalid credentials.json format");
    clientId = config.client_id;
    clientSecret = config.client_secret;
    redirectUri = config.redirect_uris[0] || "http://localhost:3000/oauth2callback";
  } catch {
    // Fallback: try loading credentials from legacy token.json (gmail-manager style)
    const tokenData = await loadLegacyToken();
    if (tokenData?.client_id && tokenData?.client_secret) {
      clientId = tokenData.client_id;
      clientSecret = tokenData.client_secret;
      redirectUri = "http://localhost:3000/oauth2callback";
    } else {
      throw new Error(
        "No credentials found. Place credentials.json in config/ or ensure token.json has client_id/client_secret"
      );
    }
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Load token
  const token = await loadToken();
  if (!token) {
    throw new Error("No token found. Run: npm run auth");
  }

  oAuth2Client.setCredentials(token);

  // Auto-refresh handler - persist new tokens to disk
  oAuth2Client.on("tokens", async (tokens) => {
    try {
      let existingToken: Record<string, unknown> = {};
      try {
        const raw = await fs.readFile(TOKEN_PATH, "utf-8");
        existingToken = JSON.parse(raw);
      } catch {
        // No existing token file
      }

      const updatedToken = { ...existingToken, ...tokens };
      await fs.writeFile(TOKEN_PATH, JSON.stringify(updatedToken, null, 2));
      console.error("[auth] Token refreshed and saved automatically");
    } catch (err) {
      console.error("[auth] Failed to save refreshed token:", err);
    }
  });

  return oAuth2Client;
}

async function loadToken(): Promise<Record<string, string> | null> {
  // Try standard token.json
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf-8");
    const data: StandardTokenFile | LegacyTokenFile = JSON.parse(raw);

    // Handle legacy format (gmail-manager stores access_token as "token")
    if ("token" in data && data.token && !("access_token" in data && data.access_token)) {
      return {
        access_token: data.token,
        refresh_token: data.refresh_token,
        scope: data.scopes ? data.scopes.join(" ") : SCOPES.join(" "),
        token_type: "Bearer",
      };
    }

    return data as unknown as Record<string, string>;
  } catch {
    // Try legacy paths
    return await loadLegacyToken() as unknown as Record<string, string> | null;
  }
}

async function loadLegacyToken(): Promise<LegacyTokenFile | null> {
  for (const tokenPath of LEGACY_TOKEN_PATHS) {
    try {
      const raw = await fs.readFile(tokenPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

export function getScopes(): string[] {
  return SCOPES;
}

export function getTokenPath(): string {
  return TOKEN_PATH;
}

export function getCredentialsPath(): string {
  return CREDENTIALS_PATH;
}
