# Fix functionality and display issues across the app

## Issues Found & Fixes

### 🔴 Critical Fixes

**1. Messages screen — Conversation list crashes/flickering**
- The conversation list item is incorrectly defined, causing all items to re-create themselves on every screen update
- Fix: Restructure so items remain stable and animations work properly
- [x] Extracted `ConversationListItem` as a `React.memo` component outside the render function
- [x] Used `useCallback` for press handlers

**2. Messages screen — New chat button icon invisible**
- The "+" button to start a new chat uses the same color for both the button and the icon, making the icon invisible
- Fix: Change the icon to white so it's visible against the blue button
- [x] Changed icon color to `Colors.textInverse`

**3. Chat screen — Message sender info may not load**
- The chat screen tries to load sender names/avatars using a database relationship that may not exist
- Fix: Add a fallback approach so messages always show sender info
- [x] Added FK join fallback — if `users!sender_id` join fails, falls back to plain query + separate users lookup

### 🟡 Display Fixes

**4. Messages screen — Timestamps show raw technical format**
- Conversation times display raw database format (e.g. `2026-03-10T14:30:00Z`) instead of friendly times like "2:30 PM" or "Yesterday"
- Fix: Format all timestamps to show friendly relative times
- [x] Added `formatConversationTime()` utility (now, Xm, Xh, Yesterday, Xd, Mon DD)

**5. Profile screen — Join date shows raw format**
- The "Joined" date shows a raw timestamp instead of a readable date
- Fix: Format to show something like "March 10, 2026"
- [x] Added `formatJoinDate()` utility using `toLocaleDateString`

### 🟢 Theme Consistency

**6. Dark mode doesn't work on most screens**
- Only the Profile tab and a few screens respond to dark mode. Home, Messages, Groups, Calendar, Giving, Login, Chat, and other screens all stay in light mode
- Fix: Update all major screens to use the current theme colors so dark mode works everywhere
- [x] Home screen — container, stat cards, section titles, section actions
- [x] Messages screen — container, header, search bar, title, conversation items, modal, member list
- [x] Notifications screen — container, header, title, action buttons, notification cards, empty state
- [x] Profile screen — container, header, profile card, user name, role text, info section, menu items, ministry badges, management cards, section titles
- [x] Groups screen — container, header, title, subtitle, search bar, compact cards, section titles, empty/no-results states
- [x] Calendar screen — container, header, title, calendar card, month nav, day text, events section, no-events state
- [x] Giving screen — container, tabs, stats card, type buttons, amount buttons, frequency options, inputs, modals, history items
- [x] EventCard component — all text and background colors
- [x] AnnouncementCard component — all text, background, border colors
- [x] TabBarDropdown component — dropdown background, text, icons, borders

### 🔵 Minor Polish

**7. Tab bar height adjustment**
- The bottom tab bar has a fixed height that may look off on some devices
- Fix: Use a more adaptive height approach
- [x] Removed hardcoded height on native (uses safe area auto), set 64px on web
