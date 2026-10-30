# AtomicTask client

AtomicTask is a responsive task workspace backed by the AtomicTask REST API.

## Setup

```sh
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the backend origin including `/api/v1`. The server
mounts auth routes at `/api/v1/auth`, so the local value should be
`http://localhost:8080/api/v1` while the deployed backend should use
`https://ssbat.onrender.com/api/v1` when applicable. On Vercel, configure
`VITE_API_BASE_URL=https://ssbat.onrender.com/api/v1` for production deployments.
On Render, configure `CORS_ORIGINS=https://ssbat.vercel.app` (comma-separated for
additional trusted origins). The server also allows `http://localhost:5173` by
default for local development. Production builds are static: `npm run build`.

## Quality checks

Run `npm run lint` and `npm run build` before deployment. The client uses React,
Vite, Axios, React Router, accessible local UI primitives, and cancellable API
requests for search.

## API assumptions

Task screens use `/tasks`, `/tasks/:id`, `/tasks/stats`, `/tasks/trash`, CRUD,
restore/permanent delete, bulk operations, comments, and subtasks. The backend
currently implements bulk update as `POST /tasks/bulk-update`; the client follows
that route. There is no user directory endpoint, so assignees are entered as
comma-separated user IDs and populated names are displayed when returned by the API.

## Authentication security

The existing JWT flow stores the token in `localStorage` because the backend has
no refresh endpoint. This is vulnerable to token theft if an XSS vulnerability is
introduced; React escaping and input validation reduce that risk, but an HttpOnly
cookie-based session is preferable for a future backend revision. The Axios
response interceptor clears expired tokens and redirects on HTTP 401.
