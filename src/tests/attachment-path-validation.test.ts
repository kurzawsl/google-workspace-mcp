/**
 * Smoke tests for attachment savePath validation.
 * Run via: npx tsx src/tests/attachment-path-validation.test.ts
 *
 * Uses only Node.js built-ins — no test framework required.
 */

import assert from "node:assert/strict";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// Inline the validation logic mirrored from handlers/gmail.ts so this test
// can run without needing a compiled build or googleapis credentials.
// ---------------------------------------------------------------------------

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

function invalidParams(message: string): McpError {
  return new McpError(ErrorCode.InvalidParams, message);
}

const DEFAULT_ATTACHMENT_ROOT = path.join(os.homedir(), "Downloads", "gmail-attachments");

function resolveAttachmentDir(savePath: string | undefined): string {
  const root = DEFAULT_ATTACHMENT_ROOT;

  if (!savePath) {
    return root;
  }

  const candidate = path.isAbsolute(savePath)
    ? path.resolve(savePath)
    : path.resolve(root, savePath);

  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (candidate !== root && !candidate.startsWith(rootWithSep)) {
    throw invalidParams(
      `savePath must be within the allowed downloads root (${root}). Attempted path: ${candidate}`
    );
  }

  return candidate;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error("        ", err);
    failed++;
  }
}

console.log("\nattachment-path-validation smoke tests\n");

// --- Valid cases ---

test("undefined savePath returns default root", () => {
  const result = resolveAttachmentDir(undefined);
  assert.equal(result, DEFAULT_ATTACHMENT_ROOT);
});

test("exact default root string returns default root", () => {
  const result = resolveAttachmentDir(DEFAULT_ATTACHMENT_ROOT);
  assert.equal(result, DEFAULT_ATTACHMENT_ROOT);
});

test("absolute subdirectory of root is allowed", () => {
  const sub = path.join(DEFAULT_ATTACHMENT_ROOT, "invoices");
  const result = resolveAttachmentDir(sub);
  assert.equal(result, sub);
});

test("relative path resolves inside root", () => {
  const result = resolveAttachmentDir("invoices/2026");
  assert.equal(result, path.join(DEFAULT_ATTACHMENT_ROOT, "invoices", "2026"));
});

// --- Traversal / rejection cases ---

test("~/.ssh path is rejected", () => {
  assert.throws(
    () => resolveAttachmentDir(path.join(os.homedir(), ".ssh")),
    McpError
  );
});

test("/etc/passwd is rejected", () => {
  assert.throws(() => resolveAttachmentDir("/etc/passwd"), McpError);
});

test("/etc directory is rejected", () => {
  assert.throws(() => resolveAttachmentDir("/etc"), McpError);
});

test("relative traversal ../../../../etc is rejected", () => {
  assert.throws(() => resolveAttachmentDir("../../../../etc"), McpError);
});

test("relative traversal ../sibling is rejected", () => {
  assert.throws(() => resolveAttachmentDir("../sibling"), McpError);
});

test("os.tmpdir() is rejected", () => {
  assert.throws(() => resolveAttachmentDir(os.tmpdir()), McpError);
});

// --- Summary ---

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
