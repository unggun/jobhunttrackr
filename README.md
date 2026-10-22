# Job Hunt Tracker

A free, open-source tracker for people applying to lots of jobs. It remembers where you applied, what you typed into each application form, where each application stands, and keeps a copy of the job posting so you can prepare for interviews after the posting is gone.

It runs on Cloudflare's free tier (Workers + D1), so you can host your own copy at no cost. It also has an MCP server, so Claude can check whether you already applied, and log the application and your form answers while it helps you fill in forms.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/unggun/jobhunttrackr)

See [Deploy to Cloudflare](#deploy-to-cloudflare) for what to have ready before you click.

## Features

- **List and board views** of your applications, with search, status filters and one-click status changes. Drag cards between columns on the board.
- **"Have I applied here?" warning** when you add a job whose posting link or company you already track.
- **Form answers** saved per application, each with a copy button for the next form that asks the same question.
- **Interview prep page** with the next round, the saved job posting, what you told them and notes from earlier rounds. It prints cleanly too.
- **Follow-up nudges** for applications with no news for two weeks, and upcoming interviews at the top of the list.
- **Works with Claude** through MCP: Claude Code, claude.ai and the Claude apps can look up and log applications for you. See [Connect Claude](#connect-claude).
- Dark mode, a phone-friendly layout, and keyboard shortcuts: `N` adds an application and `/` jumps to search.

## What it tracks

- **Applications:** company, role, location, work mode, salary, posting link, application form link, source, resume version and notes.
- **Form answers:** each question from the application form and what you answered.
- **Status history:** saved, applied, screening, interviewing, offer, accepted, rejected, withdrawn or ghosted, with a timeline of every change.
- **Job posting copy:** the posting text, saved when you apply.
- **Interview rounds:** when, with whom, prep notes, feedback and outcome.

## Sign-in

You sign in on the app itself with GitHub, and stay signed in for 30 days. Only one account can be created: the first person to sign in becomes the owner. To allow more people, list their emails in `ALLOWED_EMAILS`.

## Connect Claude

Your tracker is also an MCP server at `https://<your-app>/mcp`. When Claude connects, it opens your tracker so you can sign in and approve it once. After that it stays connected.

Claude gets these tools:

| Tool                  | What Claude uses it for                                              |
| --------------------- | -------------------------------------------------------------------- |
| `find_applications`   | "Have I applied here already?", by posting link or company           |
| `log_application`     | Save an application with the job posting and every form answer       |
| `save_answers`        | Add answers from later pages of a multi-step form                    |
| `update_status`       | Record news: a screening call, an interview, an offer or a rejection |
| `update_application`  | Fill in details later, like the salary or the posting text           |
| `add_interview_round` | Schedule an interview round                                          |
| `get_application`     | Read back the posting and your answers, e.g. to help you prepare     |
| `list_applications`   | See what's open                                                      |

It can't delete applications.

### Claude Code

```sh
claude mcp add --transport http --scope user jobhunt https://<your-app>/mcp
```

Then run `/mcp` inside Claude Code, pick `jobhunt` and choose **Authenticate**. Your browser opens your tracker: sign in and click **Allow**.

### claude.ai, Claude Desktop and mobile

Open **Settings → Connectors → Add custom connector**, name it "Job Hunt Tracker" and paste `https://<your-app>/mcp` as the URL. If the dialog asks:

- **Authentication:** sign in now.
- **OAuth client:** register automatically. The tracker doesn't support "Claude's published identity" yet.
- **Request headers:** leave empty.

Click **Add** or **Connect**, sign in and click **Allow**. The connector then works in the Claude apps on all your devices.

### Using it

The server tells Claude when to use each tool, so asking normally works:

> Help me apply to https://jobs.example.com/123. Check my tracker first.

> I just got an interview invite from Acme for next Tuesday at 2pm. Update my tracker.

> Help me prepare for my Acme interview.

## Run it locally

Requires Node.js 22 or later.

```sh
npm install
cp .env.example .env   # then fill it in, see below
npm run db:migrate     # creates the local D1 database
npm run dev
```

Fill in `.env`:

- `ORIGIN`: `http://localhost:5173`
- `BETTER_AUTH_SECRET`: a long random string, e.g. from `openssl rand -base64 32`
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: create a GitHub OAuth app at <https://github.com/settings/developers> with the callback URL `http://localhost:5173/api/auth/callback/github`
- `ALLOWED_EMAILS` (optional): comma-separated emails allowed to sign up

## Deploy to Cloudflare

Everything fits in Cloudflare's free plan. You need a Cloudflare account and a GitHub account.

### Before you deploy

1. **Pick the app's address.** By default it's `https://jobhunttrackr.<your-subdomain>.workers.dev`. Your subdomain is shown on the **Workers & Pages** page of the Cloudflare dashboard; if this is your first Worker, Cloudflare asks you to choose one. You can add your own domain later (see [Use your own domain](#use-your-own-domain)).
2. **Create a GitHub OAuth app** at <https://github.com/settings/developers> → **New OAuth app**. Use your address as the homepage URL and `<your address>/api/auth/callback/github` as the callback URL. Note the client ID, then click **Generate a new client secret** and note that too. Use a separate app from the one for local development, since each app has one callback URL.
3. **Make a secret** for signing sign-ins: a long random string, e.g. from `openssl rand -base64 32`.

### One click

Click **Deploy to Cloudflare** at the top of this page. Cloudflare copies this repository into your GitHub account, creates the database and asks for these values:

| Name                   | Value                                                                     |
| ---------------------- | ------------------------------------------------------------------------- |
| `ORIGIN`               | Your address, e.g. `https://jobhunttrackr.example.workers.dev`            |
| `BETTER_AUTH_SECRET`   | The random string                                                         |
| `GITHUB_CLIENT_ID`     | From the GitHub app                                                       |
| `GITHUB_CLIENT_SECRET` | From the GitHub app                                                       |
| `ALLOWED_EMAILS`       | Optional. Leave empty so only the first person to sign in gets an account |

If you change the project name on that page, your address changes to match, so update `ORIGIN` and the GitHub app's URLs.

When the deploy finishes, open your address and sign in with GitHub. The first account to sign in becomes the owner. Then [connect Claude](#connect-claude) to `<your address>/mcp`.

Cloudflare redeploys whenever your copy of the repository changes. To get updates from this project, pull them into your copy:

```sh
git remote add upstream https://github.com/unggun/jobhunttrackr.git   # once
git pull upstream main && git push
```

The deploy runs any new database migrations for you.

### From your computer

You don't create the Worker in the Cloudflare dashboard. The first deploy creates it, named `jobhunttrackr` after `name` in `wrangler.jsonc`. You don't need to edit `wrangler.jsonc` either: wrangler finds the database by its name, so `git pull` keeps working when you update.

1. Do the steps in [Before you deploy](#before-you-deploy).
2. `npm install && npx wrangler login`
3. Create the database: `npx wrangler d1 create jobhunttrackr`. If it asks whether to add it to `wrangler.jsonc`, answer no.
4. Set the secrets. Each command asks for the value, and if the Worker doesn't exist yet, it offers to create it:
   - `npx wrangler secret put ORIGIN`
   - `npx wrangler secret put BETTER_AUTH_SECRET`
   - `npx wrangler secret put GITHUB_CLIENT_ID` and `npx wrangler secret put GITHUB_CLIENT_SECRET`
   - Optional: `npx wrangler secret put ALLOWED_EMAILS`
5. Deploy: `npm run build && npm run deploy`. This creates the tables, then deploys.
6. Open your address and sign in with GitHub. The first account to sign in becomes the owner.

After pulling updates, run `npm install` and step 5 again.

If a deploy ever writes a `database_id` into `wrangler.jsonc` (wrangler does this when it has to create the database itself), you can discard it with `git checkout -- wrangler.jsonc`. Later deploys still find the database by name.

### Use your own domain

If your domain is on Cloudflare, open **Workers & Pages → jobhunttrackr → Settings → Domains & Routes → Add → Custom domain** and enter e.g. `jobs.example.com`. Cloudflare sets up DNS and HTTPS. Then:

1. Set `ORIGIN` to `https://jobs.example.com`: under **Settings → Variables and Secrets** in the dashboard, or with `npx wrangler secret put ORIGIN`.
2. Change the GitHub app's homepage and callback URLs to the new address.
3. Reconnect Claude with `https://jobs.example.com/mcp`.

## Development

| Command                     | What it does                                     |
| --------------------------- | ------------------------------------------------ |
| `npm run dev`               | Start the dev server with a local D1 database    |
| `npm test`                  | Run unit tests and data tests against a local D1 |
| `npm run check`             | Type-check                                       |
| `npm run lint`              | Prettier and ESLint                              |
| `npm run db:generate`       | Create a migration after changing the schema     |
| `npm run db:migrate`        | Apply migrations locally                         |
| `npm run db:migrate:remote` | Apply migrations to Cloudflare                   |
| `npm run deploy`            | Apply migrations to Cloudflare, then deploy      |
| `npm run auth:schema`       | Regenerate the auth tables after auth changes    |

Built with SvelteKit, Drizzle ORM, Better Auth and Tailwind CSS.

## License

MIT
