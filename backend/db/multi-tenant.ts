import {
  GlobalUser,
  GlobalSession,
  PlatformSettings,
  PlatformAuditLog,
  Tenant,
  TenantFeatureFlag,
  TenantUsageMetrics,
  TenantMembership,
  BaseMemberProfile,
  FamilyUnit,
  Group,
  GroupMembership,
  TenantMinistry,
  MinistryMembership,
  TenantEvent,
  EventRegistration,
  AttendanceRecord,
  AttendanceSummary,
  InternalNote,
  Document,
  DocumentFolder,
  SystemNotification,
  TenantAnnouncement,
  TenantDonation,
  DonationFund,
  TenantRecurringGiving,
  TenantInvitation,
  TenantAuditLog,
  COLLECTIONS,
  TenantProfile,
} from "@/types/schema";

const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

interface DbResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const memoryStore: Record<string, Record<string, unknown>> = {};

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

const loadedCollections = new Set<string>();

async function loadCollectionFromExternalDb<T extends { id: string }>(collection: string): Promise<void> {
  if (loadedCollections.has(collection)) return;
  if (!DB_ENDPOINT || !DB_TOKEN) {
    loadedCollections.add(collection);
    return;
  }
  
  try {
    const url = `${DB_ENDPOINT}/${DB_NAMESPACE}/${collection}`;
    console.log(`MultiTenantDB: Loading ${collection} from external database`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DB_TOKEN}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach((item: T) => {
          if (item && item.id) {
            setMemoryItem(collection, item);
          }
        });
        console.log(`MultiTenantDB: Loaded ${data.length} items from external ${collection}`);
      } else if (data && typeof data === 'object') {
        Object.values(data).forEach((item: unknown) => {
          const typedItem = item as T;
          if (typedItem && typedItem.id) {
            setMemoryItem(collection, typedItem);
          }
        });
        console.log(`MultiTenantDB: Loaded items from external ${collection}`);
      }
    } else {
      console.log(`MultiTenantDB: External DB returned ${response.status} for ${collection}`);
    }
  } catch (error) {
    console.log(`MultiTenantDB: Failed to load ${collection} from external DB:`, error);
  }
  
  loadedCollections.add(collection);
}

async function dbRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  collection: string,
  id?: string,
  body?: unknown
): Promise<DbResponse<T>> {
  await loadCollectionFromExternalDb(collection);
  
  console.log(`MultiTenantDB: Using memory store for ${method} ${collection}${id ? `/${id}` : ""}`);
  const memoryResult = handleMemoryRequest<T>(method, collection, id, body);
  
  if (!memoryResult.success) {
    console.error(`Memory store failed for ${method} ${collection}:`, memoryResult.error);
  }
  
  if (DB_ENDPOINT && DB_TOKEN && (method === "POST" || method === "PUT" || method === "DELETE")) {
    const url = id 
      ? `${DB_ENDPOINT}/${DB_NAMESPACE}/${collection}/${id}`
      : `${DB_ENDPOINT}/${DB_NAMESPACE}/${collection}`;
    const actualMethod = method === "POST" && id ? "PUT" : method;
    
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
  await loadCollectionFromExternalDb(collection);
  
  const items = getMemoryCollection<T>(collection);
  
  if (!filter || Object.keys(filter).length === 0) {
    return items;
  }
  
  return items.filter((item) => {
    const itemObj = item as Record<string, unknown>;
    return Object.entries(filter).every(([key, value]) => {
      if (value === undefined || value === null) return true;
      if (typeof value === 'string') {
        return String(itemObj[key]).toLowerCase() === value.toLowerCase();
      }
      return itemObj[key] === value;
    });
  });
}

async function queryByTenant<T>(
  collection: string,
  tenantId: string,
  additionalFilter?: Record<string, unknown>
): Promise<T[]> {
  const filter = { tenantId, ...additionalFilter };
  return queryCollection<T>(collection, filter);
}

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}${randomPart2}`;
}

export const multiTenantDb = {
  globalUsers: {
    async findById(id: string): Promise<GlobalUser | null> {
      const result = await dbRequest<GlobalUser>("GET", COLLECTIONS.GLOBAL_USERS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByEmail(email: string): Promise<GlobalUser | null> {
      const users = await queryCollection<GlobalUser>(COLLECTIONS.GLOBAL_USERS, { email: email.toLowerCase() });
      return users.length > 0 ? users[0] : null;
    },

    async create(user: GlobalUser): Promise<GlobalUser | null> {
      console.log("MultiTenantDB: Creating global user:", user.email);
      const result = await dbRequest<GlobalUser>("POST", COLLECTIONS.GLOBAL_USERS, user.id, user);
      return result.success ? user : null;
    },

    async update(id: string, updates: Partial<GlobalUser>): Promise<GlobalUser | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<GlobalUser>("PUT", COLLECTIONS.GLOBAL_USERS, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    },

    async getAll(): Promise<GlobalUser[]> {
      const users = await queryCollection<GlobalUser>(COLLECTIONS.GLOBAL_USERS);
      return users.filter(u => !u.deletedAt);
    }
  },

  globalSessions: {
    async findByToken(token: string): Promise<GlobalSession | null> {
      const sessions = await queryCollection<GlobalSession>(COLLECTIONS.GLOBAL_SESSIONS, { token });
      return sessions.length > 0 ? sessions[0] : null;
    },

    async findByUserId(userId: string): Promise<GlobalSession[]> {
      return queryCollection<GlobalSession>(COLLECTIONS.GLOBAL_SESSIONS, { userId });
    },

    async create(session: GlobalSession): Promise<GlobalSession | null> {
      const result = await dbRequest<GlobalSession>("POST", COLLECTIONS.GLOBAL_SESSIONS, session.id, session);
      return result.success ? session : null;
    },

    async update(id: string, updates: Partial<GlobalSession>): Promise<GlobalSession | null> {
      const sessions = await queryCollection<GlobalSession>(COLLECTIONS.GLOBAL_SESSIONS);
      const existing = sessions.find(s => s.id === id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<GlobalSession>("PUT", COLLECTIONS.GLOBAL_SESSIONS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.GLOBAL_SESSIONS, id);
      return result.success;
    },

    async deleteExpired(): Promise<number> {
      const sessions = await queryCollection<GlobalSession>(COLLECTIONS.GLOBAL_SESSIONS);
      const now = new Date();
      let deleted = 0;
      for (const session of sessions) {
        if (new Date(session.expiresAt) < now) {
          await this.delete(session.id);
          deleted++;
        }
      }
      return deleted;
    }
  },

  platformSettings: {
    async findByKey(key: string): Promise<PlatformSettings | null> {
      const settings = await queryCollection<PlatformSettings>(COLLECTIONS.PLATFORM_SETTINGS, { key });
      return settings.length > 0 ? settings[0] : null;
    },

    async upsert(setting: PlatformSettings): Promise<PlatformSettings | null> {
      const result = await dbRequest<PlatformSettings>("POST", COLLECTIONS.PLATFORM_SETTINGS, setting.id, setting);
      return result.success ? setting : null;
    },

    async getAll(): Promise<PlatformSettings[]> {
      return queryCollection<PlatformSettings>(COLLECTIONS.PLATFORM_SETTINGS);
    },

    async getPublic(): Promise<PlatformSettings[]> {
      return queryCollection<PlatformSettings>(COLLECTIONS.PLATFORM_SETTINGS, { isPublic: true });
    }
  },

  platformAuditLogs: {
    async create(log: PlatformAuditLog): Promise<PlatformAuditLog | null> {
      const result = await dbRequest<PlatformAuditLog>("POST", COLLECTIONS.PLATFORM_AUDIT_LOGS, log.id, log);
      return result.success ? log : null;
    },

    async findByTenant(tenantId: string): Promise<PlatformAuditLog[]> {
      return queryCollection<PlatformAuditLog>(COLLECTIONS.PLATFORM_AUDIT_LOGS, { tenantId });
    },

    async findByUser(userId: string): Promise<PlatformAuditLog[]> {
      return queryCollection<PlatformAuditLog>(COLLECTIONS.PLATFORM_AUDIT_LOGS, { userId });
    },

    async getAll(): Promise<PlatformAuditLog[]> {
      return queryCollection<PlatformAuditLog>(COLLECTIONS.PLATFORM_AUDIT_LOGS);
    }
  },

  tenants: {
    async findById(id: string): Promise<Tenant | null> {
      const result = await dbRequest<Tenant>("GET", COLLECTIONS.TENANTS, id);
      const tenant = result.success && result.data ? result.data : null;
      return tenant && !tenant.deletedAt ? tenant : null;
    },

    async create(tenant: Tenant): Promise<Tenant | null> {
      console.log("MultiTenantDB: Creating tenant:", tenant.name);
      const result = await dbRequest<Tenant>("POST", COLLECTIONS.TENANTS, tenant.id, tenant);
      return result.success ? tenant : null;
    },

    async update(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<Tenant>("PUT", COLLECTIONS.TENANTS, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { 
        deletedAt: new Date().toISOString(),
        status: 'archived'
      })) !== null;
    },

    async findByOwner(ownerId: string): Promise<Tenant[]> {
      const tenants = await queryCollection<Tenant>(COLLECTIONS.TENANTS, { ownerId });
      return tenants.filter(t => !t.deletedAt);
    },

    async findByStatus(status: string): Promise<Tenant[]> {
      const tenants = await queryCollection<Tenant>(COLLECTIONS.TENANTS, { status });
      return tenants.filter(t => !t.deletedAt);
    },

    async getAll(): Promise<Tenant[]> {
      const tenants = await queryCollection<Tenant>(COLLECTIONS.TENANTS);
      return tenants.filter(t => !t.deletedAt);
    },

    async getActive(): Promise<Tenant[]> {
      const tenants = await queryCollection<Tenant>(COLLECTIONS.TENANTS, { status: 'active' });
      return tenants.filter(t => !t.deletedAt);
    }
  },

  tenantFeatureFlags: {
    async findByTenant(tenantId: string): Promise<TenantFeatureFlag[]> {
      return queryByTenant<TenantFeatureFlag>(COLLECTIONS.TENANT_FEATURE_FLAGS, tenantId);
    },

    async findByKey(tenantId: string, featureKey: string): Promise<TenantFeatureFlag | null> {
      const flags = await queryByTenant<TenantFeatureFlag>(COLLECTIONS.TENANT_FEATURE_FLAGS, tenantId, { featureKey });
      return flags.length > 0 ? flags[0] : null;
    },

    async upsert(flag: TenantFeatureFlag): Promise<TenantFeatureFlag | null> {
      const result = await dbRequest<TenantFeatureFlag>("POST", COLLECTIONS.TENANT_FEATURE_FLAGS, flag.id, flag);
      return result.success ? flag : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.TENANT_FEATURE_FLAGS, id);
      return result.success;
    }
  },

  tenantUsageMetrics: {
    async findByTenant(tenantId: string): Promise<TenantUsageMetrics[]> {
      return queryByTenant<TenantUsageMetrics>(COLLECTIONS.TENANT_USAGE_METRICS, tenantId);
    },

    async findByPeriod(tenantId: string, period: string): Promise<TenantUsageMetrics | null> {
      const metrics = await queryByTenant<TenantUsageMetrics>(COLLECTIONS.TENANT_USAGE_METRICS, tenantId, { period });
      return metrics.length > 0 ? metrics[0] : null;
    },

    async upsert(metrics: TenantUsageMetrics): Promise<TenantUsageMetrics | null> {
      const result = await dbRequest<TenantUsageMetrics>("POST", COLLECTIONS.TENANT_USAGE_METRICS, metrics.id, metrics);
      return result.success ? metrics : null;
    }
  },

  tenantMemberships: {
    async findById(id: string): Promise<TenantMembership | null> {
      const result = await dbRequest<TenantMembership>("GET", COLLECTIONS.TENANT_MEMBERSHIPS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByUserAndTenant(userId: string, tenantId: string): Promise<TenantMembership | null> {
      const memberships = await queryCollection<TenantMembership>(COLLECTIONS.TENANT_MEMBERSHIPS, { userId, tenantId });
      return memberships.length > 0 ? memberships[0] : null;
    },

    async findByUser(userId: string): Promise<TenantMembership[]> {
      return queryCollection<TenantMembership>(COLLECTIONS.TENANT_MEMBERSHIPS, { userId });
    },

    async findByTenant(tenantId: string): Promise<TenantMembership[]> {
      return queryByTenant<TenantMembership>(COLLECTIONS.TENANT_MEMBERSHIPS, tenantId);
    },

    async findActiveByTenant(tenantId: string): Promise<TenantMembership[]> {
      return queryByTenant<TenantMembership>(COLLECTIONS.TENANT_MEMBERSHIPS, tenantId, { status: 'active' });
    },

    async create(membership: TenantMembership): Promise<TenantMembership | null> {
      console.log("MultiTenantDB: Creating tenant membership for user:", membership.userId);
      const result = await dbRequest<TenantMembership>("POST", COLLECTIONS.TENANT_MEMBERSHIPS, membership.id, membership);
      return result.success ? membership : null;
    },

    async update(id: string, updates: Partial<TenantMembership>): Promise<TenantMembership | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<TenantMembership>("PUT", COLLECTIONS.TENANT_MEMBERSHIPS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.TENANT_MEMBERSHIPS, id);
      return result.success;
    }
  },

  memberProfiles: {
    async findById(id: string): Promise<TenantProfile | null> {
      const result = await dbRequest<TenantProfile>("GET", COLLECTIONS.MEMBER_PROFILES, id);
      const profile = result.success && result.data ? result.data : null;
      return profile && !profile.deletedAt ? profile : null;
    },

    async findByMembership(membershipId: string): Promise<TenantProfile | null> {
      const profiles = await queryCollection<TenantProfile>(COLLECTIONS.MEMBER_PROFILES, { membershipId });
      const profile = profiles.length > 0 ? profiles[0] : null;
      return profile && !profile.deletedAt ? profile : null;
    },

    async findByTenant(tenantId: string): Promise<TenantProfile[]> {
      const profiles = await queryByTenant<TenantProfile>(COLLECTIONS.MEMBER_PROFILES, tenantId);
      return profiles.filter(p => !p.deletedAt);
    },

    async findByType(tenantId: string, profileType: string): Promise<TenantProfile[]> {
      const profiles = await queryByTenant<TenantProfile>(COLLECTIONS.MEMBER_PROFILES, tenantId, { profileType });
      return profiles.filter(p => !p.deletedAt);
    },

    async create(profile: BaseMemberProfile): Promise<BaseMemberProfile | null> {
      console.log("MultiTenantDB: Creating member profile:", profile.displayName);
      const result = await dbRequest<BaseMemberProfile>("POST", COLLECTIONS.MEMBER_PROFILES, profile.id, profile);
      return result.success ? profile : null;
    },

    async update(id: string, updates: Partial<BaseMemberProfile>): Promise<BaseMemberProfile | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<BaseMemberProfile>("PUT", COLLECTIONS.MEMBER_PROFILES, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    }
  },

  familyUnits: {
    async findById(id: string): Promise<FamilyUnit | null> {
      const result = await dbRequest<FamilyUnit>("GET", COLLECTIONS.FAMILY_UNITS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByTenant(tenantId: string): Promise<FamilyUnit[]> {
      return queryByTenant<FamilyUnit>(COLLECTIONS.FAMILY_UNITS, tenantId);
    },

    async create(family: FamilyUnit): Promise<FamilyUnit | null> {
      const result = await dbRequest<FamilyUnit>("POST", COLLECTIONS.FAMILY_UNITS, family.id, family);
      return result.success ? family : null;
    },

    async update(id: string, updates: Partial<FamilyUnit>): Promise<FamilyUnit | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<FamilyUnit>("PUT", COLLECTIONS.FAMILY_UNITS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.FAMILY_UNITS, id);
      return result.success;
    }
  },

  groups: {
    async findById(id: string): Promise<Group | null> {
      const result = await dbRequest<Group>("GET", COLLECTIONS.GROUPS, id);
      const group = result.success && result.data ? result.data : null;
      return group && !group.deletedAt ? group : null;
    },

    async findByTenant(tenantId: string): Promise<Group[]> {
      const groups = await queryByTenant<Group>(COLLECTIONS.GROUPS, tenantId);
      return groups.filter(g => !g.deletedAt);
    },

    async findByStatus(tenantId: string, status: string): Promise<Group[]> {
      const groups = await queryByTenant<Group>(COLLECTIONS.GROUPS, tenantId, { status });
      return groups.filter(g => !g.deletedAt);
    },

    async create(group: Group): Promise<Group | null> {
      console.log("MultiTenantDB: Creating group:", group.name);
      const result = await dbRequest<Group>("POST", COLLECTIONS.GROUPS, group.id, group);
      return result.success ? group : null;
    },

    async update(id: string, updates: Partial<Group>): Promise<Group | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<Group>("PUT", COLLECTIONS.GROUPS, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    }
  },

  groupMemberships: {
    async findById(id: string): Promise<GroupMembership | null> {
      const result = await dbRequest<GroupMembership>("GET", COLLECTIONS.GROUP_MEMBERSHIPS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByGroup(groupId: string): Promise<GroupMembership[]> {
      return queryCollection<GroupMembership>(COLLECTIONS.GROUP_MEMBERSHIPS, { groupId });
    },

    async findByMember(memberId: string): Promise<GroupMembership[]> {
      return queryCollection<GroupMembership>(COLLECTIONS.GROUP_MEMBERSHIPS, { memberId });
    },

    async findByMemberAndGroup(memberId: string, groupId: string): Promise<GroupMembership | null> {
      const memberships = await queryCollection<GroupMembership>(COLLECTIONS.GROUP_MEMBERSHIPS, { memberId, groupId });
      return memberships.length > 0 ? memberships[0] : null;
    },

    async create(membership: GroupMembership): Promise<GroupMembership | null> {
      const result = await dbRequest<GroupMembership>("POST", COLLECTIONS.GROUP_MEMBERSHIPS, membership.id, membership);
      return result.success ? membership : null;
    },

    async update(id: string, updates: Partial<GroupMembership>): Promise<GroupMembership | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<GroupMembership>("PUT", COLLECTIONS.GROUP_MEMBERSHIPS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.GROUP_MEMBERSHIPS, id);
      return result.success;
    }
  },

  tenantMinistries: {
    async findById(id: string): Promise<TenantMinistry | null> {
      const result = await dbRequest<TenantMinistry>("GET", COLLECTIONS.TENANT_MINISTRIES, id);
      const ministry = result.success && result.data ? result.data : null;
      return ministry && !ministry.deletedAt ? ministry : null;
    },

    async findByTenant(tenantId: string): Promise<TenantMinistry[]> {
      const ministries = await queryByTenant<TenantMinistry>(COLLECTIONS.TENANT_MINISTRIES, tenantId);
      return ministries.filter(m => !m.deletedAt);
    },

    async findByStatus(tenantId: string, status: string): Promise<TenantMinistry[]> {
      const ministries = await queryByTenant<TenantMinistry>(COLLECTIONS.TENANT_MINISTRIES, tenantId, { status });
      return ministries.filter(m => !m.deletedAt);
    },

    async create(ministry: TenantMinistry): Promise<TenantMinistry | null> {
      console.log("MultiTenantDB: Creating ministry:", ministry.name);
      const result = await dbRequest<TenantMinistry>("POST", COLLECTIONS.TENANT_MINISTRIES, ministry.id, ministry);
      return result.success ? ministry : null;
    },

    async update(id: string, updates: Partial<TenantMinistry>): Promise<TenantMinistry | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<TenantMinistry>("PUT", COLLECTIONS.TENANT_MINISTRIES, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    }
  },

  ministryMemberships: {
    async findById(id: string): Promise<MinistryMembership | null> {
      const result = await dbRequest<MinistryMembership>("GET", COLLECTIONS.MINISTRY_MEMBERSHIPS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByMinistry(ministryId: string): Promise<MinistryMembership[]> {
      return queryCollection<MinistryMembership>(COLLECTIONS.MINISTRY_MEMBERSHIPS, { ministryId });
    },

    async findByMember(memberId: string): Promise<MinistryMembership[]> {
      return queryCollection<MinistryMembership>(COLLECTIONS.MINISTRY_MEMBERSHIPS, { memberId });
    },

    async findByMemberAndMinistry(memberId: string, ministryId: string): Promise<MinistryMembership | null> {
      const memberships = await queryCollection<MinistryMembership>(COLLECTIONS.MINISTRY_MEMBERSHIPS, { memberId, ministryId });
      return memberships.length > 0 ? memberships[0] : null;
    },

    async create(membership: MinistryMembership): Promise<MinistryMembership | null> {
      const result = await dbRequest<MinistryMembership>("POST", COLLECTIONS.MINISTRY_MEMBERSHIPS, membership.id, membership);
      return result.success ? membership : null;
    },

    async update(id: string, updates: Partial<MinistryMembership>): Promise<MinistryMembership | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<MinistryMembership>("PUT", COLLECTIONS.MINISTRY_MEMBERSHIPS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.MINISTRY_MEMBERSHIPS, id);
      return result.success;
    }
  },

  tenantEvents: {
    async findById(id: string): Promise<TenantEvent | null> {
      const result = await dbRequest<TenantEvent>("GET", COLLECTIONS.TENANT_EVENTS, id);
      const event = result.success && result.data ? result.data : null;
      return event && !event.deletedAt ? event : null;
    },

    async findByTenant(tenantId: string): Promise<TenantEvent[]> {
      const events = await queryByTenant<TenantEvent>(COLLECTIONS.TENANT_EVENTS, tenantId);
      return events.filter(e => !e.deletedAt);
    },

    async findUpcoming(tenantId: string): Promise<TenantEvent[]> {
      const events = await this.findByTenant(tenantId);
      const now = new Date().toISOString();
      return events.filter(e => e.startDate >= now && e.status === 'published');
    },

    async findByMinistry(tenantId: string, ministryId: string): Promise<TenantEvent[]> {
      const events = await queryByTenant<TenantEvent>(COLLECTIONS.TENANT_EVENTS, tenantId, { ministryId });
      return events.filter(e => !e.deletedAt);
    },

    async create(event: TenantEvent): Promise<TenantEvent | null> {
      console.log("MultiTenantDB: Creating event:", event.title);
      const result = await dbRequest<TenantEvent>("POST", COLLECTIONS.TENANT_EVENTS, event.id, event);
      return result.success ? event : null;
    },

    async update(id: string, updates: Partial<TenantEvent>): Promise<TenantEvent | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<TenantEvent>("PUT", COLLECTIONS.TENANT_EVENTS, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    }
  },

  eventRegistrations: {
    async findById(id: string): Promise<EventRegistration | null> {
      const result = await dbRequest<EventRegistration>("GET", COLLECTIONS.EVENT_REGISTRATIONS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByEvent(eventId: string): Promise<EventRegistration[]> {
      return queryCollection<EventRegistration>(COLLECTIONS.EVENT_REGISTRATIONS, { eventId });
    },

    async findByMember(memberId: string): Promise<EventRegistration[]> {
      return queryCollection<EventRegistration>(COLLECTIONS.EVENT_REGISTRATIONS, { memberId });
    },

    async findByMemberAndEvent(memberId: string, eventId: string): Promise<EventRegistration | null> {
      const registrations = await queryCollection<EventRegistration>(COLLECTIONS.EVENT_REGISTRATIONS, { memberId, eventId });
      return registrations.length > 0 ? registrations[0] : null;
    },

    async create(registration: EventRegistration): Promise<EventRegistration | null> {
      const result = await dbRequest<EventRegistration>("POST", COLLECTIONS.EVENT_REGISTRATIONS, registration.id, registration);
      return result.success ? registration : null;
    },

    async update(id: string, updates: Partial<EventRegistration>): Promise<EventRegistration | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<EventRegistration>("PUT", COLLECTIONS.EVENT_REGISTRATIONS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.EVENT_REGISTRATIONS, id);
      return result.success;
    }
  },

  attendanceRecords: {
    async findById(id: string): Promise<AttendanceRecord | null> {
      const result = await dbRequest<AttendanceRecord>("GET", COLLECTIONS.ATTENDANCE_RECORDS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByTenant(tenantId: string): Promise<AttendanceRecord[]> {
      return queryByTenant<AttendanceRecord>(COLLECTIONS.ATTENDANCE_RECORDS, tenantId);
    },

    async findByDate(tenantId: string, date: string): Promise<AttendanceRecord[]> {
      return queryByTenant<AttendanceRecord>(COLLECTIONS.ATTENDANCE_RECORDS, tenantId, { date });
    },

    async findByReference(referenceId: string): Promise<AttendanceRecord[]> {
      return queryCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE_RECORDS, { referenceId });
    },

    async findByMember(memberId: string): Promise<AttendanceRecord[]> {
      return queryCollection<AttendanceRecord>(COLLECTIONS.ATTENDANCE_RECORDS, { memberId });
    },

    async create(record: AttendanceRecord): Promise<AttendanceRecord | null> {
      const result = await dbRequest<AttendanceRecord>("POST", COLLECTIONS.ATTENDANCE_RECORDS, record.id, record);
      return result.success ? record : null;
    },

    async update(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates };
      const result = await dbRequest<AttendanceRecord>("PUT", COLLECTIONS.ATTENDANCE_RECORDS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.ATTENDANCE_RECORDS, id);
      return result.success;
    }
  },

  attendanceSummaries: {
    async findById(id: string): Promise<AttendanceSummary | null> {
      const result = await dbRequest<AttendanceSummary>("GET", COLLECTIONS.ATTENDANCE_SUMMARIES, id);
      return result.success && result.data ? result.data : null;
    },

    async findByTenant(tenantId: string): Promise<AttendanceSummary[]> {
      return queryByTenant<AttendanceSummary>(COLLECTIONS.ATTENDANCE_SUMMARIES, tenantId);
    },

    async findByDate(tenantId: string, date: string): Promise<AttendanceSummary[]> {
      return queryByTenant<AttendanceSummary>(COLLECTIONS.ATTENDANCE_SUMMARIES, tenantId, { date });
    },

    async create(summary: AttendanceSummary): Promise<AttendanceSummary | null> {
      const result = await dbRequest<AttendanceSummary>("POST", COLLECTIONS.ATTENDANCE_SUMMARIES, summary.id, summary);
      return result.success ? summary : null;
    },

    async update(id: string, updates: Partial<AttendanceSummary>): Promise<AttendanceSummary | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<AttendanceSummary>("PUT", COLLECTIONS.ATTENDANCE_SUMMARIES, id, updated);
      return result.success ? updated : null;
    }
  },

  internalNotes: {
    async findById(id: string): Promise<InternalNote | null> {
      const result = await dbRequest<InternalNote>("GET", COLLECTIONS.INTERNAL_NOTES, id);
      const note = result.success && result.data ? result.data : null;
      return note && !note.deletedAt ? note : null;
    },

    async findByTenant(tenantId: string): Promise<InternalNote[]> {
      const notes = await queryByTenant<InternalNote>(COLLECTIONS.INTERNAL_NOTES, tenantId);
      return notes.filter(n => !n.deletedAt);
    },

    async findBySubject(subjectType: string, subjectId: string): Promise<InternalNote[]> {
      const notes = await queryCollection<InternalNote>(COLLECTIONS.INTERNAL_NOTES, { subjectType, subjectId });
      return notes.filter(n => !n.deletedAt);
    },

    async findRequiringFollowUp(tenantId: string): Promise<InternalNote[]> {
      const notes = await queryByTenant<InternalNote>(COLLECTIONS.INTERNAL_NOTES, tenantId, { 
        requiresFollowUp: true, 
        followUpCompleted: false 
      });
      return notes.filter(n => !n.deletedAt);
    },

    async create(note: InternalNote): Promise<InternalNote | null> {
      const result = await dbRequest<InternalNote>("POST", COLLECTIONS.INTERNAL_NOTES, note.id, note);
      return result.success ? note : null;
    },

    async update(id: string, updates: Partial<InternalNote>): Promise<InternalNote | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<InternalNote>("PUT", COLLECTIONS.INTERNAL_NOTES, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    }
  },

  documents: {
    async findById(id: string): Promise<Document | null> {
      const result = await dbRequest<Document>("GET", COLLECTIONS.DOCUMENTS, id);
      const doc = result.success && result.data ? result.data : null;
      return doc && !doc.deletedAt ? doc : null;
    },

    async findByTenant(tenantId: string): Promise<Document[]> {
      const docs = await queryByTenant<Document>(COLLECTIONS.DOCUMENTS, tenantId);
      return docs.filter(d => !d.deletedAt);
    },

    async findByFolder(folderId: string): Promise<Document[]> {
      const docs = await queryCollection<Document>(COLLECTIONS.DOCUMENTS, { folderId });
      return docs.filter(d => !d.deletedAt);
    },

    async findByCategory(tenantId: string, category: string): Promise<Document[]> {
      const docs = await queryByTenant<Document>(COLLECTIONS.DOCUMENTS, tenantId, { category });
      return docs.filter(d => !d.deletedAt);
    },

    async create(doc: Document): Promise<Document | null> {
      console.log("MultiTenantDB: Creating document:", doc.fileName);
      const result = await dbRequest<Document>("POST", COLLECTIONS.DOCUMENTS, doc.id, doc);
      return result.success ? doc : null;
    },

    async update(id: string, updates: Partial<Document>): Promise<Document | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<Document>("PUT", COLLECTIONS.DOCUMENTS, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    }
  },

  documentFolders: {
    async findById(id: string): Promise<DocumentFolder | null> {
      const result = await dbRequest<DocumentFolder>("GET", COLLECTIONS.DOCUMENT_FOLDERS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByTenant(tenantId: string): Promise<DocumentFolder[]> {
      return queryByTenant<DocumentFolder>(COLLECTIONS.DOCUMENT_FOLDERS, tenantId);
    },

    async findByParent(parentFolderId: string): Promise<DocumentFolder[]> {
      return queryCollection<DocumentFolder>(COLLECTIONS.DOCUMENT_FOLDERS, { parentFolderId });
    },

    async create(folder: DocumentFolder): Promise<DocumentFolder | null> {
      const result = await dbRequest<DocumentFolder>("POST", COLLECTIONS.DOCUMENT_FOLDERS, folder.id, folder);
      return result.success ? folder : null;
    },

    async update(id: string, updates: Partial<DocumentFolder>): Promise<DocumentFolder | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<DocumentFolder>("PUT", COLLECTIONS.DOCUMENT_FOLDERS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.DOCUMENT_FOLDERS, id);
      return result.success;
    }
  },

  systemNotifications: {
    async findById(id: string): Promise<SystemNotification | null> {
      const result = await dbRequest<SystemNotification>("GET", COLLECTIONS.SYSTEM_NOTIFICATIONS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByUser(userId: string): Promise<SystemNotification[]> {
      return queryCollection<SystemNotification>(COLLECTIONS.SYSTEM_NOTIFICATIONS, { userId });
    },

    async findUnreadByUser(userId: string): Promise<SystemNotification[]> {
      return queryCollection<SystemNotification>(COLLECTIONS.SYSTEM_NOTIFICATIONS, { userId, isRead: false });
    },

    async create(notification: SystemNotification): Promise<SystemNotification | null> {
      const result = await dbRequest<SystemNotification>("POST", COLLECTIONS.SYSTEM_NOTIFICATIONS, notification.id, notification);
      return result.success ? notification : null;
    },

    async markAsRead(id: string): Promise<SystemNotification | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, isRead: true, readAt: new Date().toISOString() };
      const result = await dbRequest<SystemNotification>("PUT", COLLECTIONS.SYSTEM_NOTIFICATIONS, id, updated);
      return result.success ? updated : null;
    },

    async dismiss(id: string): Promise<SystemNotification | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, isDismissed: true, dismissedAt: new Date().toISOString() };
      const result = await dbRequest<SystemNotification>("PUT", COLLECTIONS.SYSTEM_NOTIFICATIONS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.SYSTEM_NOTIFICATIONS, id);
      return result.success;
    }
  },

  tenantAnnouncements: {
    async findById(id: string): Promise<TenantAnnouncement | null> {
      const result = await dbRequest<TenantAnnouncement>("GET", COLLECTIONS.TENANT_ANNOUNCEMENTS, id);
      const announcement = result.success && result.data ? result.data : null;
      return announcement && !announcement.deletedAt ? announcement : null;
    },

    async findByTenant(tenantId: string): Promise<TenantAnnouncement[]> {
      const announcements = await queryByTenant<TenantAnnouncement>(COLLECTIONS.TENANT_ANNOUNCEMENTS, tenantId);
      return announcements.filter(a => !a.deletedAt);
    },

    async findPublished(tenantId: string): Promise<TenantAnnouncement[]> {
      const announcements = await queryByTenant<TenantAnnouncement>(COLLECTIONS.TENANT_ANNOUNCEMENTS, tenantId, { status: 'published' });
      return announcements.filter(a => !a.deletedAt);
    },

    async create(announcement: TenantAnnouncement): Promise<TenantAnnouncement | null> {
      console.log("MultiTenantDB: Creating announcement:", announcement.title);
      const result = await dbRequest<TenantAnnouncement>("POST", COLLECTIONS.TENANT_ANNOUNCEMENTS, announcement.id, announcement);
      return result.success ? announcement : null;
    },

    async update(id: string, updates: Partial<TenantAnnouncement>): Promise<TenantAnnouncement | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<TenantAnnouncement>("PUT", COLLECTIONS.TENANT_ANNOUNCEMENTS, id, updated);
      return result.success ? updated : null;
    },

    async softDelete(id: string): Promise<boolean> {
      return (await this.update(id, { deletedAt: new Date().toISOString() })) !== null;
    }
  },

  tenantDonations: {
    async findById(id: string): Promise<TenantDonation | null> {
      const result = await dbRequest<TenantDonation>("GET", COLLECTIONS.TENANT_DONATIONS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByTenant(tenantId: string): Promise<TenantDonation[]> {
      return queryByTenant<TenantDonation>(COLLECTIONS.TENANT_DONATIONS, tenantId);
    },

    async findByMember(memberId: string): Promise<TenantDonation[]> {
      return queryCollection<TenantDonation>(COLLECTIONS.TENANT_DONATIONS, { memberId });
    },

    async findByFund(fundId: string): Promise<TenantDonation[]> {
      return queryCollection<TenantDonation>(COLLECTIONS.TENANT_DONATIONS, { fundId });
    },

    async create(donation: TenantDonation): Promise<TenantDonation | null> {
      console.log("MultiTenantDB: Creating donation:", donation.amount);
      const result = await dbRequest<TenantDonation>("POST", COLLECTIONS.TENANT_DONATIONS, donation.id, donation);
      return result.success ? donation : null;
    },

    async update(id: string, updates: Partial<TenantDonation>): Promise<TenantDonation | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<TenantDonation>("PUT", COLLECTIONS.TENANT_DONATIONS, id, updated);
      return result.success ? updated : null;
    }
  },

  donationFunds: {
    async findById(id: string): Promise<DonationFund | null> {
      const result = await dbRequest<DonationFund>("GET", COLLECTIONS.DONATION_FUNDS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByTenant(tenantId: string): Promise<DonationFund[]> {
      return queryByTenant<DonationFund>(COLLECTIONS.DONATION_FUNDS, tenantId);
    },

    async findActive(tenantId: string): Promise<DonationFund[]> {
      return queryByTenant<DonationFund>(COLLECTIONS.DONATION_FUNDS, tenantId, { isActive: true });
    },

    async create(fund: DonationFund): Promise<DonationFund | null> {
      const result = await dbRequest<DonationFund>("POST", COLLECTIONS.DONATION_FUNDS, fund.id, fund);
      return result.success ? fund : null;
    },

    async update(id: string, updates: Partial<DonationFund>): Promise<DonationFund | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<DonationFund>("PUT", COLLECTIONS.DONATION_FUNDS, id, updated);
      return result.success ? updated : null;
    }
  },

  tenantRecurringGiving: {
    async findById(id: string): Promise<TenantRecurringGiving | null> {
      const result = await dbRequest<TenantRecurringGiving>("GET", COLLECTIONS.TENANT_RECURRING_GIVING, id);
      return result.success && result.data ? result.data : null;
    },

    async findByMember(memberId: string): Promise<TenantRecurringGiving[]> {
      return queryCollection<TenantRecurringGiving>(COLLECTIONS.TENANT_RECURRING_GIVING, { memberId });
    },

    async findActive(tenantId: string): Promise<TenantRecurringGiving[]> {
      return queryByTenant<TenantRecurringGiving>(COLLECTIONS.TENANT_RECURRING_GIVING, tenantId, { status: 'active' });
    },

    async create(recurring: TenantRecurringGiving): Promise<TenantRecurringGiving | null> {
      const result = await dbRequest<TenantRecurringGiving>("POST", COLLECTIONS.TENANT_RECURRING_GIVING, recurring.id, recurring);
      return result.success ? recurring : null;
    },

    async update(id: string, updates: Partial<TenantRecurringGiving>): Promise<TenantRecurringGiving | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<TenantRecurringGiving>("PUT", COLLECTIONS.TENANT_RECURRING_GIVING, id, updated);
      return result.success ? updated : null;
    }
  },

  tenantInvitations: {
    async findById(id: string): Promise<TenantInvitation | null> {
      const result = await dbRequest<TenantInvitation>("GET", COLLECTIONS.TENANT_INVITATIONS, id);
      return result.success && result.data ? result.data : null;
    },

    async findByToken(token: string): Promise<TenantInvitation | null> {
      const invitations = await queryCollection<TenantInvitation>(COLLECTIONS.TENANT_INVITATIONS, { token });
      return invitations.length > 0 ? invitations[0] : null;
    },

    async findByTenant(tenantId: string): Promise<TenantInvitation[]> {
      return queryByTenant<TenantInvitation>(COLLECTIONS.TENANT_INVITATIONS, tenantId);
    },

    async findPending(tenantId: string): Promise<TenantInvitation[]> {
      return queryByTenant<TenantInvitation>(COLLECTIONS.TENANT_INVITATIONS, tenantId, { status: 'pending' });
    },

    async findByEmail(email: string): Promise<TenantInvitation[]> {
      return queryCollection<TenantInvitation>(COLLECTIONS.TENANT_INVITATIONS, { email: email.toLowerCase() });
    },

    async create(invitation: TenantInvitation): Promise<TenantInvitation | null> {
      console.log("MultiTenantDB: Creating invitation for:", invitation.email);
      const result = await dbRequest<TenantInvitation>("POST", COLLECTIONS.TENANT_INVITATIONS, invitation.id, invitation);
      return result.success ? invitation : null;
    },

    async update(id: string, updates: Partial<TenantInvitation>): Promise<TenantInvitation | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      const result = await dbRequest<TenantInvitation>("PUT", COLLECTIONS.TENANT_INVITATIONS, id, updated);
      return result.success ? updated : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await dbRequest<void>("DELETE", COLLECTIONS.TENANT_INVITATIONS, id);
      return result.success;
    }
  },

  tenantAuditLogs: {
    async create(log: TenantAuditLog): Promise<TenantAuditLog | null> {
      const result = await dbRequest<TenantAuditLog>("POST", COLLECTIONS.TENANT_AUDIT_LOGS, log.id, log);
      return result.success ? log : null;
    },

    async findByTenant(tenantId: string): Promise<TenantAuditLog[]> {
      return queryByTenant<TenantAuditLog>(COLLECTIONS.TENANT_AUDIT_LOGS, tenantId);
    },

    async findByUser(tenantId: string, userId: string): Promise<TenantAuditLog[]> {
      return queryByTenant<TenantAuditLog>(COLLECTIONS.TENANT_AUDIT_LOGS, tenantId, { userId });
    },

    async findByResource(tenantId: string, resourceType: string, resourceId: string): Promise<TenantAuditLog[]> {
      return queryByTenant<TenantAuditLog>(COLLECTIONS.TENANT_AUDIT_LOGS, tenantId, { resourceType, resourceId });
    },

    async findByCategory(tenantId: string, actionCategory: string): Promise<TenantAuditLog[]> {
      return queryByTenant<TenantAuditLog>(COLLECTIONS.TENANT_AUDIT_LOGS, tenantId, { actionCategory });
    }
  }
};

export async function createAuditLog(
  tenantId: string,
  userId: string,
  userName: string,
  userEmail: string,
  userRole: string,
  action: string,
  actionCategory: string,
  resourceType: string,
  resourceId: string,
  resourceName?: string,
  previousValue?: unknown,
  newValue?: unknown,
  changeDescription?: string
): Promise<TenantAuditLog | null> {
  const log: TenantAuditLog = {
    id: generateId(),
    tenantId,
    userId,
    userName,
    userEmail,
    userRole: userRole as TenantAuditLog['userRole'],
    action,
    actionCategory: actionCategory as TenantAuditLog['actionCategory'],
    resourceType,
    resourceId,
    resourceName,
    previousValue: previousValue ? JSON.stringify(previousValue) : undefined,
    newValue: newValue ? JSON.stringify(newValue) : undefined,
    changeDescription,
    createdAt: new Date().toISOString(),
  };
  
  return multiTenantDb.tenantAuditLogs.create(log);
}

export async function createSystemNotification(
  userId: string,
  title: string,
  message: string,
  type: SystemNotification['type'],
  category: SystemNotification['category'],
  tenantId?: string,
  actionUrl?: string,
  actionLabel?: string
): Promise<SystemNotification | null> {
  const notification: SystemNotification = {
    id: generateId(),
    tenantId,
    userId,
    title,
    message,
    type,
    category,
    actionUrl,
    actionLabel,
    isRead: false,
    isDismissed: false,
    createdAt: new Date().toISOString(),
  };
  
  return multiTenantDb.systemNotifications.create(notification);
}
