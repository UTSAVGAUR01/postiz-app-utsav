---
name: add-oauth-provider
description: "Step-by-step guide to register an OAuth app on a social provider's developer console and wire the credentials into the local Postiz Docker stack."
argument-hint: "Provider name (e.g. linkedin, facebook, github, google, x)"
---

# Add OAuth Provider to Postiz

You are helping the user connect a social media provider to their local Postiz Docker stack.

The user has specified: **${input:provider}**

Follow these steps in order.

---

## Step 1 — Identify the provider

Map the user's input to the correct provider:

| User says | Provider key | Postiz env vars |
|---|---|---|
| facebook, instagram, fb | facebook | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| linkedin | linkedin | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| github, gh | github | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| google, youtube | google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| twitter, x, tw | x | `X_CLIENT_ID`, `X_CLIENT_SECRET` |
| tiktok | tiktok | `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET` |
| reddit | reddit | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` |

If the provider is not in the list, tell the user that this provider may need manual discovery from the Postiz source under `/app/libraries/nestjs-libraries/src/integrations/`.

---

## Step 2 — Guide developer console registration

Give the user the exact URL and steps for the identified provider:

### Facebook / Instagram
1. Go to https://developers.facebook.com/apps/
2. Create a new app → choose **Business** type
3. Add the **Facebook Login** product
4. Under **Valid OAuth Redirect URIs** add: `http://localhost:4007/integrations/social/facebook`
5. Copy **App ID** → `FACEBOOK_APP_ID`
6. Copy **App Secret** → `FACEBOOK_APP_SECRET`

### LinkedIn
1. Go to https://www.linkedin.com/developers/apps/new
2. Create an app, enable **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**
3. Under **Auth** → **Authorized redirect URLs** add: `http://localhost:4007/integrations/social/linkedin`
4. Copy **Client ID** → `LINKEDIN_CLIENT_ID`
5. Copy **Client Secret** → `LINKEDIN_CLIENT_SECRET`

### GitHub
1. Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Set **Authorization callback URL** to: `http://localhost:4007/integrations/social/github`
3. Copy **Client ID** → `GITHUB_CLIENT_ID`
4. Generate a **Client Secret** → `GITHUB_CLIENT_SECRET`

### Google / YouTube
1. Go to https://console.cloud.google.com/apis/credentials
2. Create **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized redirect URI**: `http://localhost:4007/integrations/social/google`
4. Copy **Client ID** → `GOOGLE_CLIENT_ID`
5. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`
6. Enable **YouTube Data API v3** in the API Library

### X (Twitter)
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a project + app, enable **OAuth 2.0**
3. Set **Callback URI**: `http://localhost:4007/integrations/social/x`
4. Copy **Client ID** → `X_CLIENT_ID`
5. Copy **Client Secret** → `X_CLIENT_SECRET`

---

## Step 3 — Add credentials to the stack

Read the current [docker-compose.yml](../../docker-compose.yml) to find the `postiz` service `environment:` block, then add the two provider env vars under it.

Also add them to [.env](../../.env) (values) and [.env.example](../../.env.example) (empty placeholders).

**Never commit real secrets to git.** Confirm `.env` is in `.gitignore` before saving values.

---

## Step 4 — Restart the Postiz container

```powershell
docker compose up -d --no-deps --force-recreate postiz
docker compose ps
```

Wait for `(healthy)` status on `postiz-test-app`.

---

## Step 5 — Verify the connection

1. Open http://localhost:4007 and log in
2. Go to **Settings → Channels** (or the integrations panel)
3. Click the provider button — it should redirect to the provider's OAuth page
4. Authorize and confirm the account appears in Postiz

If the browser shows **"Invalid App ID"** or **"client_id is invalid undefined"**, the env var is not reaching the backend — re-check Step 3 and Step 4.

---

## Constraints

- DO NOT modify any file until the user confirms they have the credentials ready
- DO NOT store credentials in browser-side code or frontend env vars
- ONLY touch the `postiz` service `environment:` block and the two `.env` files
- DO NOT restart other containers (postgres, redis, temporal) — `--no-deps` is required
