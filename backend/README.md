# CMS backend (optional)

Two serverless functions that turn the admin from a **local** tool into a **real**
one: a password that is checked server-side, and edits that everyone sees without
redeploying.

```
backend/
  lib.js        storage adapters, PBKDF2 hashing, signed sessions, rate limiting
  auth.js       POST /auth  {action: setup | login | change}   GET /auth  → status
  content.js    GET|PUT|DELETE /content?which=draft|published
```

You do **not** need this. Without it the admin stores everything in the browser
and you publish by downloading files. Use it when more than one person edits, or
when you want the live site to change without a deploy.

---

## What it fixes

| | No backend (default) | With backend |
|---|---|---|
| Password | Hashed in the browser — stops accidental edits, **not** an attacker | PBKDF2-SHA256, 210k iterations, verified server-side |
| Who can edit | Anyone who opens `admin.html` and reads the source | Only whoever knows the password |
| Where edits live | Your browser's localStorage | Shared storage, visible to every visitor |
| Shipping a change | Download `content.json` or a baked `index.html`, re-upload | Publish; the site picks it up on next load |

---

## 1. Environment variables

```bash
CMS_SESSION_SECRET=<output of: openssl rand -hex 32>
```

`POST /auth` takes `{action, username, password}`. The username is required
(3–64 characters, no markup or control characters), compared exactly and
case-sensitively, and returned by `GET /auth` so the admin can prefill the form —
it is an identifier, not a secret. A failed login always reports
*"Wrong username or password"*, never which half was wrong, so the endpoint
cannot be used to enumerate usernames.

Without it the functions refuse to issue tokens (deliberately — a guessable
secret would let anyone mint an admin session).

Optional, to point storage somewhere durable:

```bash
CMS_DATA_DIR=/var/data/as-cms        # filesystem adapter (default: backend/../.cms-data)
NETLIFY=1                            # use Netlify Blobs instead
VERCEL_BLOB_READ_WRITE_TOKEN=...     # use Vercel Blob instead
```

The adapter is chosen in `lib.js → store()`. Adding another (Supabase, KV, S3)
means implementing `get/put/del` over a key string — about fifteen lines.

## 2. Deploy

**Netlify** — drop both files in `netlify/functions/`:

```bash
mkdir -p netlify/functions
cp backend/auth.js backend/content.js backend/lib.js netlify/functions/
```

`auth.js` and `content.js` become `/.netlify/functions/auth` and
`/.netlify/functions/content`. Add to `netlify.toml`:

```toml
[functions]
node_bundler = "esbuild"

[[redirects]]
from = "/api/*"
to = "/.netlify/functions/:splat"
status = 200
```

**Vercel** — put them in `api/` (`api/auth.js`, `api/content.js`, plus `lib.js`),
then add `module.exports = exports.handler` at the bottom of each if you use the
CommonJS shape as-is.

**Anywhere else** — any Node host that can call
`exports.handler(event) → {statusCode, headers, body}` works; the event shape is
the standard API Gateway one.

## 3. Point the admin at it

Open `cms/admin.html` → **Settings & security** → *API base URL*, paste:

```
https://your-site.netlify.app/api
```

Press **Test the connection** (it should report HTTP 200), then **Save &
reconnect**. The admin reloads, the gate switches to server-side login, and the
top bar starts reading `server` instead of `saved in this browser`.

You can also compile it in so nobody has to configure it — edit `CONFIG.backendUrl`
at the top of `cms/admin.js`.

## 4. First run

1. Open `cms/admin.html`. With a backend configured there are no seeded
   defaults: `/auth` reports `configured: false`, so the gate offers
   **Create the admin account**.
2. Set a username and password. The password is hashed with PBKDF2-SHA256
   (210,000 iterations) and a fresh random salt; the plaintext is never written
   anywhere.
3. A second `setup` call is refused with HTTP 409, so a stranger who finds the
   endpoint later cannot claim the account.

---

## What the site does with it

`cms/cms-runtime.js` looks for content in this order:

1. a `<script type="application/json" id="as-cms-content">` baked into the page
2. `localStorage['as-cms-content']`
3. `fetch('content.json')`

If you want the live site to read from the backend instead of a static
`content.json`, change `fromFetch()` in `cms-runtime.js` to point at
`<api>/content?which=published`. That endpoint is **public by design** — the
published document is what the world sees anyway. The draft endpoint requires a
token, so unreviewed copy cannot leak.

---

## Security notes, honestly

* **Sessions** are HMAC-SHA256 signed tokens with an 8-hour expiry. Forged,
  tampered and expired tokens are all rejected (there are tests for each).
* **Login is rate limited** to 12 attempts per 10 minutes per IP — per function
  instance. On a scaled deployment use Upstash or Redis for a real limiter.
* **`/content` validates its input**: only known section names are accepted, each
  section must be an object, and payloads are capped at 6 MB. It cannot be used
  as a general key/value store on your account.
* **CORS** is on every response, including errors — a missing header on the
  error path is the classic way this breaks in the browser.
* **This does not make a static site secret.** `admin.html` is publicly
  downloadable; the backend only means the *data* is protected. If you want the
  admin itself hidden, put it behind host-level auth (Netlify's password
  protection, Vercel's deployment protection, or a basic-auth edge rule) and
  don't link it from the public site.
* Add `noindex` (already in `admin.html`) and keep the file out of your sitemap.

## Tests

```bash
node build/backendtest.js
```

39 checks: setup/login/change with usernames, username validation and
case-sensitivity, error messages that do not leak which half was wrong, plaintext
never stored, salt is random, brute
force throttled, forged/tampered/expired tokens rejected, draft requires auth
while published is public, unknown sections rejected, malformed bodies handled,
delete, and unsupported methods refused. It runs against the filesystem adapter
in a temp directory — no cloud account needed.
