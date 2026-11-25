// Local stand-in for the Supabase HTTP API, used ONLY by the end-to-end tests.
//
// It translates the subset of the Auth / PostgREST / Storage APIs that Atlas
// uses into SQL against a real PostgreSQL database. Every data request runs as
// the `authenticated` role with the caller's JWT subject, so the real Row Level
// Security policies from supabase/migrations are what allow or deny access.
//
// Usage: DATABASE_URL=postgres://... JWT_SECRET=... node scripts/e2e/fake-supabase.mjs

import crypto from "node:crypto";
import http from "node:http";
import pg from "pg";

const PORT = Number(process.env.PORT ?? 54321);
const JWT_SECRET = process.env.JWT_SECRET ?? "e2e-secret-that-is-at-least-32-characters";
const PUBLIC_URL = process.env.PUBLIC_URL ?? `http://127.0.0.1:${PORT}`;
// Serialize like PostgREST: dates as YYYY-MM-DD, timestamps as ISO, numerics as numbers.
pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(1114, (value) => new Date(`${value.replace(" ", "T")}Z`).toISOString());
pg.types.setTypeParser(1184, (value) => new Date(value).toISOString());
pg.types.setTypeParser(1700, (value) => Number(value));
pg.types.setTypeParser(20, (value) => Number(value));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const files = new Map(); // `${bucket}/${path}` -> { bytes, type }
const signedTokens = new Map(); // token -> { key, expires }

// ------------------------------------------------------------------ helpers
const b64url = (input) => Buffer.from(input).toString("base64url");
function signJwt(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}
function verifyJwt(token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest("base64url");
  if (expected !== parts[2]) return null;
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload;
}
function bearer(req) {
  const value = req.headers.authorization ?? "";
  return value.startsWith("Bearer ") ? verifyJwt(value.slice(7)) : null;
}
function send(res, status, body, headers = {}) {
  const payload = body === undefined ? "" : typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Range, X-Total-Count",
    ...(typeof body === "object" && !Buffer.isBuffer(body) ? { "Content-Type": "application/json" } : {}),
    ...headers,
  });
  res.end(payload);
}
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Object.assign(new Error(`bad identifier ${name}`), { status: 400 });
  return `"${name}"`;
};

async function asUser(sub, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(sub ? "set local role authenticated" : "set local role anon");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [sub ?? ""]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function pgError(res, error) {
  const status = error.status ?? (error.code === "42501" ? 403 : error.code === "23505" ? 409 : error.code?.startsWith("23") ? 400 : error.code === "PGRST116" ? 406 : 400);
  send(res, status, { code: error.code ?? "PGRST000", message: error.message, details: error.detail ?? null, hint: null });
}

// ------------------------------------------------------------------ auth
async function sessionFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJwt({ sub: user.id, role: "authenticated", aud: "authenticated", email: user.email, iat: now, exp: now + 3600, session_id: crypto.randomUUID() });
  return { access_token: accessToken, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: signJwt({ sub: user.id, typ: "refresh", iat: now, exp: now + 86400 * 7 }), user };
}
function userJson(row) {
  return {
    id: row.id,
    aud: "authenticated",
    role: "authenticated",
    email: row.email,
    email_confirmed_at: row.created_at,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: row.raw_user_meta_data ?? {},
    identities: [{ id: row.id, user_id: row.id, identity_id: row.id, provider: "email", identity_data: { sub: row.id, email: row.email } }],
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}
const hash = (password) => crypto.createHash("sha256").update(`atlas-e2e:${password}`).digest("hex");

async function handleAuth(req, res, path, url) {
  if (path === "/.well-known/jwks.json") return send(res, 200, { keys: [] });
  if (path === "/settings") return send(res, 200, { external: { email: true }, mailer_autoconfirm: true });
  if (path === "/signup" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const existing = await pool.query("select * from auth.users where lower(email) = lower($1)", [body.email]);
    if (existing.rows[0]) return send(res, 422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
    const { rows } = await pool.query(
      "insert into auth.users (id, email, raw_user_meta_data, encrypted_password) values (gen_random_uuid(), $1, $2, $3) returning *",
      [body.email, body.data ?? body.options?.data ?? {}, hash(body.password)],
    );
    return send(res, 200, await sessionFor(userJson(rows[0])));
  }
  if (path === "/token" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "{}");
    const grant = url.searchParams.get("grant_type");
    let row;
    if (grant === "password") {
      ({ rows: [row] } = await pool.query("select * from auth.users where lower(email) = lower($1) and encrypted_password = $2", [body.email, hash(body.password)]));
      if (!row) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials", error_code: "invalid_credentials" });
    } else if (grant === "refresh_token") {
      const claims = verifyJwt(body.refresh_token);
      if (!claims || claims.typ !== "refresh") return send(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
      ({ rows: [row] } = await pool.query("select * from auth.users where id = $1", [claims.sub]));
    }
    if (!row) return send(res, 400, { error: "invalid_grant" });
    return send(res, 200, await sessionFor(userJson(row)));
  }
  if (path === "/user" && req.method === "GET") {
    const claims = bearer(req);
    if (!claims?.sub) return send(res, 401, { code: 401, msg: "invalid JWT" });
    const { rows } = await pool.query("select * from auth.users where id = $1", [claims.sub]);
    return rows[0] ? send(res, 200, userJson(rows[0])) : send(res, 404, { msg: "User not found" });
  }
  if (path === "/logout") return send(res, 204);
  return send(res, 404, { msg: `auth endpoint ${path} not implemented in e2e stub` });
}

// ------------------------------------------------------------------ rest
function splitTop(input) {
  const parts = [];
  let depth = 0, quoted = false, current = "";
  for (const char of input) {
    if (char === '"') quoted = !quoted;
    if (!quoted && char === "(") depth++;
    if (!quoted && char === ")") depth--;
    if (!quoted && depth === 0 && char === ",") { parts.push(current); current = ""; continue; }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}
const unquote = (value) => (value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value);

function condition(column, expr, params) {
  let negate = false;
  if (expr.startsWith("not.")) { negate = true; expr = expr.slice(4); }
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const raw = expr.slice(dot + 1);
  const col = ident(column);
  let sql;
  const ops = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };
  if (ops[op]) { params.push(unquote(raw).replace(/\*/g, "%")); sql = `${col} ${ops[op]} $${params.length}`; }
  else if (op === "in") { params.push(splitTop(raw.replace(/^\(|\)$/g, "")).map(unquote)); sql = `${col} = any($${params.length})`; }
  else if (op === "is") { sql = `${col} is ${raw === "null" ? "null" : raw === "true" ? "true" : "false"}`; }
  else if (op === "cs") { params.push(raw); sql = `${col} @> $${params.length}`; }
  else throw Object.assign(new Error(`operator ${op} not supported by e2e stub`), { status: 400 });
  return negate ? `not (${sql})` : sql;
}

function whereClause(url, params) {
  const clauses = [];
  for (const [key, value] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(key)) continue;
    if (key === "or") {
      const inner = splitTop(value.replace(/^\(|\)$/g, "")).map((part) => {
        const dot = part.indexOf(".");
        return condition(part.slice(0, dot), part.slice(dot + 1), params);
      });
      clauses.push(`(${inner.join(" or ")})`);
    } else clauses.push(condition(key, value, params));
  }
  return clauses.length ? `where ${clauses.join(" and ")}` : "";
}
function selectList(url) {
  const select = url.searchParams.get("select") ?? "*";
  if (select.trim() === "*") return "*";
  return select.split(",").map((column) => ident(column.trim())).join(", ");
}
function orderClause(url) {
  const order = url.searchParams.get("order");
  if (!order) return "";
  return `order by ${order.split(",").map((part) => {
    const [column, ...mods] = part.split(".");
    return `${ident(column)} ${mods.includes("desc") ? "desc" : "asc"}${mods.includes("nullsfirst") ? " nulls first" : mods.includes("nullslast") ? " nulls last" : ""}`;
  }).join(", ")}`;
}

async function handleRest(req, res, path, url, claims) {
  const sub = claims?.sub ?? null;
  const prefer = req.headers.prefer ?? "";
  const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const wantCount = prefer.includes("count=exact");
  const returning = prefer.includes("return=representation");

  if (path.startsWith("/rpc/")) {
    const fn = ident(path.slice(5));
    const args = JSON.parse((await readBody(req)).toString() || "{}");
    const params = [];
    const named = Object.entries(args).map(([key, value]) => { params.push(value); return `${ident(key)} => $${params.length}`; });
    const rows = await asUser(sub, (client) => client.query(`select * from public.${fn}(${named.join(", ")})`, params)).then((r) => r.rows);
    return send(res, 200, rows);
  }

  const table = ident(path.slice(1));
  const params = [];
  let rows = [];
  let count = null;

  if (req.method === "GET" || req.method === "HEAD") {
    const where = whereClause(url, params);
    const limit = url.searchParams.get("limit") ? `limit ${Number(url.searchParams.get("limit"))}` : "";
    const offset = url.searchParams.get("offset") ? `offset ${Number(url.searchParams.get("offset"))}` : "";
    await asUser(sub, async (client) => {
      if (wantCount) count = Number((await client.query(`select count(*) from public.${table} ${where}`, params)).rows[0].count);
      if (req.method === "GET") rows = (await client.query(`select ${selectList(url)} from public.${table} ${where} ${orderClause(url)} ${limit} ${offset}`, params)).rows;
    });
  } else if (req.method === "POST") {
    const body = JSON.parse((await readBody(req)).toString() || "[]");
    const records = Array.isArray(body) ? body : [body];
    const conflict = url.searchParams.get("on_conflict");
    await asUser(sub, async (client) => {
      for (const record of records) {
        const columns = Object.keys(record).map(ident);
        const upsert = prefer.includes("resolution=merge-duplicates") && conflict
          ? `on conflict (${conflict.split(",").map(ident).join(", ")}) do update set ${columns.map((c) => `${c} = excluded.${c}`).join(", ")}`
          : "";
        const result = await client.query(
          `insert into public.${table} (${columns.join(", ")}) select ${columns.join(", ")} from json_populate_record(null::public.${table}, $1) ${upsert} returning ${selectList(url)}`,
          [JSON.stringify(record)],
        );
        rows.push(...result.rows);
      }
    });
    count = rows.length;
  } else if (req.method === "PATCH") {
    const record = JSON.parse((await readBody(req)).toString() || "{}");
    params.push(JSON.stringify(record));
    const where = whereClause(url, params);
    const sets = Object.keys(record).map((key) => `${ident(key)} = r.${ident(key)}`).join(", ");
    await asUser(sub, async (client) => {
      rows = (await client.query(`update public.${table} t set ${sets} from json_populate_record(null::public.${table}, $1) r ${where.replace(/"([a-z_0-9]+)" /g, 't."$1" ')} returning ${selectList(url) === "*" ? "t.*" : selectList(url).split(", ").map((c) => `t.${c}`).join(", ")}`, params)).rows;
    });
    count = rows.length;
  } else if (req.method === "DELETE") {
    const where = whereClause(url, params);
    await asUser(sub, async (client) => {
      rows = (await client.query(`delete from public.${table} ${where} returning ${selectList(url)}`, params)).rows;
    });
    count = rows.length;
  }

  const headers = wantCount ? { "Content-Range": `${rows.length ? `0-${rows.length - 1}` : "*"}/${count ?? rows.length}` } : {};
  if (req.method === "HEAD") return send(res, 200, undefined, headers);
  if (single) {
    if (rows.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows`, hint: null });
    return send(res, 200, rows[0], headers);
  }
  if ((req.method === "PATCH" || req.method === "DELETE" || req.method === "POST") && !returning) return send(res, 204, undefined, headers);
  return send(res, req.method === "POST" ? 201 : 200, rows, headers);
}

// ------------------------------------------------------------------ storage
async function handleStorage(req, res, path, url, claims) {
  const sub = claims?.sub ?? null;
  let match = path.match(/^\/object\/sign\/([^/]+)\/(.+)$/);
  if (match && req.method === "GET") {
    const entry = signedTokens.get(url.searchParams.get("token"));
    const key = `${match[1]}/${decodeURIComponent(match[2])}`;
    if (!entry || entry.key !== key || entry.expires < Date.now() || !files.has(key)) return send(res, 400, { error: "InvalidSignature" });
    const file = files.get(key);
    const download = url.searchParams.has("download");
    return send(res, 200, file.bytes, { "Content-Type": file.type, ...(download ? { "Content-Disposition": `attachment; filename="${key.split("/").pop()}"` } : {}) });
  }
  if (match && req.method === "POST") {
    const [, bucket, raw] = match;
    const name = decodeURIComponent(raw);
    const visible = await asUser(sub, (client) => client.query("select 1 from storage.objects where bucket_id = $1 and name = $2", [bucket, name])).then((r) => r.rowCount);
    if (!visible) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    const token = crypto.randomUUID();
    signedTokens.set(token, { key: `${bucket}/${name}`, expires: Date.now() + 60_000 });
    return send(res, 200, { signedURL: `/object/sign/${bucket}/${raw}?token=${token}` });
  }
  match = path.match(/^\/object\/([^/]+)\/(.+)$/);
  if (match && (req.method === "POST" || req.method === "PUT")) {
    const [, bucket, raw] = match;
    const name = decodeURIComponent(raw);
    const body = await readBody(req);
    let bytes = body;
    let type = req.headers["content-type"] ?? "application/octet-stream";
    if (type.startsWith("multipart/form-data")) {
      const form = await new Request("http://local", { method: "POST", headers: { "content-type": type }, body }).formData();
      const file = [...form.values()].find((value) => typeof value === "object");
      bytes = Buffer.from(await file.arrayBuffer());
      type = file.type || "application/octet-stream";
    }
    try {
      await asUser(sub, (client) => client.query("insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3)", [bucket, name, sub]));
    } catch (error) {
      return send(res, 403, { statusCode: "403", error: "Unauthorized", message: `new row violates row-level security policy (${error.message})` });
    }
    files.set(`${bucket}/${name}`, { bytes, type });
    return send(res, 200, { Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
  }
  match = path.match(/^\/object\/([^/]+)$/);
  if (match && req.method === "DELETE") {
    const bucket = match[1];
    const { prefixes = [] } = JSON.parse((await readBody(req)).toString() || "{}");
    const deleted = await asUser(sub, (client) => client.query("delete from storage.objects where bucket_id = $1 and name = any($2) returning name", [bucket, prefixes])).then((r) => r.rows);
    for (const row of deleted) files.delete(`${bucket}/${row.name}`);
    return send(res, 200, deleted.map((row) => ({ name: row.name, bucket_id: bucket })));
  }
  return send(res, 404, { message: `storage endpoint ${path} not implemented in e2e stub` });
}

// ------------------------------------------------------------------ server
http
  .createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      return send(res, 204, undefined, {
        "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
        "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] ?? "*",
      });
    }
    const url = new URL(req.url, PUBLIC_URL);
    try {
      if (url.pathname.startsWith("/auth/v1")) return await handleAuth(req, res, url.pathname.slice(8), url);
      if (url.pathname.startsWith("/rest/v1")) return await handleRest(req, res, url.pathname.slice(8), url, bearer(req));
      if (url.pathname.startsWith("/storage/v1")) return await handleStorage(req, res, url.pathname.slice(11), url, bearer(req));
      send(res, 404, { message: "not found" });
    } catch (error) {
      if (process.env.E2E_DEBUG) console.error(req.method, req.url, error.message);
      pgError(res, error);
    }
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake supabase listening on ${PUBLIC_URL}`));
