# Sign-with-Google Worker

Cloudflare Worker that handles `Sign with Google` for unimelb-cs-letter.com:
sign in with a Google account, fill in `program` / `status` / optional comment,
and the worker opens a pull request adding the entry to `signatures.json`.

## Setup (one-time)

### 1. Cloudflare account

```bash
cd worker
npm install
npx wrangler login
```

### 2. Google OAuth credentials

1. Go to https://console.cloud.google.com/, create (or pick) a project.
2. **APIs & Services → OAuth consent screen** → External, add your email.
   App name: "UniMelb CS Letter". Add `email`, `profile`, `openid` scopes.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Web application.
4. Authorised redirect URI: leave empty for now; you'll fill in after first deploy.
5. Copy the **Client ID** and **Client secret**.

### 3. GitHub fine-grained PAT

1. https://github.com/settings/personal-access-tokens/new
2. Repository access → `isubasinghe/unimelbcs` only.
3. Permissions:
   - **Contents: Read and write**
   - **Pull requests: Read and write**
4. Copy the token.

### 4. Generate a session secret

```bash
openssl rand -base64 48
```

### 5. Deploy worker (gets the URL)

```bash
npx wrangler deploy
```

Note the URL printed (e.g. `https://unimelb-cs-letter-signer.<account>.workers.dev`).

### 6. Configure the worker URL

Edit `wrangler.toml`, set `WORKER_URL` to the URL from the previous step,
then redeploy:

```bash
npx wrangler deploy
```

### 7. Set secrets

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put SESSION_SECRET
```

### 8. Add Google redirect URI

Back in Google Cloud Console → OAuth client → Authorised redirect URIs:

```
https://<your-worker-url>/auth/callback
```

### 9. Wire up the frontend

In the project root, edit `index.html` and replace
`WORKER_URL_PLACEHOLDER` with the worker URL (or leave the button hidden
until configured).

## Usage

User visits `https://<worker>/auth/start`, completes Google sign-in, fills the
form, worker opens a PR. Maintainer merges and the GitHub Actions build runs
`build.py` to render the new signature into `index.html`.

## Optional: restrict to a domain

In `wrangler.toml` uncomment and set `ALLOWED_EMAIL_DOMAIN = "unimelb.edu.au"`
to restrict sign-in to UniMelb accounts. Note: graduates lose
`@student.unimelb.edu.au` access, so this is a tradeoff.

## Local development

```bash
cp .dev.vars.example .dev.vars   # then fill in
npx wrangler dev
```

Hit `http://localhost:8787/auth/start`. You'll need to add a
`http://localhost:8787/auth/callback` redirect URI in Google Cloud Console.
