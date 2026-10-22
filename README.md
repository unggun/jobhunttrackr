# Job Hunt Tracker

A free, open-source tracker for people applying to lots of jobs. It remembers where you applied, what you typed into each application form, where each application stands, and keeps a copy of the job posting so you can prepare for interviews after the posting is gone.

It runs on Cloudflare's free tier (Workers + D1), so you can host your own copy at no cost. An MCP server is planned so Claude can log applications for you while it helps fill in forms.

> **Status:** work in progress. Tracking, the board, interview prep and sign-in work. The MCP server for Claude and a one-click deploy are next.

## Features

- **List and board views** of your applications, with search, status filters and one-click status changes. Drag cards between columns on the board.
- **"Have I applied here?" warning** when you add a job whose posting link or company you already track.
- **Form answers** saved per application, each with a copy button for the next form that asks the same question.
- **Interview prep page** with the next round, the saved job posting, what you told them and notes from earlier rounds. It prints cleanly too.
- **Follow-up nudges** for applications with no news for two weeks, and upcoming interviews at the top of the list.
- Dark mode, a phone-friendly layout, and keyboard shortcuts: `N` adds an application and `/` jumps to search.

## What it tracks

- **Applications:** company, role, location, work mode, salary, posting link, application form link, source, resume version and notes.
- **Form answers:** each question from the application form and what you answered.
- **Status history:** saved, applied, screening, interviewing, offer, accepted, rejected, withdrawn or ghosted, with a timeline of every change.
- **Job posting copy:** the posting text, saved when you apply.
- **Interview rounds:** when, with whom, prep notes, feedback and outcome.

## Sign-in

You sign in on the app itself with GitHub, and stay signed in for 30 days. Only one account can be created: the first person to sign in becomes the owner. To allow more people, list their emails in `ALLOWED_EMAILS`.

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

1. `npx wrangler login`
2. `npx wrangler d1 create jobhunttrackr` and copy the `database_id` it prints into `wrangler.jsonc`, under `d1_databases`.
3. `npm run db:migrate:remote`
4. Create a second GitHub OAuth app whose callback URL is `https://<your-worker>.workers.dev/api/auth/callback/github`.
5. Set the secrets: `npx wrangler secret put BETTER_AUTH_SECRET`, and the same for `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `ORIGIN` (your workers.dev URL or custom domain).
6. `npm run build && npx wrangler deploy`

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
