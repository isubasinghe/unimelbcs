/**
 * Sign with Google → opens a GitHub PR adding the user's signature to
 * signatures.json. Maintainer reviews and merges.
 *
 * Endpoints:
 *   GET  /auth/start      Kick off Google OAuth
 *   GET  /auth/callback   OAuth callback, exchanges code for tokens
 *   GET  /sign            Form for program / status / comment
 *   POST /sign            Submits the form, opens a PR
 *
 * Required environment (see wrangler.toml + secrets):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   (secrets)
 *   GITHUB_TOKEN                             (secret, fine-grained PAT)
 *   SESSION_SECRET                           (secret, random ≥ 32 bytes)
 *   WORKER_URL                               (var, public URL of this worker)
 *   FRONTEND_URL                             (var, https://unimelb-cs-letter.com)
 *   GITHUB_OWNER, GITHUB_REPO                (vars)
 *   ALLOWED_EMAIL_DOMAIN                     (optional var, e.g. "unimelb.edu.au")
 */

const SIGNATURES_PATH = "signatures.json";
const SESSION_TTL_MS = 30 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      switch (url.pathname) {
        case "/auth/start":
          return await startOAuth(env);
        case "/auth/callback":
          return await handleCallback(request, env);
        case "/sign":
          return request.method === "POST"
            ? await handleSign(request, env)
            : await showSignForm(request, env);
        case "/health":
          return new Response("ok");
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (err) {
      console.error(err);
      return errorPage(env, err.message || "Something went wrong.", 500);
    }
  },
};

// ---------- OAuth ----------

async function startOAuth(env) {
  const state = await signToken({ exp: Date.now() + STATE_TTL_MS, n: crypto.randomUUID() }, env.SESSION_SECRET);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.WORKER_URL}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": cookie("oauth_state", state, STATE_TTL_MS / 1000),
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    },
  });
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request.headers.get("Cookie") || "");

  if (!code || !state || state !== cookies.oauth_state) {
    return errorPage(env, "OAuth state mismatch. Please try again.", 400);
  }
  if (!(await verifyToken(state, env.SESSION_SECRET))) {
    return errorPage(env, "OAuth state expired. Please try again.", 400);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.WORKER_URL}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return errorPage(env, "Google token exchange failed.", 502);
  const tokens = await tokenRes.json();

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return errorPage(env, "Could not load Google profile.", 502);
  const profile = await userRes.json();

  if (!profile.email_verified) {
    return errorPage(env, "Your Google email isn't verified.", 403);
  }
  if (env.ALLOWED_EMAIL_DOMAIN) {
    const allowed = env.ALLOWED_EMAIL_DOMAIN.toLowerCase();
    if (!profile.email.toLowerCase().endsWith(`@${allowed}`)) {
      return errorPage(env, `Sign-in restricted to @${allowed} accounts.`, 403);
    }
  }

  const session = await signToken(
    { email: profile.email, name: profile.name, exp: Date.now() + SESSION_TTL_MS },
    env.SESSION_SECRET,
  );
  const headers = new Headers();
  headers.append("Set-Cookie", cookie("session", session, SESSION_TTL_MS / 1000));
  headers.append("Set-Cookie", cookie("oauth_state", "", 0));
  headers.set("Location", `${env.WORKER_URL}/sign`);
  return new Response(null, { status: 302, headers });
}

// ---------- Signing form ----------

async function showSignForm(request, env) {
  const session = await readSession(request, env);
  if (!session) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${env.WORKER_URL}/auth/start` },
    });
  }
  return html(formPage(session, env, null));
}

async function handleSign(request, env) {
  const session = await readSession(request, env);
  if (!session) return errorPage(env, "Not signed in.", 401);

  const form = await request.formData();
  const program = (form.get("program") || "").toString().trim();
  const status = (form.get("status") || "").toString().trim();
  const comment = (form.get("comment") || "").toString().trim();

  if (!program || !status) {
    return html(formPage(session, env, "Program and status are required."));
  }
  if (program.length > 80 || comment.length > 500) {
    return html(formPage(session, env, "Field too long."));
  }
  if (!["Current Student", "Graduate"].includes(status)) {
    return html(formPage(session, env, "Invalid status."));
  }

  const signature = {
    name: session.name,
    program,
    status,
    comment,
    date: new Date().toISOString().slice(0, 10),
  };

  try {
    const prUrl = await openPullRequest(signature, session.email, env);
    return html(successPage(prUrl, env));
  } catch (err) {
    if (err.code === "DUPLICATE") {
      return html(formPage(session, env, "Looks like you've already signed."));
    }
    console.error(err);
    return errorPage(env, "Failed to open the pull request. Please try again.", 502);
  }
}

// ---------- GitHub PR creation ----------

async function openPullRequest(signature, email, env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "unimelb-cs-letter-signer",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const fileRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${SIGNATURES_PATH}`,
    { headers },
  );
  const fileData = await fileRes.json();
  const currentRaw = atobUtf8(fileData.content.replace(/\n/g, ""));
  const sha = fileData.sha;

  let signatures;
  try {
    signatures = JSON.parse(currentRaw);
  } catch {
    throw new Error(`Couldn't parse current ${SIGNATURES_PATH}.`);
  }
  const norm = (s) => s.toLowerCase().trim();
  if (
    signatures.some(
      (s) => norm(s.name) === norm(signature.name) && norm(s.program) === norm(signature.program),
    )
  ) {
    const e = new Error("Already signed");
    e.code = "DUPLICATE";
    throw e;
  }
  signatures.push(signature);
  const newRaw = JSON.stringify(signatures, null, 2) + "\n";
  const newB64 = btoaUtf8(newRaw);

  const repoRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  const defaultBranch = (await repoRes.json()).default_branch;

  const refRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    { headers },
  );
  const baseSha = (await refRes.json()).object.sha;

  const branch = `signature/${slugify(signature.name)}-${Date.now().toString(36)}`;
  await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${SIGNATURES_PATH}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Add signature: ${signature.name}`,
        content: newB64,
        sha,
        branch,
      }),
    },
  );

  const prRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: `Add signature: ${signature.name}`,
      head: branch,
      base: defaultBranch,
      body: [
        `Submitted via Sign with Google.`,
        ``,
        `Verified Google email: \`${email}\``,
        ``,
        "```json",
        JSON.stringify(signature, null, 2),
        "```",
      ].join("\n"),
    }),
  });
  return (await prRes.json()).html_url;
}

async function ghFetch(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${init?.method || "GET"} ${url} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

// ---------- Sessions / cookies ----------

function cookie(name, value, maxAgeSec) {
  return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}; Path=/`;
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

async function readSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  return await verifyToken(cookies.session, env.SESSION_SECRET);
}

async function signToken(payload, secret) {
  const data = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(data, secret);
  return `${data}.${sig}`;
}

async function verifyToken(token, secret) {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(data, secret);
  if (!constantTimeEq(sig, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(data)));
  } catch {
    return null;
  }
  if (!payload || (payload.exp && payload.exp < Date.now())) return null;
  return payload;
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

function constantTimeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---------- Encoding helpers ----------

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function atobUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function btoaUtf8(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function slugify(s) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "anon"
  );
}

// ---------- HTML rendering ----------

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function shell(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 2rem 1rem; line-height: 1.6; }
  .card { max-width: 560px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid #3b82f6; }
  h1 { color: #1e3a8a; margin: 0 0 0.5rem; font-size: 1.5rem; }
  p { margin: 0.75rem 0; }
  label { display: block; margin-top: 1rem; font-weight: 600; color: #334155; }
  input, select, textarea { width: 100%; padding: 0.6rem; border: 2px solid #e2e8f0; border-radius: 6px; font: inherit; margin-top: 0.25rem; box-sizing: border-box; }
  textarea { resize: vertical; min-height: 80px; }
  button { background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; border: 0; padding: 0.75rem 1.5rem; font-weight: 600; font-size: 1rem; border-radius: 8px; cursor: pointer; margin-top: 1.5rem; }
  button:hover { transform: translateY(-1px); }
  .err { background: #fef2f2; color: #b91c1c; padding: 0.75rem; border-radius: 6px; border-left: 4px solid #dc2626; margin: 1rem 0; }
  .meta { color: #64748b; font-size: 0.9rem; }
  a { color: #3b82f6; }
</style>
</head>
<body>
<div class="card">
${content}
</div>
</body>
</html>`;
}

function formPage(session, env, error) {
  const errBlock = error ? `<div class="err">${escapeHtml(error)}</div>` : "";
  return shell(
    "Sign the letter",
    `
    <h1>Sign the letter</h1>
    <p class="meta">Signed in as <strong>${escapeHtml(session.name)}</strong> &lt;${escapeHtml(session.email)}&gt;.</p>
    <p>Fill in a couple of details. We'll open a pull request that the maintainer reviews before it appears on <a href="${escapeHtml(env.FRONTEND_URL)}">${escapeHtml(env.FRONTEND_URL.replace(/^https?:\/\//, ""))}</a>.</p>
    ${errBlock}
    <form method="POST" action="/sign">
      <label>Program
        <input name="program" required maxlength="80" placeholder="e.g. MIT 2025, MCS 2024, BSc Data Science">
      </label>
      <label>Status
        <select name="status" required>
          <option value="Current Student">Current Student</option>
          <option value="Graduate">Graduate</option>
        </select>
      </label>
      <label>Comment <span class="meta">(optional, max 500 chars)</span>
        <textarea name="comment" maxlength="500" placeholder="A short note about your experience"></textarea>
      </label>
      <button type="submit">Open pull request</button>
    </form>
    `,
  );
}

function successPage(prUrl, env) {
  return shell(
    "Pull request opened",
    `
    <h1>Pull request opened</h1>
    <p>Thanks for signing. Your signature is now in a pull request and will appear on the site once a maintainer merges it.</p>
    <p><a href="${escapeHtml(prUrl)}" target="_blank" rel="noopener">View your pull request on GitHub</a></p>
    <p class="meta"><a href="${escapeHtml(env.FRONTEND_URL)}">← Back to the letter</a></p>
    `,
  );
}

function errorPage(env, message, status) {
  return html(
    shell(
      "Something went wrong",
      `
      <h1>Couldn't complete that request</h1>
      <div class="err">${escapeHtml(message)}</div>
      <p class="meta"><a href="${escapeHtml(env.FRONTEND_URL || "/")}">← Back to the letter</a></p>
      `,
    ),
    status,
  );
}
