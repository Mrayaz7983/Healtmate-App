// MUST be first — ensures this API route runs in Node runtime (not Edge)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * Generate a very simple heuristic summary from input text.
 * Returns a short friendly summary string.
 */
function generateSummary(text: string, maxSentences = 3) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return "Summary: " + sentences.slice(0, maxSentences).join(" ");
}

/**
 * Extract a few lightweight insights from the text.
 */
function extractInsights(text: string) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const numbers = Array.from(text.matchAll(/(\d+\.?\d*)/g))
    .map((m) => Number(m[1]))
    .slice(0, 5);

  return [
    { label: "Key Values Found", value: numbers.length ? numbers.join(", ") : "n/a" },
    { label: "Report Length", value: `${text.length} chars`, trend: text.length > 400 ? "long" : "short" },
    { label: "Sentence Count", value: String(sentences.length) },
  ];
}

/**
 * POST handler
 * Expected request body JSON:
 * {
 *   text: string,                 // required - text to summarize
 *   createToken?: boolean,        // optional - if true, server will sign a JWT (requires JWT_SECRET)
 *   tokenPayload?: object         // optional - payload to sign into the token (default: {})
 * }
 */
export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text = String(body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Generate summary + insights
    const summary = generateSummary(text, 3);
    const insights = extractInsights(text);

    const responsePayload: any = { summary, insights };

    // Optional: create JWT if requested and secret present
    if (body.createToken) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        // do not fail the whole request — return a helpful message
        responsePayload.tokenError = "JWT_SECRET not configured on server";
      } else {
        try {
          const payload = typeof body.tokenPayload === "object" && body.tokenPayload !== null ? body.tokenPayload : {};
          // sign token (1 hour expiry)
          const token = jwt.sign(payload, secret, { expiresIn: "1h" });
          responsePayload.token = token;
        } catch (tokenErr: any) {
          console.error("JWT sign error:", tokenErr);
          responsePayload.tokenError = "Failed to create token";
        }
      }
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err: any) {
    console.error("Auth route error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
