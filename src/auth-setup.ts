/**
 * Interactive OAuth2 setup script.
 * Run with: npm run auth
 */
import { google } from "googleapis";
import * as fs from "fs/promises";
import * as readline from "readline";
import { getScopes, getTokenPath, getCredentialsPath } from "./core/auth.js";

async function authenticate() {
  const credPath = getCredentialsPath();
  const tokenPath = getTokenPath();
  const scopes = getScopes();

  let content: string;
  try {
    content = await fs.readFile(credPath, "utf-8");
  } catch {
    console.error(`\nError: credentials.json not found at ${credPath}`);
    console.error("Please download it from Google Cloud Console and place it in config/");
    process.exit(1);
  }

  const credentials = JSON.parse(content);
  const config = credentials.installed || credentials.web;
  if (!config) {
    console.error("Invalid credentials.json format");
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(
    config.client_id,
    config.client_secret,
    config.redirect_uris[0]
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  console.log("\nAuthorize this app by visiting this URL:\n");
  console.log(authUrl);
  console.log("\nAfter granting access, paste the authorization code below:\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question("Code: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

  console.log(`\nAuthentication successful! Token saved to ${tokenPath}`);
  console.log("Scopes granted:", tokens.scope);
}

authenticate().catch((err) => {
  console.error("Authentication failed:", err.message);
  process.exit(1);
});
