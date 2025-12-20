# Claude Code Instructions

## Project Overview
Personal website and party games platform built with Next.js 15.

## Before Committing
**ALWAYS check for secrets before committing:**
- API keys
- Database credentials
- Environment variables that should stay in .env
- Tokens, passwords, private keys

Files to watch:
- `.env`, `.env.local`, `.env.production`
- Any hardcoded URLs with credentials
- Config files with sensitive data

If secrets are found, add them to `.env.local` (gitignored) instead.

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Socket.IO for party games

## Styling
Use CSS variables from globals.css:
- `var(--foreground)` - dark text (#171717)
- `var(--muted)` - gray text (#6b7280)
- `var(--accent)` - red (#dc2626)
- `var(--border)` - light gray border (#e5e7eb)
- White backgrounds, minimal design

## Party Games
- Backend: party-games-server (Railway)
- Frontend: /party routes
- Socket server URL in NEXT_PUBLIC_GAME_SERVER_URL env var
