# web/ — Next.js 15 Frontend Standards

Next.js 15 App Router + TypeScript + Clerk. All pages in `src/app/(app)/`.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Auth | Clerk (`@clerk/nextjs`) |
| Styling | Tailwind CSS |
| State | React hooks + SWR for server data |
| Streaming | EventSource (SSE) for AI responses |

---

## Directory Structure

```
web/src/
├── app/
│   ├── layout.tsx                             # Root layout — ClerkProvider
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx    # Clerk sign-in
│   │   └── sign-up/[[...sign-up]]/page.tsx    # Clerk sign-up
│   └── (app)/                                 # Authenticated routes
│       └── workspace/[workspaceSlug]/
│           ├── layout.tsx                     # Workspace layout — loads workspace
│           ├── plan/page.tsx                  # Planning Mode
│           ├── engineer/page.tsx              # Engineer daily brief
│           ├── specs/[specId]/page.tsx        # Spec detail
│           └── tickets/[ticketId]/page.tsx    # Ticket detail + AI assistant
├── components/
│   ├── planning-chat.tsx                      # SSE streaming chat UI
│   ├── ticket-assistant.tsx                   # SSE streaming ticket chat
│   └── ui/                                    # Reusable UI primitives
├── lib/
│   ├── api.ts                                 # Fetch wrapper — attaches Clerk token
│   └── types.ts                               # Shared TypeScript types
└── providers/
    └── clerk-provider.tsx                     # ClerkProvider wrapper
```

---

## Auth: Clerk

All auth is handled by Clerk. Never build custom auth flows.

### Root Layout

```tsx
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### Sign In / Sign Up Pages

```tsx
// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

### Middleware (protect all app routes)

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
}
```

---

## API Client

All API calls go through `src/lib/api.ts`. This wrapper attaches the Clerk session token automatically.

```typescript
// src/lib/api.ts
import { auth } from "@clerk/nextjs/server"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

async function getAuthHeaders(): Promise<HeadersInit> {
  const { getToken } = await auth()
  const token = await getToken()
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (!res.ok) throw new ApiError(await res.json(), res.status)
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ApiError(await res.json(), res.status)
  return res.json()
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ApiError(await res.json(), res.status)
  return res.json()
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers })
  if (!res.ok) throw new ApiError(await res.json(), res.status)
}

export class ApiError extends Error {
  constructor(public readonly body: unknown, public readonly status: number) {
    super(`API error ${status}`)
  }
}
```

### Client-side API calls (from Client Components)

```typescript
// src/lib/api-client.ts — for use in Client Components
import { useAuth } from "@clerk/nextjs"

export function useApiClient() {
  const { getToken } = useAuth()

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  }

  return { apiFetch }
}
```

---

## SSE Streaming (Planning Mode)

```tsx
// src/components/planning-chat.tsx
"use client"

import { useState, useRef } from "react"
import { useAuth } from "@clerk/nextjs"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface PlanningChatProps {
  workspaceSlug: string
  conversationId: string
}

export function PlanningChat({ workspaceSlug, conversationId }: PlanningChatProps) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function sendMessage() {
    if (!input.trim() || streaming) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setStreaming(true)

    const token = await getToken()
    const controller = new AbortController()
    abortRef.current = controller

    let assistantContent = ""
    setMessages(prev => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/workspaces/${workspaceSlug}/ai/plan`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: { message: userMessage, conversation_id: conversationId } }),
          signal: controller.signal,
        }
      )

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split("\n")
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6))

          if (data.type === "chunk") {
            assistantContent += data.content
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: "assistant", content: assistantContent }
            ])
          } else if (data.type === "spec_created") {
            // Spec was generated — could trigger a refresh of the specs list
            console.log("Spec created:", data.spec)
          } else if (data.type === "done") {
            break
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Something went wrong. Please try again." }
        ])
      }
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl rounded-lg px-4 py-2 ${
              msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Describe the feature you want to build..."
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {streaming ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## TypeScript Types

```typescript
// src/lib/types.ts

export interface User {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: "free" | "pro" | "enterprise"
  owner: User
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: "active" | "paused" | "archived"
}

export interface Spec {
  id: string
  title: string
  content: string
  status: "draft" | "review" | "approved" | "archived"
  aiGenerated: boolean
  createdBy: User
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id: string
  title: string
  description: string | null
  status: "backlog" | "todo" | "in_progress" | "in_review" | "done"
  priority: "critical" | "high" | "medium" | "low"
  priorityScore: number | null
  storyPoints: number | null
  position: number
  assignee: User | null
  specId: string | null
}

export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: {
    message: string
    code: string
    details: Record<string, unknown>
  }
}
```

---

## Rules

1. **All pages in `src/app/` use the App Router** — no `pages/` directory
2. **Server Components by default** — add `"use client"` only when you need browser APIs, hooks, or interactivity
3. **Clerk auth in Server Components** — use `auth()` from `@clerk/nextjs/server`
4. **Clerk auth in Client Components** — use `useAuth()` hook
5. **No `fetch` outside of `src/lib/api.ts` or `src/lib/api-client.ts`** — always go through the auth wrapper
6. **`process.env.NEXT_PUBLIC_API_URL`** is the only API base URL — never hardcode
7. **TypeScript strict mode** — no `any` types; use `unknown` and narrow
8. **Tailwind only** — no inline `style={{}}` except for dynamic values that can't be expressed in Tailwind
9. **Error boundaries** around AI streaming components
10. **Loading states** for all async data — never render empty states without a loading indicator

---

## Environment Variables

```bash
# .env.local (not committed)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```
