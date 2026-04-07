# Design Prompt: CPO Dashboard (same design as ION Admin)

Use this prompt when briefing another developer to build a **Charging Point Operator (CPO) dashboard** that looks and behaves like the existing ION admin dashboard, but with CPO-only features (no admin/organization-level management).

---

## Prompt (English)

**Build a web dashboard for a Charging Point Operator (CPO). The UI/UX and visual design must match the following reference exactly — same layout, components, colors, typography, and patterns. This is NOT an admin dashboard; it is for a single operator managing their own locations, chargers, connectors, sessions, and reports.**

### Tech stack (match exactly)

- **React 18** + **TypeScript**
- **Vite** for build and dev server
- **React Router v6**
- **Tailwind CSS** with CSS variables for theming
- **Radix UI** primitives: Dialog, Dropdown, Popover, Select, Tabs, Toast, Tooltip, Switch, Checkbox, Label, ScrollArea, etc.
- **shadcn/ui**-style components (Button, Card, Input, Badge, Sheet, Command, etc.) using the same class names and variants
- **Lucide React** for icons
- **next-themes** for light/dark mode (class-based)
- **Tailwind config**: `tailwindcss-animate` plugin; colors and radius from CSS variables (see below)
- **Font**: Inter (or system font stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`), base font size 14px

### Layout structure (identical)

1. **Full-height app**
   - `min-h-screen w-full bg-background`
   - Main content area: `ml-0 lg:ml-64` (sidebar is 256px / 64 in Tailwind on large screens)

2. **Sidebar (left, fixed on desktop)**
   - Width: `w-64` (256px) on `lg:` and up
   - On mobile: drawer/sheet overlay (e.g. Radix Sheet) opened by a hamburger in the header
   - Top block: logo + product name + short subtitle (e.g. "EV Charging"), with `border-b border-border`, padding `p-5`, `flex items-center gap-3`
   - Nav: vertical list, `space-y-1.5`, each item: icon (4x4) + label, `rounded-lg`, `px-2.5 py-2.5`, `text-sm`. Active state: `bg-primary text-primary-foreground font-medium`
   - Bottom block: separator (`border-t`), then e.g. Logout button
   - Sidebar background/foreground/border use CSS variables: `--sidebar-background`, `--sidebar-foreground`, `--sidebar-border`, `--sidebar-accent`, etc.

3. **Header (sticky top)**
   - `sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur`
   - Height: `h-16`, `flex items-center justify-between gap-2 px-4 sm:px-6`
   - On mobile: menu button (left), then title/search if needed, then right-aligned: theme toggle (sun/moon), notifications bell (optional), user avatar + dropdown (profile / logout)

4. **Main content**
   - Wrapper: `p-4 sm:p-6 lg:p-8`
   - Inner: `max-w-[1400px] mx-auto min-w-0`
   - Page content: `space-y-6` for vertical rhythm

### Color system (CSS variables — use these exact values)

**Light mode (`:root`):**

- `--background: 220 20% 97%;`
- `--foreground: 222 47% 11%;`
- `--card: 0 0% 100%;` `--card-foreground: 222 47% 11%;`
- `--primary: 213 89% 57%;` `--primary-foreground: 0 0% 100%;` (blue)
- `--secondary: 220 14% 96%;` `--secondary-foreground: 222 47% 11%;`
- `--muted: 220 14% 96%;` `--muted-foreground: 220 9% 46%;`
- `--accent: 213 89% 57%;` `--accent-foreground: 0 0% 100%;`
- `--destructive: 0 84% 60%;` `--destructive-foreground: 0 0% 100%;`
- `--border: 220 13% 91%;` `--input: 220 13% 91%;` `--ring: 213 89% 57%;`
- `--radius: 1rem;` (global border radius)
- Sidebar: `--sidebar-background: 0 0% 98%;` `--sidebar-foreground: 240 5.3% 26.1%;` `--sidebar-primary: 240 5.9% 10%;` `--sidebar-primary-foreground: 0 0% 98%;` `--sidebar-accent: 240 4.8% 95.9%;` `--sidebar-border: 220 13% 91%;`

**Dark mode (`.dark`):**

- `--background: 222 47% 11%;` `--foreground: 210 40% 98%;`
- `--card: 222 47% 14%;`
- `--primary` and `--accent` same blue; `--destructive` slightly darker; sidebar darker tones.

All colors are used as `hsl(var(--name))` in Tailwind (e.g. `bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`).

### Components and patterns (match reference)

- **Cards**: `Card`, `CardHeader`, `CardTitle`, `CardContent`; white/dark card background, subtle border, rounded with `var(--radius)`.
- **Buttons**: Primary (filled blue), secondary (outline), ghost; icon buttons with `size="icon"`. Use same padding and rounded corners.
- **Forms**: Label + Input/Select; inputs with `border-input`, focus ring `ring-ring`. Use Radix Select or a select component that matches the reference dropdown style.
- **Tables/Lists**: Tables in cards or bordered containers; header row with muted background; alternating or hover states for rows if in the reference.
- **Badges**: For status (e.g. online/offline, success/error); small, rounded, same color tokens (e.g. `destructive`, `success`).
- **Toasts/notifications**: Bottom-right or top-right, same styling as reference (e.g. sonner or Radix Toast).
- **Command palette (optional)**: Cmd+K / Ctrl+K to open a search modal (e.g. cmdk) with the same styling as the rest of the app.

### CPO-specific scope (what this dashboard is)

- **Single-operator context**: One CPO (one organization or tenant). No “Organizations” or “Partner users” admin screens.
- **Typical sections**: Dashboard (overview, quick stats, maybe a simple map or charger status), Locations (my stations), Chargers, Connectors, Tariffs (my tariffs), Sessions / Monitoring (real-time sessions, maybe active sessions table), Reports (revenue, usage, exports), Support (e.g. maintenance tickets), Settings (profile, password, maybe API keys).
- **Sidebar nav**: Same visual style as the reference; only the menu items and routes are for CPO (no “Organizations”, “Users” admin, etc.). Keep icon + label, active state, and optional subtitle per item.
- **Auth**: Login/logout; user displayed in header; no role switcher or admin-only UI.

### Deliverables

1. A React + Vite + TypeScript app that builds and runs.
2. Same layout (sidebar + header + main), same CSS variables and Tailwind theme, same component look and feel as described.
3. CPO-facing pages and routes only (no admin/organization management).
4. Light and dark mode using the same variables and next-themes (or equivalent class-based toggle).

### Reference

The design reference is the ION admin dashboard (React, Vite, Tailwind, Radix/shadcn, same color tokens and layout). Match its visual design and interaction patterns exactly; only the scope of features and navigation items differ (CPO-only, no admin).

---

## نسخة عربية مختصرة (للمرجع)

المطلوب: **داشبورد لمشغّل نقاط الشحن (CPO)** بنفس تصميم داشبورد ION الحالي (ألوان، خط، تخطيط، سايدبار، هيدر، كروت، أزرار، فورم، جداول)، مع:
- نفس الـ stack: React + Vite + TypeScript + Tailwind + Radix/shadcn + Lucide + next-themes.
- نفس الـ layout: سايدبار ثابت 64، هيدر ثابت، محتوى رئيسي بـ padding و max-width 1400px.
- نفس الـ CSS variables للألوان والـ radius (اللي فوق).
- الفرق: القائمة والصفحات تكون خاصة بالـ CPO فقط (مواقعي، شواحني، كونيكتورز، تعرفات، جلسات، تقارير، إعدادات) بدون شاشات أدمن (منظمات، مستخدمين شركاء، إلخ).

---

Save this file and share **the English “Prompt” section** (or the whole doc) with the developer who will build the CPO dashboard so they replicate the design exactly while implementing only CPO features.
