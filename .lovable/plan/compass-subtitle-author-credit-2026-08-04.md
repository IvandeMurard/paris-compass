# Compass subtitle + author credit

## What changes

1. **Subtitle under the Compass wordmark** in the header: a small one-line value proposition, e.g. "Find the right commercial space in Île-de-France, backed by open data." Shown under the logo, hidden on very small screens so the mobile header stays compact.

2. **"Made by Ivan de Murard" credit**: a discreet line on the right side of the header (next to the account menu), visible on desktop and hidden on mobile to avoid crowding.

## Technical notes

- Only `src/components/Header.tsx` is touched; the logo becomes a two-line stacked block (title + `text-xs text-muted-foreground` subtitle) inside the existing `Link`.
- Credit rendered as muted small text, using semantic tokens (no hardcoded colors).
- No data, routing, or business logic changes.

## Pre-existing build errors (unrelated to this request)

`src/pages/Profile.tsx` fails to typecheck because the `user_preferences` table it queries does not exist in the generated database types, so every column access resolves to `never`. This predates this request. Two ways forward, pick one and I'll fold it into the same pass:

- Create the `user_preferences` table (user_id, email_notifications, push_notifications) with grants and RLS scoped to the owner, which makes the existing code valid.
- Leave the database alone and make the Profile page store preferences locally, removing the failing queries.

## Open item

If you'd prefer the credit in a footer instead of the header, say so and I'll move it.
