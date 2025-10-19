import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

// --- Configuration ---
const JWT_COOKIE_NAME = "auth_token";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Read environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "healthmate";
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  // Warn during build/start; we will also check at runtime
  console.warn("[auth] MONGODB_URI is not set. Set it in .env.local");
}
if (!JWT_SECRET) {
  console.warn("[auth] JWT_SECRET is not set. Set it in .env.local");
}

// --- MongoDB client with global caching (hot-reload safe) ---
let cachedClient: any = null;
let cachedDb: any = null;

// --- jsonwebtoken dynamic loader to avoid build-time crashes ---
async function getJwt(): Promise<any> {
  try {
    const mod = await import("jsonwebtoken");
    return (mod as any).default || mod;
  } catch (e: any) {
    const msg = e?.message || e?.toString?.() || "Unknown error importing jsonwebtoken";
    throw new Error(`JWT init failed: ${msg}. Ensure 'jsonwebtoken' is installed.`);
  }
}

async function getDb(): Promise<any> {
  if (cachedDb && cachedClient) return cachedDb;
  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    cachedClient = client;
    cachedDb = db;
    return db;
  } catch (e: any) {
    const msg = e?.message || e?.toString?.() || "Unknown error importing mongodb";
    throw new Error(`MongoDB init failed: ${msg}. Ensure 'mongodb' is installed and MONGODB_URI is valid.`);
  }
}

// --- JWT helpers ---
async function signToken(payload: object) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
  const jwt = await getJwt();
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: TOKEN_TTL_SECONDS });
}

async function verifyToken(token: string) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
  const jwt = await getJwt();
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; name?: string; iat: number; exp: number };
}

function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: JWT_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

function clearAuthCookie(res: NextResponse) {
  res.cookies.set({
    name: JWT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const decoded = await verifyToken(token);
    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.sub) }, { projection: { passwordHash: 0 } });
    if (!user) return null;
    return { id: user._id.toString(), name: (user as any).name, email: (user as any).email } as { id: string; name: string; email: string };
  } catch {
    return null;
  }
}

// --- Route handlers ---
export async function GET(req: NextRequest) {
  // GET /api/auth -> return current user (me)
  try {
    const me = await getUserFromRequest(req);
    if (!me) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: me });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load session" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // POST /api/auth with { action: 'signup' | 'signin' | 'signout', ... }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body?.action as string | undefined;
  if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

  try {
    switch (action) {
      case "signup":
        return await handleSignup(body);
      case "signin":
        return await handleSignin(body);
      case "signout": {
        const res = NextResponse.json({ ok: true });
        clearAuthCookie(res);
        return res;
      }
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (err: any) {
    const message = err?.code === 11000 ? "Email already registered" : err?.message || "Request failed";
    const status = message === "Email already registered" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

// --- Action implementations ---
async function handleSignup(body: any) {
  const name = (body?.name || "").toString().trim();
  const email = (body?.email || "").toString().toLowerCase().trim();
  const password = (body?.password || "").toString();

  if (!name || !email || !password) return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection("users").findOne({ email });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const insertRes = await db.collection("users").insertOne({ name, email, passwordHash, createdAt: now, updatedAt: now });

  const userId = insertRes.insertedId.toString();
  const token = await signToken({ sub: userId, email, name });

  const res = NextResponse.json({ user: { id: userId, name, email } }, { status: 201 });
  setAuthCookie(res, token);
  return res;
}

async function handleSignin(body: any) {
  const email = (body?.email || "").toString().toLowerCase().trim();
  const password = (body?.password || "").toString();
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const db = await getDb();
  const user = await db.collection("users").findOne({ email });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(password, (user as any).passwordHash || "");
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signToken({ sub: (user as any)._id.toString(), email: (user as any).email, name: (user as any).name });

  const res = NextResponse.json({ user: { id: (user as any)._id.toString(), name: (user as any).name, email: (user as any).email } });
  setAuthCookie(res, token);
  return res;
}
