# CampusConnect — Upgrade Guide & Go-Live Checklist

## ⚠️ Honest Assessment: Is it ready for live?

**Not quite yet — but very close.** Here's what was blocking you and what's now fixed:

| Issue | Before | After |
|---|---|---|
| Push notifications | Broken — no service worker, no VAPID | ✅ Real Web Push with SW + VAPID |
| Search (typos) | "phan" → 0 results | ✅ Fuzzy: phonetic variants + known misspellings |
| Admin role control | No UI | ✅ Promote/demote users in Users tab |
| Ad management | Manual DB editing | ✅ Full CRUD UI in Admin → Ads tab |
| Ad close button | Appeared immediately | ✅ 5-second countdown ring before close |
| Multiple ads | Only 1 per slot | ✅ Rotates through up to 5 ads per slot |
| Ad in feed | Only top banner | ✅ Injected every 8 items (full-width) |
| Recommendations | None | ✅ Category-based personalized section |
| Debug logs in AdBanner | Yes (console.log) | ✅ Removed |

### Still recommended before going live:
1. Remove your `.env` from version control if it's committed (add to `.gitignore`)
2. Set up Sentry properly (you have the DSN already)
3. Test on a real mobile device
4. Add a `robots.txt` and `sitemap.xml`
5. Set up Supabase rate limiting on your RPC functions
6. Add a `manifest.json` if you want PWA install on mobile

---

## 🔔 Setting Up Working Push Notifications

### Step 1 — Generate VAPID keys (one time only)
```bash
npx web-push generate-vapid-keys
```
This outputs:
```
Public Key: BNzS...
Private Key: abc123...
```

### Step 2 — Add to your `.env`
```env
VITE_VAPID_PUBLIC_KEY=BNzS...
```

### Step 3 — Add secrets to Supabase Edge Functions
Go to Supabase Dashboard → Edge Functions → Secrets and add:
- `VAPID_PUBLIC_KEY` = (same public key)
- `VAPID_PRIVATE_KEY` = (your private key)
- `VAPID_SUBJECT` = mailto:your@email.com

### Step 4 — Run the SQL migration
Open Supabase Dashboard → SQL Editor and paste the contents of:
`supabase/migrations/20260506_push_and_roles.sql`

### Step 5 — Deploy the Edge Function
```bash
supabase functions deploy send-push --no-verify-jwt
```

### Step 6 — Trigger push notifications from your app
Call the edge function from anywhere (e.g. when a message is received):
```javascript
await supabase.functions.invoke("send-push", {
  body: {
    user_id: recipientUserId,
    title: "New message",
    body: "Alex sent you a message",
    url: "/messages",
    tag: "msg-123",
  },
});
```

---

## 🎯 Ad System Setup

### Ad Slots Available
| Slot Key | Where it appears |
|---|---|
| `feed-top` | Above all listings on home/browse pages |
| `feed-mid-1` | After 8th listing card |
| `feed-mid-2` | After 16th listing card |
| `feed-mid-3` | After 24th listing card |
| `interstitial` | Full-screen overlay (call `<AdBanner slot="interstitial" />` where needed) |

### How to manage ads
Go to **Admin Panel → Ads** tab. You can:
- Create ads with title, body, image, video, CTA link
- Set start/end dates for time-limited promotions
- Set priority (higher = shown first when competing for the same slot)
- Toggle ads live/off without deleting them
- View impressions, clicks, dismisses, and CTR per ad

### Database columns needed (already in migration):
- `ads.cta_label` — button text (defaults to "Learn More")
- `ads.priority` — integer for ordering multiple ads in same slot

---

## 🔍 Search Improvements

The search now handles:
- **Typos**: "phan" → finds "phone", "labtop" → finds "laptop"
- **Phonetic variants**: "fone" → "phone", "blutooth" → "bluetooth"
- **Prefix matching**: "keybor" → finds "keyboard"
- **Cross-field**: searches both `title` and `description`

To improve further, enable **pg_trgm** in Supabase (for true trigram similarity):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS listings_title_trgm ON listings USING gin (title gin_trgm_ops);
```
Then update your `search_discovery_feed` RPC to use `similarity()`.

---

## 👥 Personalized Recommendations

Recommendations are powered by `useRecommendations.js` which tracks:
- Which categories the user browses
- Which listings they open

To show the recommendations section on the home page, add to your home page component:
```jsx
import RecommendedSection from "../components/Feed/RecommendedSection";
import { trackListingView } from "../hooks/useRecommendations";

// In your listing detail open handler:
const openDetailView = (listing) => {
  trackListingView(listing); // ← add this line
  navigate(`/listing/${listing.id}`, { state: { listing } });
};

// In your JSX (above the main feed):
<RecommendedSection onListingClick={openDetailView} />
```

---

## 🔐 Admin Role Management

In **Admin Panel → Users tab**, each user now has a **"Make Admin"** button.
- Click it to promote a user to admin
- Click "⭐ Admin" on an existing admin to revoke their access
- You cannot change your own role (safety guard)

If you get an RLS error, the `admin_set_user_role()` RPC in the migration will bypass it.
Change the AdminPanel call from:
```javascript
supabase.from("profiles").update({ role: newRole }).eq("id", userId)
```
to:
```javascript
supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: newRole })
```
