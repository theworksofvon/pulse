# Pulse Frontend Dashboard Tasks

## Code Style Guidelines

**Keep it simple:**

- Less code > more code
- One clear purpose per component
- Don't duplicate yourself
- No abstractions until you have 3+ use cases
- Functions over classes where appropriate
- Compose components, don't build complex hierarchies

**Modular components:**

- Small, focused components are better for testing and maintenance
- Group page-specific components in feature folders
- Generic/reusable components go in `ui/` folder
- If a page has 3+ components, create a folder for it
- Avoid deep nesting - 2-3 levels max

**Pages vs Components:**

- **Pages (`pages/`)** are thin orchestration layers (~50-150 lines)
  - Fetch data from API
  - Manage route state/params
  - Compose feature components
  - Handle navigation
  - Minimal UI logic
- **Components (`components/{feature}/`)** contain the actual implementation
  - UI logic and presentation
  - User interactions
  - Reusable and testable in isolation

**Styling:**

- Use Tailwind CSS utility classes
- Extract repeated patterns only
- Dark theme colors from designs (neutral-950 through neutral-100)
- Accent: #3b82f6 (blue), success: #22c55e, error: #ef4444

**File naming:**

- Components: PascalCase (e.g., `Sidebar.tsx`)
- Utilities: camelCase (e.g., `apiClient.ts`)
- Pages: PascalCase (e.g., `Dashboard.tsx`)

---

## Phase 1: Project Setup

- [x] **Ensure Tailwind CSS is setup correctly**
  - Path: `trace-service/dashboard/pulse-dashboard/`
  - Ensure tailwind css is installed, configured, and working

- [x] **Install additional dependencies**
  - Run: `bun add react-router-dom recharts`

- [x] **Configure Tailwind**
  - File: `trace-service/dashboard/pulse-dashboard/tailwind.config.js`
  - Add custom colors (neutral 950-100, accent, success, error)
  - Add Inter font family
  - Set content paths to `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`

- [x] **Update index.css with Tailwind directives**
  - File: `trace-service/dashboard/pulse-dashboard/src/index.css`
  - Add: `@tailwind base; @tailwind components; @tailwind utilities;`
  - Add custom scrollbar styles in `@layer components`

- [x] **Add Inter font to index.html**
  - File: `trace-service/dashboard/pulse-dashboard/index.html`
  - Add Google Fonts link for Inter (400, 500, 600)

---

## Phase 2: Foundation

- [x] **Create AuthContext**
  - File: `trace-service/dashboard/pulse-dashboard/src/contexts/AuthContext.tsx`
  - Store `apiKey` in localStorage
  - Methods: `login(apiKey)`, `logout()`, `isAuthenticated()`
  - Export provider and useAuth hook

- [x] **Create apiClient**
  - File: `trace-service/dashboard/pulse-dashboard/src/lib/apiClient.ts`
  - Base URL from env or default to window.location.origin
  - Helper to add Authorization header from localStorage
  - Functions:
    - `getTraces(params)` - calls GET /v1/traces
    - `getTrace(id)` - calls GET /v1/traces/:id
    - `getSession(id)` - calls GET /v1/sessions/:id
    - `getAnalytics(params)` - calls GET /v1/analytics
    - `createProject(name)` - calls POST /admin/projects
  - Handle errors and throw with descriptive messages

- [x] **Create Layout component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/layout/Layout.tsx`
  - Outlet from react-router-dom
  - Main container: `flex h-screen bg-neutral-950 text-neutral-100`

- [x] **Create Sidebar component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/layout/Sidebar.tsx`
  - Logo section: h-14, border-b, gradient icon + "Pulse" text
  - Project selector button (triggers dropdown)
  - Nav items: Overview, Traces, Sessions, Analytics, API Keys, Settings
  - Active state: bg-accent/10 with left border
  - Hover: bg-neutral-850
  - User menu at bottom (dropdown with Account, Sign Out)
  - Reference: `designs/dashboard-design-2.html` lines 98-199

- [x] **Create ProtectedRoute component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/layout/ProtectedRoute.tsx`
  - Check useAuth().isAuthenticated()
  - Redirect to /login if false
  - Render children if true

- [x] **Set up router in App.tsx**
  - File: `trace-service/dashboard/pulse-dashboard/src/App.tsx`
  - Wrap in AuthProvider
  - Routes: /login, /, /traces, /traces/:id, /sessions, /sessions/:id, /analytics, /api-keys, /settings, /account
  - Wrap authenticated routes in ProtectedRoute with Layout

---

## Page: Login

- [x] **Create Login page**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/Login.tsx`
  - Centered card layout (max-w-md, mx-auto, mt-20)
  - Logo at top
  - Heading: "Sign in to Pulse"
  - API key input (type="password", placeholder="pulse*sk*...")
  - "Start monitoring" button (primary, full width)
  - On submit: validate non-empty, store in localStorage via auth, redirect to /
  - Error message below input if validation fails
  - Reference: `designs/login-design.html`

---

## Page: Dashboard (Overview)

- [x] **Create StatCard component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/dashboard/StatCard.tsx`
  - Props: label, value, change (optional, +/-%), period (e.g., "24h")
  - Layout: vertical flex, p-4
  - Hover: bg-neutral-900
  - Value: large text, neutral-100
  - Change: green if positive, red if negative
  - Period label: small, neutral-500

- [x] **Create TimeRangeTabs component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/dashboard/TimeRangeTabs.tsx`
  - Tabs: 24h, 7d, 30d
  - Active: bg-neutral-800 text-white
  - Inactive: text-neutral-500 hover:text-neutral-300
  - On change: calls parent callback with range

- [x] **Create Dashboard page shell**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/Dashboard.tsx`
  - Page title: "Overview"
  - TimeRangeTabs at top
  - Grid of 4 StatCards: Total Requests, Total Cost, Avg Latency, Error Rate
  - Fetch analytics data based on time range

- [x] **Implement stats data fetching in Dashboard**
  - Use getAnalytics() with appropriate date range
  - Calculate stats from response:
    - Total Requests: sum of trace counts
    - Total Cost: sum cost_cents
    - Avg Latency: average latency_ms
    - Error Rate: (error / total) \* 100
  - Handle loading/error states

- [x] **Add Recent Traces table to Dashboard**
  - Table with columns: Time, Provider, Model, Status, Latency, Cost
  - Limit to 10 most recent
  - Click row → navigate to /traces/:id
  - Status badge: green for success, red for error
  - Reference: `designs/dashboard-design-2.html` lines 400-500

---

## Page: Traces Explorer

- [x] **Create TracesPage shell**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/Traces.tsx`
  - Header: "Traces" title + refresh button
  - Two-column layout: filters sidebar (left), table (right)

- [x] **Create FilterSidebar component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/traces/FilterSidebar.tsx`
  - Provider filter: select dropdown (all, openai, anthropic, openrouter)
  - Model filter: text input with autocomplete
  - Status filter: select (all, success, error)
  - Date range: two date inputs (from, to)
  - Session ID: text input
  - "Apply filters" button
  - "Clear filters" button

- [x] **Create TracesTable component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/traces/TracesTable.tsx`
  - Props: traces[], onRowClick
  - Columns: Timestamp, Provider, Model, Status, Latency, Tokens, Cost
  - Sortable headers (click to sort)
  - Row hover: bg-neutral-850
  - Status badge with color
  - Error rows: subtle red bg
  - Truncate long text with ellipsis
  - Reference: `designs/traces-design.html`

- [x] **Add pagination to TracesTable**
  - Prev/Next buttons
  - Page indicator: "Page X of Y"
  - Limit selector: 25, 50, 100 per page
  - Disable Prev on first page, Next on last

- [x] **Implement traces data fetching**
  - Use getTraces() with filter params
  - Parse URL params for initial filters
  - Update URL on filter change
  - Handle loading/error/empty states
  - Refetch on filter/pagination change

- [x] **Add selected trace detail panel**
  - Slide-in panel from right when row clicked
  - Shows full trace details
  - Close button
  - Alternative: navigate to /traces/:id

---

## Page: Trace Detail

- [x] **Create TraceDetail page**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/TraceDetail.tsx`
  - Fetch trace by id from URL params
  - Show 404 if not found

- [x] **Create TraceHeader component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/traces/TraceHeader.tsx`
  - Trace ID (copy button)
  - Status badge (large)
  - Timestamp (formatted)
  - Provider + model badges
  - Back to Traces button

- [x] **Create TraceMetadata component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/traces/TraceMetadata.tsx`
  - Grid layout: 2 columns
  - Fields: Latency, Input Tokens, Output Tokens, Total Tokens, Cost, Finish Reason, Session ID
  - Labels: neutral-500, values: neutral-100

- [x] **Create JsonViewer component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/traces/JsonViewer.tsx`
  - Props: data, title
  - Collapsible sections
  - Syntax highlighted JSON (pre + code)
  - Copy button
  - Use for request_body and response_body

- [x] **Assemble TraceDetail page**
  - Top: TraceHeader
  - Middle: TraceMetadata
  - Bottom: Two JsonViewer side by side (Request, Response)
  - Handle error traces (show error object instead of response)

---

## Page: Sessions

- [x] **Create Sessions page shell**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/Sessions.tsx`
  - Header: "Sessions" title
  - Single column: sessions list

- [x] **Create SessionsTable component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/sessions/SessionsTable.tsx`
  - Fetch all sessions (needs backend endpoint or derive from traces)
  - Columns: Session ID, Trace Count, First Seen, Last Seen, Duration
  - Click row → navigate to /sessions/:id
  - Empty state: "No sessions found"
  - Reference: `designs/sessions-design.html`

- [x] **Create SessionDetail page**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/SessionDetail.tsx`
  - Fetch session traces via getSession(sessionId)
  - Header: Session ID + metadata
  - Traces timeline: vertical list with connecting line
  - Each trace: summary card (model, status, latency)
  - Click trace → open TraceDetail modal or navigate

- [x] **Add session statistics**
  - Total traces in session
  - Total cost
  - Total duration
  - Error count
  - Display in header section

---

## Page: Analytics

- [x] **Create Analytics page shell**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/Analytics.tsx`
  - Header: date range picker (presets: Today, 7d, 30d, Custom)
  - Group by selector: Day, Hour, Model, Provider
  - Charts grid: 2x2 layout

- [x] **Create DateRangePicker component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/analytics/DateRangePicker.tsx`
  - Preset buttons: 24h, 7d, 30d
  - Custom: two date inputs
  - "Apply" button

- [x] **Create CostChart component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/analytics/CostChart.tsx`
  - Use recharts LineChart
  - X-axis: time (grouped by selection)
  - Y-axis: cost (cents or dollars)
  - Tooltip with exact values
  - Responsive width

- [x] **Create TokenUsageChart component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/analytics/TokenUsageChart.tsx`
  - Use recharts BarChart
  - Stacked bars: input + output tokens
  - X-axis: time
  - Y-axis: tokens
  - Different color per model (if grouped by model)

- [x] **Create LatencyChart component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/analytics/LatencyChart.tsx`
  - Use recharts LineChart or AreaChart
  - Show p50, p95, p99 latency
  - Y-axis: milliseconds

- [x] **Create ErrorRateChart component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/analytics/ErrorRateChart.tsx`
  - Use recharts LineChart
  - Y-axis: percentage
  - Highlight error spikes

- [x] **Implement analytics data fetching**
  - Use getAnalytics(dateFrom, dateTo, groupBy)
  - Parse response for each chart
  - Handle loading/error states
  - Refetch on date range or group by change
  - Reference: `designs/analytics-design.html`

---

## Page: API Keys

- [x] **Create ApiKeys page shell**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/ApiKeys.tsx`
  - Header: "API Keys" + "Create new key" button
  - Keys list below

- [x] **Create ApiKeyList component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/api-keys/ApiKeyList.tsx`
  - Table or card list
  - Each key shows: name, created date, last used (optional), key (masked)
  - Actions: Copy, Delete
  - Empty state: "No API keys"

- [x] **Create ApiKeyCard component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/api-keys/ApiKeyCard.tsx`
  - Key name (editable)
  - Created at date
  - Full key (revealed on click, masked by default: `pulse_sk_***`)
  - Copy button (copies to clipboard)
  - Delete button (confirms dialog)

- [x] **Create CreateApiKeyModal component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/api-keys/CreateApiKeyModal.tsx`
  - Name input
  - "Create" button
  - On success: show full key once, copy button, "Done" button
  - Use createProject() API

- [x] **Implement API keys CRUD**
  - Fetch keys on mount
  - Create new key via modal
  - Copy key to clipboard
  - Delete key with confirmation
  - Reference: `designs/api-keys-design.html`

---

## Page: Settings

- [x] **Create Settings page shell**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/Settings.tsx`
  - Header: "Settings"
  - Sections: Project, Danger Zone

- [x] **Create ProjectSettings component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/settings/ProjectSettings.tsx`
  - Project name (editable)
  - Project ID (read-only, copy button)
  - Created at date
  - Save button

- [x] **Create DangerZone component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/settings/DangerZone.tsx`
  - Red border/bg
  - "Delete project" button
  - Confirmation modal: type project name to confirm
  - Warning text about data loss

- [x] **Implement settings persistence**
  - Fetch current project info
  - Update project name
  - Delete project with confirmation
  - Reference: `designs/settings-design.html`

---

## Page: Account

- [x] **Create Account page shell**
  - File: `trace-service/dashboard/pulse-dashboard/src/pages/Account.tsx`
  - Header: "Account"
  - User info section
  - Actions section

- [x] **Create UserInfo component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/account/UserInfo.tsx`
  - Email (from login or JWT)
  - Name (optional, editable)
  - Avatar with initials

- [x] **Create AccountActions component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/account/AccountActions.tsx`
  - "Sign out" button
  - Calls auth.logout()
  - Redirects to /login

- [x] **Implement account page**
  - Display user info from localStorage or API
  - Handle logout
  - Reference: `designs/account-design.html`

---

## Phase 3: Shared Components & Polish

- [x] **Create Modal component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/ui/Modal.tsx`
  - Props: isOpen, onClose, title, children
  - Backdrop overlay (click to close)
  - Escape key to close
  - Focus trap
  - Used by CreateApiKeyModal, confirm dialogs, etc.

- [x] **Create NotFound page**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/ui/NotFound.tsx`
  - "404 - Page not found"
  - "Go to Dashboard" button

- [x] **Create ErrorBoundary component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/ui/ErrorBoundary.tsx`
  - Catches React errors
  - Shows friendly error message
  - "Retry" button

- [x] **Create LoadingSpinner component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/ui/LoadingSpinner.tsx`
  - Simple spinner icon
  - Optional text prop

- [x] **Create StatusBadge component**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/ui/StatusBadge.tsx`
  - Props: status ("success" | "error")
  - Green badge for success, red for error
  - Small, rounded, pill shape

- [x] **Add loading states to all pages**
  - Show spinner while fetching
  - Skeleton screens for tables

- [x] **Add error handling to all pages**
  - Show error message on fetch failure
  - Retry button

- [x] **Create toast notification system**
  - File: `trace-service/dashboard/pulse-dashboard/src/components/ui/Toast.tsx`
  - Success, error, info variants
  - Auto-dismiss after 3s
  - Use for: key copied, saved, deleted, etc.

---

## Phase 4: Build & Deploy

- [x] **Update package.json build script**
  - File: `trace-service/dashboard/pulse-dashboard/package.json`
  - Add postbuild: `mkdir -p ../../static && cp -r dist ../../static/dashboard`

- [x] **Or update Makefile**
  - File: `trace-service/Makefile`
  - In `build` target, add: `mkdir -p static && cp -r dashboard/pulse-dashboard/dist static/dashboard`

- [x] **Test build locally**
  - Run: `cd trace-service && make build`
  - Verify `static/dashboard/` exists with index.html
  - Run: `bun run index.ts`
  - Visit: http://localhost:3000/dashboard
  - Test all pages and navigation

- [ ] **Verify production build**
  - Check console for errors
  - Verify API calls work
  - Test auth flow
  - Check responsive layout

---

## References

### Visual Design Guidelines

**When implementing any UI component or page:**

- Use the HTML design files in `/designs/` as the **visual reference**
- Match the layout, spacing, colors, typography, and component structure
- Copy Tailwind classes from the designs where applicable
- Designs show the exact visual appearance - follow them closely
- **Do NOT copy JavaScript logic or implementation patterns** from designs
- Designs are for **visual/styling reference only**, not code structure

**Design reference files:**

- `designs/login-design.html` - Login page styling
- `designs/dashboard-design-2.html` - Dashboard overview styling
- `designs/traces-design.html` - Traces explorer styling
- `designs/sessions-design.html` - Sessions page styling
- `designs/analytics-design.html` - Analytics charts styling
- `designs/api-keys-design.html` - API Keys page styling
- `designs/settings-design.html` - Settings page styling
- `designs/account-design.html` - Account page styling

### Expected File Structure (After Implementation)

```
pulse/
├── designs/                          # HTML design references (already exists)
│   ├── login-design.html
│   ├── dashboard-design-2.html
│   ├── traces-design.html
│   ├── sessions-design.html
│   ├── analytics-design.html
│   ├── api-keys-design.html
│   ├── settings-design.html
│   └── account-design.html
│
├── shared/                           # Shared types & validation (already exists)
│   └── validation.ts
│
├── sdk/                              # SDK (already exists)
│
├── trace-service/
│   └── dashboard/
│       └── pulse-dashboard/
│           ├── tailwind.config.js    # ⭐ NEW
│           ├── postcss.config.js     # ⭐ NEW
│           │
│           └── src/
│               ├── main.tsx          # Entry point (already exists)
│               ├── App.tsx           # Router setup (UPDATE)
│               ├── index.css         # Tailwind directives (UPDATE)
│               │
│               ├── contexts/         # ⭐ NEW
│               │   └── AuthContext.tsx
│               │
│               ├── lib/              # ⭐ NEW
│               │   └── apiClient.ts
│               │
│               ├── components/       # ⭐ NEW (modular structure)
│               │   ├── ui/              # Generic reusable components
│               │   │   ├── StatusBadge.tsx
│               │   │   ├── LoadingSpinner.tsx
│               │   │   ├── Toast.tsx
│               │   │   ├── ErrorBoundary.tsx
│               │   │   ├── NotFound.tsx
│               │   │   └── Modal.tsx
│               │   │
│               │   ├── layout/          # Layout components
│               │   │   ├── Layout.tsx
│               │   │   ├── Sidebar.tsx
│               │   │   └── ProtectedRoute.tsx
│               │   │
│               │   ├── dashboard/       # Dashboard-specific components
│               │   │   ├── StatCard.tsx
│               │   │   └── TimeRangeTabs.tsx
│               │   │
│               │   ├── traces/          # Traces page components
│               │   │   ├── FilterSidebar.tsx
│               │   │   ├── TracesTable.tsx
│               │   │   ├── TraceHeader.tsx
│               │   │   ├── TraceMetadata.tsx
│               │   │   └── JsonViewer.tsx
│               │   │
│               │   ├── sessions/        # Sessions page components
│               │   │   └── SessionsTable.tsx
│               │   │
│               │   ├── analytics/       # Analytics page components
│               │   │   ├── DateRangePicker.tsx
│               │   │   ├── CostChart.tsx
│               │   │   ├── TokenUsageChart.tsx
│               │   │   ├── LatencyChart.tsx
│               │   │   └── ErrorRateChart.tsx
│               │   │
│               │   ├── api-keys/        # API Keys page components
│               │   │   ├── ApiKeyCard.tsx
│               │   │   ├── ApiKeyList.tsx
│               │   │   └── CreateApiKeyModal.tsx
│               │   │
│               │   ├── settings/        # Settings page components
│               │   │   ├── ProjectSettings.tsx
│               │   │   └── DangerZone.tsx
│               │   │
│               │   └── account/         # Account page components
│               │       ├── UserInfo.tsx
│               │       └── AccountActions.tsx
│               │
│               └── pages/            # ⭐ NEW
│                   ├── Login.tsx
│                   ├── Dashboard.tsx
│                   ├── Traces.tsx
│                   ├── TraceDetail.tsx
│                   ├── Sessions.tsx
│                   ├── SessionDetail.tsx
│                   ├── Analytics.tsx
│                   ├── ApiKeys.tsx
│                   ├── Settings.tsx
│                   ├── Account.tsx
│                   └── NotFound.tsx
```

**Legend:**

- ⭐ NEW = File/folder to create
- UPDATE = Modify existing file
- Everything else = Already exists, don't touch

### Design Files

- `designs/login-design.html` - Login page
- `designs/dashboard-design-2.html` - Dashboard overview
- `designs/traces-design.html` - Traces explorer + filters
- `designs/sessions-design.html` - Sessions list + detail
- `designs/analytics-design.html` - Analytics charts
- `designs/api-keys-design.html` - API key management
- `designs/settings-design.html` - Settings page
- `designs/account-design.html` - Account page

### Backend API Endpoints

- `GET /health` - Health check
- `POST /admin/projects` - Create project/api key (admin auth required)
- `GET /v1/traces` - List traces (params: session_id, provider, model, status, date_from, date_to, limit, offset)
- `GET /v1/traces/:id` - Single trace details
- `GET /v1/sessions/:id` - Session with traces
- `GET /v1/analytics` - Analytics (params: date_from, date_to, group_by)

### Shared Types

- `Trace` - trace_id, timestamp, provider, model_requested, model_used, latency_ms, status, cost_cents, session_id, metadata
- `Provider` - "openai" | "anthropic" | "openrouter"
- `TraceStatus` - "success" | "error"

### Color Scheme

```css
neutral-950: #0a0a0a  /* main background */
neutral-900: #141414  /* cards, table rows */
neutral-850: #1a1a1a  /* hover states */
neutral-800: #1f1f1f
neutral-700: #2e2e2e  /* borders */
neutral-600: #3d3d3d
neutral-500: #525252  /* placeholder text */
neutral-400: #737373
neutral-300: #a3a3a3
neutral-200: #d4d4d4
neutral-100: #f5f5f5  /* primary text */
accent: #3b82f6       /* primary actions, active states */
success: #22c55e      /* success status */
error: #ef4444        /* error status */
```
