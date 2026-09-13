# PRD — حزب محبين فرانك الجيزاوي (Frank El Gizawy Party)

## Original Problem Statement
Arabic (Egyptian) cyberpunk website + admin dashboard + (future) Discord bot for managing a Discord party/faction: applications, members, points, ranks, rules. Site is mysterious cyberpunk, Arabic-only RTL.

## Architecture
- Frontend: React 19 (CRA/craco), RTL Arabic, Tailwind + custom cyberpunk CSS, framer-motion, sonner, lucide-react. Pages: Home, Rules, Apply, Login, Admin.
- Backend: FastAPI single-file `server.py`, all routes under `/api`. JWT auth (httpOnly cookies + Bearer fallback), bcrypt.
- DB: MongoDB (collections: users, content, config[questions,settings], applications, members, ranks, logs, login_attempts).

## User Personas
- القايد بوني: sole admin, controls everything (extensible to moderators).
- Visitors/new members: read rules, submit application.

## Core Requirements (static)
- Public: landing, party rules, application form (Discord username + editable questions), fixed entry rules.
- Admin: secure login, review applications (approve/reject), edit rules & site text, manual points, ranks management, Discord bot settings.
- Discord bot (deferred): /حزب command, keyword detection w/ cooldown, application notifications (DM + channel), auto-role on approval, mysterious welcome, member points lookup.

## Implemented (2026-06)
- [x] JWT email+password auth, admin seeding, brute-force protection (login/me/logout/refresh)
- [x] Public content API + Home/Rules/Apply pages, cyberpunk RTL theme, live stats
- [x] Application submit + admin review (approve creates member + auto first rank / reject)
- [x] Members CRUD, manual points with auto rank recompute, ranks CRUD
- [x] Content & questions editor, Discord settings storage (token/IDs/welcome/cooldown)
- [x] Full test pass: backend 20/20, all frontend flows

## Backlog / Remaining
- P0: Connect real Discord bot (needs bot token + guild/channel/role IDs) — /حزب command, keyword detection+cooldown, new-application notifications (DM + channel), auto-role + welcome on approve, points lookup command.
- P1: Multiple moderators with roles; audit log UI (logs collection already populated).
- P2: Auto points by activity; stats/analytics dashboard.

## Next Tasks
- Gather Discord bot token + IDs from user, then implement bot connected to same backend.
