# Job Hunt Tracker

A free, open-source tracker for people applying to lots of jobs. It remembers where you applied, what you typed into each application form, where each application stands, and keeps a copy of the job posting so you can prepare for interviews after the posting is gone.

It runs on Cloudflare's free tier (Workers + D1), so you can host your own copy at no cost. It also has an MCP server, so Claude can check whether you already applied, and log the application and your form answers while it helps you fill in forms.

> **Status:** work in progress. Tracking, the board, interview prep, sign-in and the Claude connector work. A one-click deploy is next.

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

Open **Settings → Connectors → Add custom connector**, name it "Job Hunt Tracker" and paste `https://<your-app>/mcp` as the URL. Click **Connect**, sign in and click **Allow**. The connector then works in the Claude apps on all your devices.

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

You don't create the Worker in the Cloudflare dashboard. The first `wrangler deploy` creates it, named `jobhunttrackr` after `name` in `wrangler.jsonc`. You don't need to edit `wrangler.jsonc` either: wrangler finds the database by its name, so `git pull` keeps working when you update.

1. `npx wrangler login`
2. Create the database: `npx wrangler d1 create jobhunttrackr`. If it asks whether to add it to `wrangler.jsonc`, answer no.
3. Create the tables: `npm run db:migrate:remote`
4. Pick the app's address. Either:
   - **workers.dev (simplest):** run `npm run build && npx wrangler deploy`. It prints the address, `https://jobhunttrackr.<your-subdomain>.workers.dev`. If this is your first Worker, wrangler asks you to choose `<your-subdomain>` first.
   - **Your own domain**, if it's on Cloudflare: deploy as above, then in the Cloudflare dashboard open **Workers & Pages → jobhunttrackr → Settings → Domains & Routes → Add → Custom domain** and enter e.g. `jobs.example.com`. Cloudflare sets up DNS and HTTPS. Your address is then `https://jobs.example.com`.
5. Create a GitHub OAuth app at <https://github.com/settings/developers>. Use your address as the homepage URL and `<your address>/api/auth/callback/github` as the callback URL. Use a separate app from the one for local development, since each app has one callback URL.
6. Set the secrets. Each command asks for the value, and if the Worker doesn't exist yet, it offers to create it:
   - `npx wrangler secret put ORIGIN`: your address, e.g. `https://jobs.example.com`
   - `npx wrangler secret put BETTER_AUTH_SECRET`: a long random string, e.g. from `openssl rand -base64 32`
   - `npx wrangler secret put GITHUB_CLIENT_ID` and `npx wrangler secret put GITHUB_CLIENT_SECRET`: from the GitHub app
   - Optional: `npx wrangler secret put ALLOWED_EMAILS`
7. Deploy: `npm run build && npx wrangler deploy`
8. Open your address and sign in with GitHub. The first account to sign in becomes the owner.
9. Optional: [connect Claude](#connect-claude) to `<your address>/mcp`.

After pulling updates, run `npm run db:migrate:remote` and step 7 again.

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
| `npm run auth:schema`       | Regenerate the auth tables after auth changes    |

Built with SvelteKit, Drizzle ORM, Better Auth and Tailwind CSS.

## License

MIT
