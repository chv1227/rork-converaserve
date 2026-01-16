import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { ministriesRouter } from "./routes/ministries";
import { eventsRouter } from "./routes/events";
import { announcementsRouter } from "./routes/announcements";
import { workflowsRouter } from "./routes/workflows";
import { adminRouter } from "./routes/admin";
import { notificationsRouter } from "./routes/notifications";
import { messagesRouter } from "./routes/messages";
import { songsRouter } from "./routes/songs";
import { organizationsRouter } from "./routes/organizations";
import { givingRouter } from "./routes/giving";
import { churchManagementRouter } from "./routes/churchManagement";
import { pollsRouter } from "./routes/polls";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  ministries: ministriesRouter,
  events: eventsRouter,
  announcements: announcementsRouter,
  workflows: workflowsRouter,
  admin: adminRouter,
  notifications: notificationsRouter,
  messages: messagesRouter,
  songs: songsRouter,
  organizations: organizationsRouter,
  giving: givingRouter,
  churchManagement: churchManagementRouter,
  polls: pollsRouter,
});

export type AppRouter = typeof appRouter;
