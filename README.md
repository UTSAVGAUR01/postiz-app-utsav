# Postiz Docker test setup

This package starts Postiz with its own PostgreSQL database and the two services
Postiz also requires: Redis and Temporal. All data is stored in named Docker
volumes, so it remains after container restarts.

## Requirements

- Docker Desktop on Windows, or Docker Engine with Compose v2 on Linux
- At least 4 GB free RAM for this test stack
- Ports `4007` and `8082` available

## Windows PowerShell

Open PowerShell in this folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\start.ps1
```

## Linux

Open a terminal in this folder and run:

```bash
chmod +x start.sh
./start.sh
```

Then open <http://localhost:4007/auth> and create the first test account.
Temporal's diagnostic UI is available at <http://localhost:8082>.

## Manual start

```bash
cp .env.example .env
```

Edit `.env` and replace both `change_this...` values, then run:

```bash
docker compose config
docker compose build --pull postiz
docker compose up -d
docker compose ps
```

## Check logs and health

```bash
docker compose ps
docker compose logs --tail=200 postiz
docker compose logs --tail=100 postgres
```

On Windows PowerShell, test the page with:

```powershell
curl.exe -s -o NUL -w "Postiz HTTP: %{http_code}`n" http://localhost:4007/auth
```

HTTP `200` means the Postiz page is responding.

## DevOps testing workflow

The start scripts now run a smoke test automatically. The test waits for all
required containers, checks their Docker health state, verifies PostgreSQL and
Redis from inside their containers, and confirms the Postiz `/auth` endpoint.

Run the checks again at any time:

```bash
./scripts/smoke-test.sh
```

Windows PowerShell:

```powershell
.\scripts\smoke-test.ps1
```

Create a compact diagnostic report for a failed test:

```bash
./scripts/diagnostics.sh
```

Windows PowerShell:

```powershell
.\scripts\diagnostics.ps1
```

Reports are written under `test-reports/`. They contain Compose status,
container health details, resource usage, and the latest logs for each service.
Passwords and `.env` contents are not included.

Useful development commands:

```bash
docker compose up -d                 # start or update the stack
docker compose ps                    # inspect service state
docker compose logs -f postiz        # follow application logs
docker compose restart postiz        # restart only Postiz
docker compose build --pull postiz && docker compose up -d  # update Postiz safely
./scripts/smoke-test.sh              # regression check after a change
```

The included GitHub Actions workflow validates `docker-compose.yml` on every
push and pull request. Copy `.github/workflows/compose-check.yml` into the root
of your Postiz fork if this package is kept outside the repository.

## Stop or reset

Stop without deleting data:

```bash
docker compose down
```

Delete the complete test environment, including its database and uploads:

```bash
docker compose down -v
```

Only use the second command when you intentionally want a fresh database.

## Use your customized Postiz fork

This test package builds a local compatibility image over the official Postiz
image. After building your fork `https://github.com/UTSAVGAUR01/postiz-app-utsav`,
tag it locally and set `POSTIZ_BASE_IMAGE` in `.env` to that tag. For example:

```bash
git clone https://github.com/UTSAVGAUR01/postiz-app-utsav.git
cd postiz-app-utsav
docker build -t utsav-postiz:latest .
```

Then use this value in the test package's `.env`:

```env
POSTIZ_BASE_IMAGE=utsav-postiz:latest
```

Restart only the application container:

```bash
docker compose up -d --no-deps --force-recreate postiz
```

OAuth client secrets and social-platform secrets belong in the Postiz backend
environment, never in browser-side frontend code.

## Provider credentials and admin UI

Open the custom admin UI at <http://localhost:3001>, sign in with your Postiz
account, and use **Provider Credentials** to add or edit OAuth client IDs and
secrets. Select **Apply & Restart Postiz** after saving: it writes the managed
values to `.env` and recreates Postiz so it receives the new environment.

Configure each provider's OAuth redirect URL in its developer console before
using the integration connection flow in Postiz. The exact redirect path is
provider-specific; begin the connection in Postiz and register the callback URL
shown by the provider flow.

The admin UI mounts the Docker socket and this development stack enables
`NOT_SECURED` so the UI can proxy the local Postiz session. Keep both services
bound to `localhost` and do not expose port `3001` or this Compose setup to a
network without adding server-side access control and removing `NOT_SECURED`.
