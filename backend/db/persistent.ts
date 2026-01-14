import { DbUser, Session, Notification, WorkflowRequest, ReportedContent, ActivityLog, Invitation } from "./index";
import { Ministry, Event, Announcement, Conversation, Message, Song, AudioPart, LyricLine, Organization, Membership } from "@/types";

const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

interface DbResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const memoryStore: Record<string, Record<string, unknown>> = {
  users: {},
  sessions: {},
  organizations: {},
  memberships: {},
  notifications: {},
  ministries: {},
  events: {},
  announcements: {},
  conversations: {},
  messages: {},
  workflowRequests: {},
  songs: {},
  audioParts: {},
  lyrics: {},
  reportedContent: {},
  activityLogs: {},
  invitations: {},
};

function getMemoryCollection<T>(collection: string): T[] {
  if (!memoryStore[collection]) {
    memoryStore[collection] = {};
  }
  return Object.values(memoryStore[collection]) as T[];
}

function setMemoryItem<T extends { id: string }>(collection: string, item: T): void {
  if (!memoryStore[collection]) {
    memoryStore[collection] = {};
  }
  memoryStore[collection][item.id] = item;
}

function getMemoryItem<T>(collection: string, id: string): T | null {
  if (!memoryStore[collection]) return null;
  return (memoryStore[collection][id] as T) || null;
}

function deleteMemoryItem(collection: string, id: string): boolean {
  if (!memoryStore[collection]) return false;
  if (memoryStore[collection][id]) {
    delete memoryStore[collection][id];
    return true;
  }
  return false;
}

async function dbRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  collection: string,
  id?: string,
  body?: unknown
): Promise<DbResponse<T>> {
  // Always use memory store for reliability - external DB is optional
  console.log(`DB: Using memory store for ${method} ${collection}${id ? `/${id}` : ""}`);
  const memoryResult = handleMemoryRequest<T>(method, collection, id, body);
  
  if (!memoryResult.success) {
    console.error(`Memory store failed for ${method} ${collection}:`, memoryResult.error);
  } else {
    console.log(`Memory store success for ${method} ${collection}`);
  }
  
  // Try to sync with external DB in background if configured (non-blocking)
  if (DB_ENDPOINT && DB_TOKEN && (method === "POST" || method === "PUT" || method === "DELETE")) {
    const url = id 
      ? `${DB_ENDPOINT}/${DB_NAMESPACE}/${collection}/${id}`
      : `${DB_ENDPOINT}/${DB_NAMESPACE}/${collection}`;
    const actualMethod = method === "POST" && id ? "PUT" : method;
    
    // Fire and forget - don't wait for external DB
    fetch(url, {
      method: actualMethod,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DB_TOKEN}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(res => {
      if (res.ok) {
        console.log(`External DB sync success: ${method} ${collection}`);
      } else {
        console.log(`External DB sync failed (non-blocking): ${method} ${collection}`);
      }
    }).catch(err => {
      console.log(`External DB sync error (non-blocking): ${method} ${collection}`, err);
    });
  }
  
  return memoryResult;
}

function handleMemoryRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  collection: string,
  id?: string,
  body?: unknown
): DbResponse<T> {
  try {
    if (method === "GET" && id) {
      const item = getMemoryItem<T>(collection, id);
      return { success: true, data: item || undefined };
    } else if (method === "GET") {
      const items = getMemoryCollection<T>(collection);
      return { success: true, data: items as unknown as T };
    } else if ((method === "POST" || method === "PUT") && id && body) {
      setMemoryItem(collection, body as { id: string });
      return { success: true, data: body as T };
    } else if (method === "DELETE" && id) {
      deleteMemoryItem(collection, id);
      return { success: true };
    }
    return { success: true };
  } catch (error) {
    console.error(`Memory store error: ${method} ${collection}`, error);
    return { success: false, error: String(error) };
  }
}

async function queryCollection<T>(
  collection: string,
  filter?: Record<string, unknown>
): Promise<T[]> {
  // Always use memory store for reliability
  console.log(`DB: Querying memory store for ${collection}`, filter ? JSON.stringify(filter) : "");
  const result = queryMemoryCollection<T>(collection, filter);
  console.log(`Memory query result for ${collection}: ${result.length} items`);
  return result;
}

function queryMemoryCollection<T>(
  collection: string,
  filter?: Record<string, unknown>
): T[] {
  const items = getMemoryCollection<T>(collection);
  
  if (!filter || Object.keys(filter).length === 0) {
    return items;
  }
  
  return items.filter((item) => {
    const itemObj = item as Record<string, unknown>;
    return Object.entries(filter).every(([key, value]) => {
      if (typeof value === 'string') {
        return String(itemObj[key]).toLowerCase() === value.toLowerCase();
      }
      return itemObj[key] === value;
    });
  });
}

export const persistentDb = {
  users: {
    async findByEmail(email: string): Promise<DbUser | null> {
      console.log("DB: Finding user by email:", email.toLowerCase());
      const users = await queryCollection<DbUser>("users", { email: email.toLowerCase() });
      return users.length > 0 ? users[0] : null;
    },

    async findById(id: string): Promise<DbUser | null> {
      console.log("DB: Finding user by id:", id);
      const result = await dbRequest<DbUser>("GET", "users", id);
      return result.success && result.data ? result.data : null;
    },

    async create(user: DbUser): Promise<DbUser | null> {
      console.log("DB: Creating user:", user.email);
      const result = await dbRequest<DbUser>("POST", "users", user.id, user);
      return result.success ? user : null;
    },

    async update(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
      console.log("DB: Updating user:", id);
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<DbUser>("PUT", "users", id, updated);
      return result.success ? updated : null;
    },

    async getAll(): Promise<DbUser[]> {
      return queryCollection<DbUser>("users");
    },

    async findByOrganization(organizationId: string): Promise<DbUser[]> {
      const memberships = await persistentDb.memberships.findByOrganization(organizationId);
      const userIds = memberships.map(m => m.userId);
      const allUsers = await this.getAll();
      return allUsers.filter(u => userIds.includes(u.id));
    }
  },

  sessions: {
    async findByToken(token: string): Promise<Session | null> {
      console.log("DB: Finding session by token");
      const sessions = await queryCollection<Session>("sessions", { token });
      return sessions.length > 0 ? sessions[0] : null;
    },

    async findByUserId(userId: string): Promise<Session[]> {
      return queryCollection<Session>("sessions", { userId });
    },

    async create(session: Session): Promise<Session | null> {
      console.log("DB: Creating session for user:", session.userId);
      const result = await dbRequest<Session>("POST", "sessions", session.id, session);
      return result.success ? session : null;
    },

    async delete(id: string): Promise<boolean> {
      console.log("DB: Deleting session:", id);
      const result = await dbRequest<void>("DELETE", "sessions", id);
      return result.success;
    },

    async deleteByToken(token: string): Promise<boolean> {
      const session = await this.findByToken(token);
      if (session) {
        return this.delete(session.id);
      }
      return false;
    },

    async deleteExpired(): Promise<void> {
      const sessions = await queryCollection<Session>("sessions");
      const now = new Date();
      for (const session of sessions) {
        if (new Date(session.expiresAt) < now) {
          await this.delete(session.id);
        }
      }
    }
  },

  organizations: {
    async findById(id: string): Promise<Organization | null> {
      const result = await dbRequest<Organization>("GET", "organizations", id);
      return result.success && result.data ? result.data : null;
    },

    async findByCode(code: string): Promise<Organization | null> {
      const orgs = await queryCollection<Organization>("organizations", { code });
      return orgs.length > 0 ? orgs[0] : null;
    },

    async create(org: Organization): Promise<Organization | null> {
      console.log("DB: Creating organization:", org.name);
      const result = await dbRequest<Organization>("POST", "organizations", org.id, org);
      return result.success ? org : null;
    },

    async update(id: string, updates: Partial<Organization>): Promise<Organization | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<Organization>("PUT", "organizations", id, updated);
      return result.success ? updated : null;
    },

    async getAll(): Promise<Organization[]> {
      return queryCollection<Organization>("organizations");
    }
  },

  memberships: {
    async findByUserAndOrg(userId: string, organizationId: string): Promise<Membership | null> {
      const memberships = await queryCollection<Membership>("memberships", { userId, organizationId });
      return memberships.length > 0 ? memberships[0] : null;
    },

    async findByUser(userId: string): Promise<Membership[]> {
      return queryCollection<Membership>("memberships", { userId });
    },

    async findByOrganization(organizationId: string): Promise<Membership[]> {
      return queryCollection<Membership>("memberships", { organizationId });
    },

    async create(membership: Membership): Promise<Membership | null> {
      console.log("DB: Creating membership for user:", membership.userId);
      const result = await dbRequest<Membership>("POST", "memberships", membership.id, membership);
      return result.success ? membership : null;
    },

    async update(id: string, updates: Partial<Membership>): Promise<Membership | null> {
      const memberships = await queryCollection<Membership>("memberships");
      const existing = memberships.find(m => m.id === id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Membership>("PUT", "memberships", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "memberships", id);
      return result.success;
    }
  },

  notifications: {
    async findByUser(userId: string): Promise<Notification[]> {
      return queryCollection<Notification>("notifications", { userId });
    },

    async create(notification: Notification): Promise<Notification | null> {
      const result = await dbRequest<Notification>("POST", "notifications", notification.id, notification);
      return result.success ? notification : null;
    },

    async update(id: string, updates: Partial<Notification>): Promise<Notification | null> {
      const notifications = await queryCollection<Notification>("notifications");
      const existing = notifications.find(n => n.id === id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Notification>("PUT", "notifications", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "notifications", id);
      return result.success;
    }
  },

  ministries: {
    async findById(id: string): Promise<Ministry | null> {
      const result = await dbRequest<Ministry>("GET", "ministries", id);
      return result.success && result.data ? result.data : null;
    },

    async findByOrganization(organizationId: string): Promise<Ministry[]> {
      return queryCollection<Ministry>("ministries", { organizationId });
    },

    async create(ministry: Ministry): Promise<Ministry | null> {
      const result = await dbRequest<Ministry>("POST", "ministries", ministry.id, ministry);
      return result.success ? ministry : null;
    },

    async update(id: string, updates: Partial<Ministry>): Promise<Ministry | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Ministry>("PUT", "ministries", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "ministries", id);
      return result.success;
    },

    async getAll(): Promise<Ministry[]> {
      return queryCollection<Ministry>("ministries");
    }
  },

  events: {
    async findById(id: string): Promise<Event | null> {
      const result = await dbRequest<Event>("GET", "events", id);
      return result.success && result.data ? result.data : null;
    },

    async findByOrganization(organizationId: string): Promise<Event[]> {
      return queryCollection<Event>("events", { organizationId });
    },

    async create(event: Event): Promise<Event | null> {
      const result = await dbRequest<Event>("POST", "events", event.id, event);
      return result.success ? event : null;
    },

    async update(id: string, updates: Partial<Event>): Promise<Event | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Event>("PUT", "events", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "events", id);
      return result.success;
    },

    async getAll(): Promise<Event[]> {
      return queryCollection<Event>("events");
    }
  },

  announcements: {
    async findById(id: string): Promise<Announcement | null> {
      const result = await dbRequest<Announcement>("GET", "announcements", id);
      return result.success && result.data ? result.data : null;
    },

    async findByOrganization(organizationId: string): Promise<Announcement[]> {
      return queryCollection<Announcement>("announcements", { organizationId });
    },

    async create(announcement: Announcement): Promise<Announcement | null> {
      const result = await dbRequest<Announcement>("POST", "announcements", announcement.id, announcement);
      return result.success ? announcement : null;
    },

    async update(id: string, updates: Partial<Announcement>): Promise<Announcement | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Announcement>("PUT", "announcements", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "announcements", id);
      return result.success;
    },

    async getAll(): Promise<Announcement[]> {
      return queryCollection<Announcement>("announcements");
    }
  },

  conversations: {
    async findById(id: string): Promise<Conversation | null> {
      const result = await dbRequest<Conversation>("GET", "conversations", id);
      return result.success && result.data ? result.data : null;
    },

    async findByOrganization(organizationId: string): Promise<Conversation[]> {
      return queryCollection<Conversation>("conversations", { organizationId });
    },

    async create(conversation: Conversation): Promise<Conversation | null> {
      const result = await dbRequest<Conversation>("POST", "conversations", conversation.id, conversation);
      return result.success ? conversation : null;
    },

    async update(id: string, updates: Partial<Conversation>): Promise<Conversation | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Conversation>("PUT", "conversations", id, updated);
      return result.success ? updated : null;
    },

    async getAll(): Promise<Conversation[]> {
      return queryCollection<Conversation>("conversations");
    }
  },

  messages: {
    async findByConversation(conversationId: string): Promise<Message[]> {
      return queryCollection<Message>("messages", { conversationId });
    },

    async create(message: Message): Promise<Message | null> {
      const result = await dbRequest<Message>("POST", "messages", message.id, message);
      return result.success ? message : null;
    },

    async getAll(): Promise<Message[]> {
      return queryCollection<Message>("messages");
    }
  },

  workflowRequests: {
    async findById(id: string): Promise<WorkflowRequest | null> {
      const result = await dbRequest<WorkflowRequest>("GET", "workflowRequests", id);
      return result.success && result.data ? result.data : null;
    },

    async findByOrganization(organizationId: string): Promise<WorkflowRequest[]> {
      return queryCollection<WorkflowRequest>("workflowRequests", { organizationId });
    },

    async create(request: WorkflowRequest): Promise<WorkflowRequest | null> {
      const result = await dbRequest<WorkflowRequest>("POST", "workflowRequests", request.id, request);
      return result.success ? request : null;
    },

    async update(id: string, updates: Partial<WorkflowRequest>): Promise<WorkflowRequest | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<WorkflowRequest>("PUT", "workflowRequests", id, updated);
      return result.success ? updated : null;
    },

    async getAll(): Promise<WorkflowRequest[]> {
      return queryCollection<WorkflowRequest>("workflowRequests");
    }
  },

  songs: {
    async findById(id: string): Promise<Song | null> {
      const result = await dbRequest<Song>("GET", "songs", id);
      return result.success && result.data ? result.data : null;
    },

    async findByOrganization(organizationId: string): Promise<Song[]> {
      return queryCollection<Song>("songs", { organizationId });
    },

    async create(song: Song): Promise<Song | null> {
      const result = await dbRequest<Song>("POST", "songs", song.id, song);
      return result.success ? song : null;
    },

    async update(id: string, updates: Partial<Song>): Promise<Song | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Song>("PUT", "songs", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "songs", id);
      return result.success;
    },

    async getAll(): Promise<Song[]> {
      return queryCollection<Song>("songs");
    }
  },

  audioParts: {
    async findBySong(songId: string): Promise<AudioPart[]> {
      return queryCollection<AudioPart>("audioParts", { songId });
    },

    async create(part: AudioPart): Promise<AudioPart | null> {
      const result = await dbRequest<AudioPart>("POST", "audioParts", part.id, part);
      return result.success ? part : null;
    },

    async update(id: string, updates: Partial<AudioPart>): Promise<AudioPart | null> {
      const parts = await queryCollection<AudioPart>("audioParts");
      const existing = parts.find(p => p.id === id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<AudioPart>("PUT", "audioParts", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "audioParts", id);
      return result.success;
    },

    async getAll(): Promise<AudioPart[]> {
      return queryCollection<AudioPart>("audioParts");
    }
  },

  lyrics: {
    async findBySong(songId: string): Promise<LyricLine[]> {
      return queryCollection<LyricLine>("lyrics", { songId });
    },

    async create(lyric: LyricLine): Promise<LyricLine | null> {
      const result = await dbRequest<LyricLine>("POST", "lyrics", lyric.id, lyric);
      return result.success ? lyric : null;
    },

    async update(id: string, updates: Partial<LyricLine>): Promise<LyricLine | null> {
      const lyrics = await queryCollection<LyricLine>("lyrics");
      const existing = lyrics.find(l => l.id === id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<LyricLine>("PUT", "lyrics", id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", "lyrics", id);
      return result.success;
    },

    async getAll(): Promise<LyricLine[]> {
      return queryCollection<LyricLine>("lyrics");
    }
  },

  reportedContent: {
    async findById(id: string): Promise<ReportedContent | null> {
      const result = await dbRequest<ReportedContent>("GET", "reportedContent", id);
      return result.success && result.data ? result.data : null;
    },

    async findByOrganization(organizationId: string): Promise<ReportedContent[]> {
      return queryCollection<ReportedContent>("reportedContent", { organizationId });
    },

    async create(report: ReportedContent): Promise<ReportedContent | null> {
      const result = await dbRequest<ReportedContent>("POST", "reportedContent", report.id, report);
      return result.success ? report : null;
    },

    async update(id: string, updates: Partial<ReportedContent>): Promise<ReportedContent | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<ReportedContent>("PUT", "reportedContent", id, updated);
      return result.success ? updated : null;
    },

    async getAll(): Promise<ReportedContent[]> {
      return queryCollection<ReportedContent>("reportedContent");
    }
  },

  activityLogs: {
    async findByOrganization(organizationId: string): Promise<ActivityLog[]> {
      return queryCollection<ActivityLog>("activityLogs", { organizationId });
    },

    async create(log: ActivityLog): Promise<ActivityLog | null> {
      const result = await dbRequest<ActivityLog>("POST", "activityLogs", log.id, log);
      return result.success ? log : null;
    },

    async getAll(): Promise<ActivityLog[]> {
      return queryCollection<ActivityLog>("activityLogs");
    }
  },

  invitations: {
    async findByToken(token: string): Promise<Invitation | null> {
      const invitations = await queryCollection<Invitation>("invitations", { token });
      return invitations.length > 0 ? invitations[0] : null;
    },

    async findByOrganization(organizationId: string): Promise<Invitation[]> {
      return queryCollection<Invitation>("invitations", { organizationId });
    },

    async create(invitation: Invitation): Promise<Invitation | null> {
      const result = await dbRequest<Invitation>("POST", "invitations", invitation.id, invitation);
      return result.success ? invitation : null;
    },

    async update(id: string, updates: Partial<Invitation>): Promise<Invitation | null> {
      const invitations = await queryCollection<Invitation>("invitations");
      const existing = invitations.find(i => i.id === id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<Invitation>("PUT", "invitations", id, updated);
      return result.success ? updated : null;
    },

    async getAll(): Promise<Invitation[]> {
      return queryCollection<Invitation>("invitations");
    }
  }
};

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}${randomPart2}`;
}
