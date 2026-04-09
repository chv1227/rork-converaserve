# Modernize Login Screen — Glassmorphism + Full-Screen

## What's Changing

A complete visual redesign of the login screen combining a glassmorphism aesthetic with a full-screen immersive layout. All existing functionality (sign in, forgot password, email verification, register link, create church) is preserved.

---

### **Design**

- **Background**: Rich, deep navy-to-teal gradient with subtle geometric pattern overlay — soft circles and arcs that evoke stained glass or cathedral windows, giving a church-appropriate warmth
- **Inputs**: Semi-transparent frosted glass input fields that blend into the background — no visible card container. Inputs have a soft glow border on focus
- **Buttons**: Primary sign-in button with a frosted glass highlight and gentle shimmer animation. Secondary buttons use transparent outlined style
- **Colors**: Staying within the existing navy/gold palette but with more depth — translucent whites, soft amber accents, and glowing highlights
- **Typography**: Clean, bold heading for "ChurchConnect" with a lighter tagline beneath

### **Layout**

- **Top section (~30%)**: Medium-sized ChurchConnect branding — a subtle cross/church-inspired geometric icon with the app name and tagline
- **Middle section**: Email and password fields float directly on the background with frosted glass styling — no card wrapping them
- **Bottom section**: Sign In button, divider, Create Account button, and "Register your church" link, all with matching glass-like transparency
- **Background pattern**: Soft, low-opacity geometric arcs and circles scattered across the background to create visual interest without distraction

### **Animations**

- Smooth fade-in for branding, then staggered slide-up for each form element
- Gentle pulse glow on the sign-in button when idle
- Input focus causes a subtle border glow transition
- Button press scale-down micro-interaction (already exists, will be refined)

### **Modals (Reset Password & Verify Email)**

- Updated to match the new glassmorphism style with frosted backgrounds
- Cleaner, more modern modal presentation

### **What stays the same**

- All login logic, error handling, lockout system
- Forgot password flow
- Email verification flow
- Navigation to register and create church screens
- All test IDs preserved

