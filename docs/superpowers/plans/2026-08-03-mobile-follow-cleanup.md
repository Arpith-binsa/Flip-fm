# Mobile Responsiveness + Follow System + UserProfile Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix mobile layout breakage on Dashboard/MyProfile/Explore/PublicProfile, add a Supabase-backed follow/unfollow system with RLS and server-side rate limiting, and remove the dead `UserProfile.jsx` page.

**Architecture:** Tailwind mobile-first responsive classes (base = mobile, `sm:`/`md:` override for larger screens) for the UI fixes. A new `follows` table with RLS policies plus a Postgres trigger enforces the 30-follows-per-minute limit and self-follow prevention server-side (client-side checks alone are bypassable). A small pure-logic module (`followRules.js`) carries the client-side self-follow guard and gets a real Vitest unit test, matching the project's existing test convention (`src/bridge/__tests__/*.test.js` — pure logic only, no component/RTL tests exist in this repo).

**Tech Stack:** React 18 + Vite, Tailwind CSS (no custom breakpoints configured — default `sm`/`md`/`lg` only), Supabase (Postgres + Auth), react-router-dom v7, lucide-react icons, Vitest (jsdom, `src/**/__tests__/**/*.test.js` only).

**Verified constraints (checked against the live code, not assumed):**
- Dashboard.jsx:296 and :356 already contain the exact required strings `People with similar taste.` and `People with different taste. Break your echo chamber.` — do not touch these lines.
- Dashboard.jsx:106-121 `handleFeelingLucky` and the Feeling Lucky modal (lines 410-447) must stay working — do not remove.
- LikeButton.jsx is untouched by this plan — the follow system is fully separate (own table, own component).
- Dashboard.jsx:19,42-45 (`showEasterEgg` / Eminem check) is currently set but never rendered anywhere in the file (confirmed via grep — no other JSX reads `showEasterEgg`). It's already a no-op today. Leave these exact lines untouched; do not "fix" or wire it up, that's out of scope.
- `UserProfile.jsx` is dead: imported in `App.jsx:11` but never given a `<Route>` (confirmed via `grep -rn "UserProfile" src`). Safe to delete outright — no merge needed, `PublicProfile.jsx` already covers the same feature (and more: match score, like button).
- `MyProfile.jsx:304`'s profile-details grid is already `grid-cols-1 md:grid-cols-3` (correctly responsive already). The real mobile breakage in that file is the two `flex justify-between items-center` headers (lines 242, 401) and the search overlay heading (line 484, currently `text-4xl md:text-6xl` — still too large as the *mobile* base size per the spec).
- No `supabase/migrations` directory exists in this repo; the one existing SQL reference (`supabase/functions/send-like-notification/index.ts`) is just a raw SQL comment kept for documentation, run manually via the Supabase SQL editor. This plan follows that same convention: a standalone `.sql` file, not a migration.
- `vibes` table columns actually used in code: `user_id, slot_number, album_id, album_title, album_artist, album_cover, album_genres`. No confirmed `created_at`/`updated_at` column on `vibes` (only `profiles.updated_at` and `likes.created_at` are used anywhere) — the Following feed task deliberately avoids depending on an unconfirmed column by ordering on `follows.created_at` instead (a column we are creating and control).
- Postgres auto-generates FK constraint names as `<table>_<column>_fkey` for inline `REFERENCES` (confirmed pattern already in use: `likes_liker_id_fkey` in Dashboard.jsx:49) — so `follows_following_id_fkey` / `follows_follower_id_fkey` are the real names the embedded-select syntax needs.

---

## Task 1: Dashboard.jsx mobile responsiveness

**Files:**
- Modify: `src/pages/Dashboard.jsx:142-174` (header)
- Modify: `src/pages/Dashboard.jsx:306-345` (Sync Matches cards)
- Modify: `src/pages/Dashboard.jsx:366-405` (Flipside Matches cards)

- [ ] **Step 1: Fix the header so title + buttons stack on mobile instead of overflowing**

Replace:

```jsx
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors">
              FLIP-FM
            </Link>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                Your Crate
              </h1>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">
                Welcome back, @{currentUser?.username}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowLuckyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full transition-all text-xs uppercase tracking-widest font-bold shadow-lg"
            >
              <Sparkles size={14} />
              Feeling Lucky
            </button>
            <button
              onClick={() => navigate("/my-profile")}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-xs uppercase tracking-widest font-bold"
            >
              <Settings size={14} />
              Edit Crate
            </button>
          </div>
        </div>
      </header>
```

With:

```jsx
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-8 text-center sm:text-left">
            <Link to="/dashboard" className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors">
              FLIP-FM
            </Link>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">
                Your Crate
              </h1>
              <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mt-1">
                Welcome back, @{currentUser?.username}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => setShowLuckyModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full transition-all text-[10px] sm:text-xs uppercase tracking-widest font-bold shadow-lg whitespace-nowrap"
            >
              <Sparkles size={14} />
              Feeling Lucky
            </button>
            <button
              onClick={() => navigate("/my-profile")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-[10px] sm:text-xs uppercase tracking-widest font-bold whitespace-nowrap"
            >
              <Settings size={14} />
              Edit Crate
            </button>
          </div>
        </div>
      </header>
```

- [ ] **Step 2: Fix Sync Matches cards so avatar/score/like-button don't squish on mobile**

Replace:

```jsx
              {syncMatches.map((user) => (
                <Link
                  to={`/u/${user.username}`}
                  key={user.id}
                  className="group flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:bg-white/5 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tighter uppercase group-hover:text-green-400 transition-colors">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2 w-16 h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                      <div className="text-4xl font-black text-green-400">{user.matchScore}%</div>
                    </div>
                    <LikeButton likedUserId={user.id} likedUsername={user.username} />
                  </div>
                </Link>
              ))}
```

With:

```jsx
              {syncMatches.map((user) => (
                <Link
                  to={`/u/${user.username}`}
                  key={user.id}
                  className="group flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 bg-[#0a0a0a] border border-white/5 p-4 sm:p-6 rounded-2xl hover:bg-white/5 hover:border-green-500/30 transition-all"
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-black tracking-tighter uppercase group-hover:text-green-400 transition-colors truncate">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2 w-12 h-12 sm:w-16 sm:h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pl-16 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                      <div className="text-2xl sm:text-4xl font-black text-green-400">{user.matchScore}%</div>
                    </div>
                    <LikeButton likedUserId={user.id} likedUsername={user.username} />
                  </div>
                </Link>
              ))}
```

- [ ] **Step 3: Apply the same fix to Flipside Matches cards**

Replace:

```jsx
              {flipsideMatches.map((user) => (
                <Link
                  to={`/u/${user.username}`}
                  key={user.id}
                  className="group flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:bg-white/5 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tighter uppercase group-hover:text-orange-400 transition-colors">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2 w-16 h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                      <div className="text-4xl font-black text-orange-400">{user.matchScore}%</div>
                    </div>
                    <LikeButton likedUserId={user.id} likedUsername={user.username} />
                  </div>
                </Link>
              ))}
```

With:

```jsx
              {flipsideMatches.map((user) => (
                <Link
                  to={`/u/${user.username}`}
                  key={user.id}
                  className="group flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 bg-[#0a0a0a] border border-white/5 p-4 sm:p-6 rounded-2xl hover:bg-white/5 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black uppercase overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.username?.[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-black tracking-tighter uppercase group-hover:text-orange-400 transition-colors truncate">
                        @{user.username}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{user.bio}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2 w-12 h-12 sm:w-16 sm:h-16">
                        {user.vibes?.slice(0, 4).map((v, i) => (
                          <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/10">
                            <img src={v.album_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pl-16 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                      <div className="text-2xl sm:text-4xl font-black text-orange-400">{user.matchScore}%</div>
                    </div>
                    <LikeButton likedUserId={user.id} likedUsername={user.username} />
                  </div>
                </Link>
              ))}
```

- [ ] **Step 4: Verify the "People with similar taste." / "Break your echo chamber." lines are untouched**

Run: `grep -n "People with similar taste\|Break your echo chamber" src/pages/Dashboard.jsx`
Expected: both lines print unchanged, exactly as before.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint`
Expected: no new errors introduced in `Dashboard.jsx`.

```bash
git add src/pages/Dashboard.jsx
git commit -m "fix: make Dashboard header and match cards responsive on mobile"
```

---

## Task 2: MyProfile.jsx mobile responsiveness

**Files:**
- Modify: `src/pages/MyProfile.jsx:242-269` (header)
- Modify: `src/pages/MyProfile.jsx:482-488` (search overlay heading)

- [ ] **Step 1: Fix the header so it stacks on mobile**

Replace:

```jsx
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors"
            >
              FLIP-FM
            </Link>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">My Profile</h1>
              <p className="text-gray-500 font-medium">Manage your identity and crate.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs font-bold uppercase tracking-widest px-6 py-3 border border-white/10 rounded-full hover:bg-white/5 transition-all"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-bold uppercase tracking-widest px-4 py-3 text-gray-400 hover:text-red-400 border border-white/10 rounded-full hover:bg-white/5 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
```

With:

```jsx
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-center sm:text-left">
            <Link
              to="/dashboard"
              className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors"
            >
              FLIP-FM
            </Link>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter">My Profile</h1>
              <p className="text-gray-500 font-medium text-sm sm:text-base">Manage your identity and crate.</p>
            </div>
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 sm:flex-none text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 sm:px-6 py-3 border border-white/10 rounded-full hover:bg-white/5 transition-all whitespace-nowrap"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-3 text-gray-400 hover:text-red-400 border border-white/10 rounded-full hover:bg-white/5 transition-all whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </div>
```

- [ ] **Step 2: Shrink the "TYPE ALBUM NAME..." search heading on mobile**

Replace:

```jsx
          <input
            autoFocus
            className="bg-transparent border-b-2 border-white/10 text-4xl md:text-6xl font-black w-full max-w-3xl py-8 focus:outline-none focus:border-blue-500 placeholder:text-white/5 mt-20 text-center"
            placeholder="TYPE ALBUM NAME..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
```

With:

```jsx
          <input
            autoFocus
            className="bg-transparent border-b-2 border-white/10 text-2xl sm:text-4xl md:text-6xl font-black w-full max-w-3xl py-4 sm:py-8 focus:outline-none focus:border-blue-500 placeholder:text-white/5 mt-12 sm:mt-20 text-center"
            placeholder="TYPE ALBUM NAME..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
```

- [ ] **Step 3: Confirm the profile-details grid was already responsive (no change needed)**

Run: `grep -n "grid grid-cols-1 md:grid-cols-3" src/pages/MyProfile.jsx`
Expected: line 304 unchanged — `grid grid-cols-1 md:grid-cols-3 gap-8` (already collapses to a single column below `md`). No edit required here; this confirms the spec's claim about this particular grid doesn't match the current code.

- [ ] **Step 4: Lint and commit**

Run: `npm run lint`

```bash
git add src/pages/MyProfile.jsx
git commit -m "fix: make MyProfile header and search overlay responsive on mobile"
```

---

## Task 3: Explore.jsx mobile responsiveness

**Files:**
- Modify: `src/pages/Explore.jsx:67-108` (match card list)

- [ ] **Step 1: Fix match cards so they don't overflow on small screens**

Replace:

```jsx
      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-4">
        {users.map((user) => (
          <div key={user.id} className="relative group">
            <Link
              to={`/u/${user.username}`}
              className="flex items-center justify-between bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl hover:bg-white/5 transition-all hover:scale-[1.01] block"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black italic uppercase overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    user.username?.[0]
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase group-hover:text-blue-500 transition-colors">
                    @{user.username}
                  </h2>
                  <div className="grid grid-cols-2 gap-1 mt-2 w-16 h-16">
                    {user.vibes?.slice(0, 4).map((v, i) => (
                      <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/5">
                        <img src={v.album_cover} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                  <div className={`text-4xl font-black italic leading-none ${user.matchScore > 70 ? "text-green-400" : "text-white"}`}>
                    {user.matchScore}%
                  </div>
                </div>
                <LikeButton likedUserId={user.id} likedUsername={user.username} />
              </div>
            </Link>
          </div>
        ))}
      </div>
```

With:

```jsx
      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-4">
        {users.map((user) => (
          <div key={user.id} className="relative group">
            <Link
              to={`/u/${user.username}`}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 bg-[#0a0a0a] border border-white/5 p-4 sm:p-6 rounded-3xl hover:bg-white/5 transition-all hover:scale-[1.01] block"
            >
              <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-blue-600 rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black italic uppercase overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    user.username?.[0]
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black tracking-tighter uppercase group-hover:text-blue-500 transition-colors truncate">
                    @{user.username}
                  </h2>
                  <div className="grid grid-cols-2 gap-1 mt-2 w-12 h-12 sm:w-16 sm:h-16">
                    {user.vibes?.slice(0, 4).map((v, i) => (
                      <div key={i} className="w-full h-full rounded-sm overflow-hidden border border-white/5">
                        <img src={v.album_cover} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pl-16 sm:pl-0">
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Match</div>
                  <div className={`text-2xl sm:text-4xl font-black italic leading-none ${user.matchScore > 70 ? "text-green-400" : "text-white"}`}>
                    {user.matchScore}%
                  </div>
                </div>
                <LikeButton likedUserId={user.id} likedUsername={user.username} />
              </div>
            </Link>
          </div>
        ))}
      </div>
```

- [ ] **Step 2: Shrink the page heading on mobile too**

Replace:

```jsx
        <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">Explore</h1>
```

With:

```jsx
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none">Explore</h1>
```

- [ ] **Step 3: Lint and commit**

Run: `npm run lint`

```bash
git add src/pages/Explore.jsx
git commit -m "fix: make Explore match cards responsive on mobile"
```

---

## Task 4: PublicProfile.jsx mobile spacing

**Files:**
- Modify: `src/pages/PublicProfile.jsx:114-125` (page padding + top nav)
- Modify: `src/pages/PublicProfile.jsx:140` (username heading size)

- [ ] **Step 1: Reduce outer padding and heading size on mobile**

Replace:

```jsx
    <div className={`min-h-screen bg-black text-white p-6 flex flex-col items-center bg-gradient-to-br ${theme.bg}`}>

      {/* TOP NAV */}
      <div className="w-full max-w-6xl mb-8">
        <Link
          to="/dashboard"
          className="text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors inline-block"
        >
          FLIP-FM
        </Link>
      </div>
```

With:

```jsx
    <div className={`min-h-screen bg-black text-white p-4 sm:p-6 flex flex-col items-center bg-gradient-to-br ${theme.bg}`}>

      {/* TOP NAV */}
      <div className="w-full max-w-6xl mb-6 sm:mb-8">
        <Link
          to="/dashboard"
          className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter hover:text-purple-400 transition-colors inline-block"
        >
          FLIP-FM
        </Link>
      </div>
```

- [ ] **Step 2: Shrink the username heading on mobile**

Replace:

```jsx
        <h1 className="text-5xl font-black italic tracking-tighter uppercase">{profile.username}</h1>
```

With:

```jsx
        <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase break-words px-2">{profile.username}</h1>
```

- [ ] **Step 3: Lint and commit**

Run: `npm run lint`

```bash
git add src/pages/PublicProfile.jsx
git commit -m "fix: reduce PublicProfile padding and heading size on mobile"
```

---

## Task 5: Supabase `follows` table — schema, RLS, rate limiting

**Files:**
- Create: `supabase/follows_schema.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- ============================================================
-- Follow/Friend System — run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id SERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read follows — needed for public follower/following counts
CREATE POLICY "Anyone can view follows"
  ON public.follows
  FOR SELECT
  USING (true);

-- Users may only create a follow row where they are the follower
CREATE POLICY "Users can follow as themselves"
  ON public.follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users may only delete their own follow rows
CREATE POLICY "Users can unfollow as themselves"
  ON public.follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Server-side rate limit: max 30 follows per minute per user.
-- Enforced in a trigger (not just RLS) because RLS alone can't count rows across a time window.
CREATE OR REPLACE FUNCTION public.enforce_follow_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.follows
  WHERE follower_id = NEW.follower_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 30 follows per minute';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS follows_rate_limit_trigger ON public.follows;
CREATE TRIGGER follows_rate_limit_trigger
  BEFORE INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_follow_rate_limit();
```

- [ ] **Step 2: Note how self-follow is enforced twice**

The `no_self_follow` CHECK constraint (DB-level, unspoofable) is the real guard. `followRules.js` in Task 6 is a client-side convenience so the UI never even shows a Follow button on your own profile — belt and suspenders, not a substitute for the constraint.

- [ ] **Step 3: Commit the SQL file**

```bash
git add supabase/follows_schema.sql
git commit -m "feat: add follows table schema with RLS and rate limiting"
```

(This file is a deliverable for the user to run manually in the Supabase SQL editor — it does not execute automatically as part of the app build, matching the existing convention in this repo.)

---

## Task 6: Follow rules pure-logic module (TDD)

**Files:**
- Create: `src/lib/followRules.js`
- Test: `src/lib/__tests__/followRules.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// src/lib/__tests__/followRules.test.js
import { describe, it, expect } from "vitest";
import { canFollow } from "../followRules";

describe("canFollow", () => {
  it("returns false when the ids are the same (self-follow)", () => {
    expect(canFollow("user-1", "user-1")).toBe(false);
  });

  it("returns true for two different users", () => {
    expect(canFollow("user-1", "user-2")).toBe(true);
  });

  it("returns false when either id is missing", () => {
    expect(canFollow(null, "user-2")).toBe(false);
    expect(canFollow("user-1", null)).toBe(false);
    expect(canFollow(undefined, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/__tests__/followRules.test.js`
Expected: FAIL — `Cannot find module '../followRules'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```javascript
// src/lib/followRules.js
export function canFollow(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;
  return currentUserId !== targetUserId;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/__tests__/followRules.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/followRules.js src/lib/__tests__/followRules.test.js
git commit -m "feat: add canFollow pure-logic guard with tests"
```

---

## Task 7: FollowButton component

**Files:**
- Create: `src/components/FollowButton.jsx`

- [ ] **Step 1: Write the component**

Mirrors the existing `LikeButton.jsx` pattern (session lookup, existing-row check, optimistic toggle) but against the `follows` table, and uses `canFollow` from Task 6 to hide itself entirely on your own profile instead of just disabling.

```jsx
import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { UserPlus, UserCheck } from "lucide-react";
import { canFollow } from "../lib/followRules";

export default function FollowButton({ profileId, onFollowChange }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      const { data: existingFollow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", session.user.id)
        .eq("following_id", profileId)
        .maybeSingle();

      setFollowing(!!existingFollow);
    };

    if (profileId) init();
  }, [profileId]);

  const handleToggleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading || !canFollow(currentUserId, profileId)) return;

    setLoading(true);

    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId);

      if (!error) {
        setFollowing(false);
        onFollowChange?.(-1);
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: profileId });

      if (!error) {
        setFollowing(true);
        onFollowChange?.(1);
      }
    }

    setLoading(false);
  };

  if (!canFollow(currentUserId, profileId)) return null;

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-all font-bold text-xs uppercase tracking-widest
        ${following
          ? "bg-white/10 border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400"
          : "bg-blue-600 border-blue-600 text-white hover:bg-blue-500"
        }
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FollowButton.jsx
git commit -m "feat: add FollowButton component"
```

---

## Task 8: Wire FollowButton + follower/following counts into PublicProfile.jsx

**Files:**
- Modify: `src/pages/PublicProfile.jsx`

- [ ] **Step 1: Add state and fetch counts alongside the existing profile fetch**

Replace:

```jsx
  const [profile, setProfile] = useState(null);
  const [theirVibes, setTheirVibes] = useState([]);
  const [myVibes, setMyVibes] = useState([]);
  const [matchScore, setMatchScore] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const profilePicRef = useRef(null);
```

With:

```jsx
  const [profile, setProfile] = useState(null);
  const [theirVibes, setTheirVibes] = useState([]);
  const [myVibes, setMyVibes] = useState([]);
  const [matchScore, setMatchScore] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const profilePicRef = useRef(null);
```

- [ ] **Step 2: Fetch the counts in the existing `fetchData` effect**

Replace:

```jsx
        // Get like count (public)
        const { count } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("liked_id", profileData.id);

        setLikeCount(count || 0);
```

With:

```jsx
        // Get like count (public)
        const { count } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("liked_id", profileData.id);

        setLikeCount(count || 0);

        // Get follower/following counts (public)
        const { count: followers } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileData.id);

        const { count: followingTotal } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileData.id);

        setFollowerCount(followers || 0);
        setFollowingCount(followingTotal || 0);
```

- [ ] **Step 3: Render the counts and the FollowButton next to the existing LikeButton**

Add the import:

Replace:

```jsx
import LikeButton from "../components/LikeButton";
```

With:

```jsx
import LikeButton from "../components/LikeButton";
import FollowButton from "../components/FollowButton";
```

Replace:

```jsx
        {/* Like count (public) */}
        {likeCount > 0 && (
          <p className="text-xs text-red-500 uppercase tracking-widest font-bold">
            ❤️ {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}
```

With:

```jsx
        {/* Like count (public) */}
        {likeCount > 0 && (
          <p className="text-xs text-red-500 uppercase tracking-widest font-bold">
            ❤️ {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        {/* Follower / Following counts (public) */}
        <div className="flex justify-center gap-4 text-xs text-gray-400 uppercase tracking-widest font-bold">
          <span>{followerCount} {followerCount === 1 ? "Follower" : "Followers"}</span>
          <span>{followingCount} Following</span>
        </div>
```

Replace:

```jsx
        {/* Like button */}
        <div className="flex justify-center pt-2">
          <LikeButton likedUserId={profile.id} likedUsername={profile.username} />
        </div>
```

With:

```jsx
        {/* Like + Follow buttons */}
        <div className="flex justify-center items-center gap-3 pt-2 flex-wrap">
          <LikeButton likedUserId={profile.id} likedUsername={profile.username} />
          <FollowButton
            profileId={profile.id}
            onFollowChange={(delta) => setFollowerCount((prev) => Math.max(0, prev + delta))}
          />
        </div>
```

- [ ] **Step 4: Lint and commit**

Run: `npm run lint`

```bash
git add src/pages/PublicProfile.jsx
git commit -m "feat: add follower/following counts and FollowButton to PublicProfile"
```

---

## Task 8b: Follower/following counts on your own profile (MyProfile.jsx)

The spec's counts bullet is worded generically ("Followers"/"Following" count "on profiles"), not scoped only to `PublicProfile` — add the same read-only counts to your own profile page. No Follow button needed here (you can't follow yourself).

**Files:**
- Modify: `src/pages/MyProfile.jsx`

- [ ] **Step 1: Add state**

Replace:

```jsx
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [deleteSending, setDeleteSending] = useState(false);
  const navigate = useNavigate();
```

With:

```jsx
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [deleteSending, setDeleteSending] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const navigate = useNavigate();
```

- [ ] **Step 2: Fetch the counts in the existing `checkAuth` effect**

Replace:

```jsx
      const { data } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", authUser.id);
      setMyVibes(data || []);
    };
    checkAuth();
  }, [navigate]);
```

With:

```jsx
      const { data } = await supabase
        .from("vibes")
        .select("*")
        .eq("user_id", authUser.id);
      setMyVibes(data || []);

      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", authUser.id);

      const { count: followingTotal } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", authUser.id);

      setFollowerCount(followers || 0);
      setFollowingCount(followingTotal || 0);
    };
    checkAuth();
  }, [navigate]);
```

- [ ] **Step 3: Render the counts under the username**

Replace:

```jsx
                ) : (
                  <p className="text-2xl font-black tracking-tighter">@{profile?.username}</p>
                )}
                {editMode && (
                  <p className="text-xs text-yellow-500 mt-1">⚠️ Changing username will affect your profile URL</p>
                )}
              </div>
```

With:

```jsx
                ) : (
                  <p className="text-2xl font-black tracking-tighter">@{profile?.username}</p>
                )}
                {editMode && (
                  <p className="text-xs text-yellow-500 mt-1">⚠️ Changing username will affect your profile URL</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-gray-400 uppercase tracking-widest font-bold">
                  <span>{followerCount} {followerCount === 1 ? "Follower" : "Followers"}</span>
                  <span>{followingCount} Following</span>
                </div>
              </div>
```

- [ ] **Step 4: Lint and commit**

Run: `npm run lint`

```bash
git add src/pages/MyProfile.jsx
git commit -m "feat: show follower/following counts on MyProfile"
```

---

## Task 9: "Following" feed section on Dashboard.jsx

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add state for the following feed**

Replace:

```jsx
  const [currentUser, setCurrentUser] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [syncMatches, setSyncMatches] = useState([]);
  const [flipsideMatches, setFlipsideMatches] = useState([]);
  const [whoLikedMe, setWhoLikedMe] = useState([]);
```

With:

```jsx
  const [currentUser, setCurrentUser] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [syncMatches, setSyncMatches] = useState([]);
  const [flipsideMatches, setFlipsideMatches] = useState([]);
  const [whoLikedMe, setWhoLikedMe] = useState([]);
  const [followingFeed, setFollowingFeed] = useState([]);
```

- [ ] **Step 2: Fetch the followed users' current crates in `loadDashboard`**

Replace:

```jsx
      const { data: likeData } = await supabase
        .from("likes")
        .select("liker_id, created_at, profiles!likes_liker_id_fkey(id, username, avatar_url)")
        .eq("liked_id", user.id)
        .order("created_at", { ascending: false });

      setWhoLikedMe(likeData || []);
```

With:

```jsx
      const { data: likeData } = await supabase
        .from("likes")
        .select("liker_id, created_at, profiles!likes_liker_id_fkey(id, username, avatar_url)")
        .eq("liked_id", user.id)
        .order("created_at", { ascending: false });

      setWhoLikedMe(likeData || []);

      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id, created_at, profiles!follows_following_id_fkey(id, username, avatar_url, vibes(*))")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false });

      setFollowingFeed(followingData || []);
```

- [ ] **Step 3: Render the "Following" section on the Dashboard**

Insert this new section right after the "Who Liked Your Crate" section and before "Your Identity":

Replace:

```jsx
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Your Identity</h2>
```

With:

```jsx
        {followingFeed.length > 0 && (
          <section className="mb-16">
            <div className="mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Following</h2>
              <p className="text-gray-500 text-sm mt-1">Crates from people you follow.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {followingFeed.map((row) => {
                const followed = row.profiles;
                if (!followed) return null;
                return (
                  <Link
                    key={row.following_id}
                    to={`/u/${followed.username}`}
                    className="flex items-center gap-4 bg-[#0a0a0a] border border-white/5 hover:border-blue-500/40 rounded-2xl p-4 transition-all group min-w-0"
                  >
                    <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 overflow-hidden flex items-center justify-center text-lg font-black">
                      {followed.avatar_url ? (
                        <img src={followed.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        followed.username?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold group-hover:text-blue-400 transition-colors truncate">
                        @{followed.username}
                      </p>
                      <div className="grid grid-cols-4 gap-1 mt-2 w-full max-w-[140px]">
                        {[0, 1, 2, 3].map((slot) => {
                          const vibe = followed.vibes?.find((v) => v.slot_number === slot);
                          return (
                            <div key={slot} className="aspect-square rounded-sm overflow-hidden border border-white/10 bg-white/5">
                              {vibe && <img src={vibe.album_cover} className="w-full h-full object-cover" alt="" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Your Identity</h2>
```

- [ ] **Step 4: Verify the two protected text strings and the Feeling Lucky feature are still intact**

Run: `grep -n "People with similar taste\|Break your echo chamber\|Feeling Lucky\|handleFeelingLucky" src/pages/Dashboard.jsx`
Expected: all four still present, unchanged.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint`

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: add Following feed section to Dashboard"
```

---

## Task 10: Delete dead UserProfile.jsx and its import

**Files:**
- Delete: `src/pages/UserProfile.jsx`
- Modify: `src/pages/App.jsx:11`

- [ ] **Step 1: Confirm it's truly unreferenced before deleting**

Run: `grep -rn "UserProfile" src`
Expected: only two lines — the `export default function UserProfile()` declaration in `UserProfile.jsx` and the unused `import UserProfile from "./UserProfile"` in `App.jsx:11`. No `<Route>` or other reference. (Already confirmed once during planning; re-check here in case other tasks touched routing.)

- [ ] **Step 2: Remove the dead import from App.jsx**

Replace:

```jsx
import PublicProfile from "./PublicProfile";
import UserProfile from "./UserProfile";
import Explore from "./Explore";
```

With:

```jsx
import PublicProfile from "./PublicProfile";
import Explore from "./Explore";
```

- [ ] **Step 3: Delete the file**

```bash
git rm src/pages/UserProfile.jsx
```

- [ ] **Step 4: Verify the app still builds with no dangling references**

Run: `npm run lint && npm run build`
Expected: both succeed with no `UserProfile` reference errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/App.jsx
git commit -m "chore: remove dead UserProfile.jsx, superseded by PublicProfile"
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all existing tests (`src/bridge/__tests__/*`) plus the new `followRules.test.js` pass.

- [ ] **Step 2: Run lint and build across the whole repo**

Run: `npm run lint && npm run build`
Expected: both succeed, no errors.

- [ ] **Step 3: Manual mobile check (no RTL/component tests exist in this repo, so this step is required, not optional)**

Run: `npm run dev`, open the app in a browser at a 375px-wide viewport (iPhone SE) and confirm for each page:
- Dashboard: header doesn't overflow, Feeling Lucky modal still opens and navigates, Sync/Flipside cards don't clip the like button, the two protected strings ("People with similar taste." / "Break your echo chamber.") are visibly unchanged, "Following" section appears once you follow someone.
- MyProfile: header stacks cleanly, search overlay heading fits without horizontal scroll, Sign Out still works.
- Explore: match cards no longer overflow horizontally.
- PublicProfile: Follow button toggles, follower/following counts update, spacing looks correct.

- [ ] **Step 4: Confirm the SQL deliverable is ready to hand off**

Run: `cat supabase/follows_schema.sql`
Expected: file exists and matches Task 5's content — this is what the user runs manually in the Supabase SQL editor (per their instruction: code changes only, no direct push/deploy by the agent).
