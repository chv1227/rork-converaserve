import SwiftUI

/// Observable data layer for church content, mirroring DataProvider.tsx.
@MainActor
@Observable
final class DataStore {
    var announcements: [Announcement] = []
    var events: [ChurchEvent] = []
    var ministries: [Ministry] = []
    var conversations: [Conversation] = []
    var membersCount = 0
    var totalUnread = 0
    var givingStats = GivingStats()

    var isLoading = false
    private(set) var loadedOrgId: String?

    private let api = SupabaseService.shared

    var generalAnnouncements: [Announcement] {
        announcements.filter { $0.ministryId == nil || $0.ministryId?.isEmpty == true }
    }

    var upcomingEvents: [ChurchEvent] {
        let today = Calendar.current.startOfDay(for: Date())
        return events
            .filter { ($0.date ?? .distantPast) >= today }
            .sorted { ($0.date ?? .distantPast) < ($1.date ?? .distantPast) }
    }

    func loadAll(orgId: String, userId: String) async {
        loadedOrgId = orgId
        isLoading = announcements.isEmpty && events.isEmpty
        async let a: Void = loadAnnouncements(orgId)
        async let e: Void = loadEvents(orgId)
        async let m: Void = loadMinistries(orgId)
        async let c: Void = loadMembersCount(orgId)
        async let g: Void = loadGivingStats(orgId, userId: userId)
        async let conv: Void = loadConversations(orgId, userId: userId)
        _ = await (a, e, m, c, g, conv)
        isLoading = false
    }

    func refresh(orgId: String, userId: String) async {
        await loadAll(orgId: orgId, userId: userId)
    }

    // MARK: - Loaders

    func loadAnnouncements(_ orgId: String) async {
        do {
            let rows = try await api.select([DBAnnouncement].self, table: "announcements",
                query: "church_id=eq.\(orgId)&select=*,ministries(name)&order=is_pinned.desc,created_at.desc")
            announcements = rows.map {
                Announcement(
                    id: $0.id, title: $0.title, content: $0.content, date: $0.created_at,
                    ministryId: $0.ministry_id,
                    ministryName: $0.ministries?.name,
                    priority: $0.priority ?? "normal",
                    isPinned: $0.is_pinned ?? false
                )
            }
        } catch {
            print("DataStore: announcements error: \(error.localizedDescription)")
        }
    }

    func loadEvents(_ orgId: String) async {
        do {
            let rows = try await api.select([DBEvent].self, table: "events",
                query: "church_id=eq.\(orgId)&select=*,ministries(name,color)&order=start_datetime.asc")
            events = rows.map { e in
                let parts = (e.start_datetime ?? "").split(separator: "T")
                let day = parts.first.map(String.init) ?? ""
                let time = parts.count > 1 ? String(parts[1].prefix(5)) : ""
                return ChurchEvent(
                    id: e.id, title: e.title, description: e.description ?? "",
                    dateString: day, timeString: time,
                    location: e.location_name ?? "",
                    ministryName: e.ministries?.name ?? "General",
                    colorHex: e.ministries?.color ?? "#1B365D",
                    eventType: e.event_type ?? "other"
                )
            }
        } catch {
            print("DataStore: events error: \(error.localizedDescription)")
        }
    }

    func loadMinistries(_ orgId: String) async {
        do {
            let rows = try await api.select([DBMinistry].self, table: "ministries",
                query: "church_id=eq.\(orgId)&select=*&order=name.asc")
            ministries = rows.map {
                Ministry(
                    id: $0.id, name: $0.name, description: $0.description ?? "",
                    colorHex: $0.color ?? "#1B365D", icon: $0.icon ?? "Users",
                    imageURL: $0.image_url ?? ""
                )
            }
        } catch {
            print("DataStore: ministries error: \(error.localizedDescription)")
        }
    }

    func loadMembersCount(_ orgId: String) async {
        membersCount = (try? await api.count(table: "profiles", query: "church_id=eq.\(orgId)&select=id")) ?? 0
    }

    func loadGivingStats(_ orgId: String, userId: String) async {
        do {
            let rows = try await api.select([DBDonation].self, table: "donations",
                query: "church_id=eq.\(orgId)&user_id=eq.\(userId)&select=amount,created_at,status")
            let cal = Calendar.current
            let now = Date()
            let monthStart = cal.date(from: cal.dateComponents([.year, .month], from: now)) ?? now
            let yearStart = cal.date(from: cal.dateComponents([.year], from: now)) ?? now
            var stats = GivingStats()
            stats.count = rows.count
            for r in rows {
                let amount = r.amount ?? 0
                if let d = ISO8601DateFormatter.flexible.date(from: r.created_at) {
                    if d >= monthStart { stats.thisMonth += amount }
                    if d >= yearStart { stats.thisYear += amount }
                }
            }
            givingStats = stats
        } catch {
            givingStats = GivingStats()
        }
    }

    func donationHistory(orgId: String, userId: String) async -> [Donation] {
        do {
            let rows = try await api.select([DBDonation].self, table: "donations",
                query: "church_id=eq.\(orgId)&user_id=eq.\(userId)&select=*&order=created_at.desc&limit=50")
            return rows.map {
                Donation(
                    id: $0.id, amount: $0.amount ?? 0, type: $0.donation_type ?? "offering",
                    frequency: $0.frequency ?? "one_time", note: $0.note,
                    status: $0.status ?? "completed", createdAt: $0.created_at
                )
            }
        } catch { return [] }
    }

    func loadConversations(_ orgId: String, userId: String) async {
        do {
            guard let profileId = try await profileId(orgId: orgId, userId: userId) else {
                conversations = []; totalUnread = 0; return
            }
            let participants = try await api.select([DBParticipant].self, table: "conversation_participants",
                query: "profile_id=eq.\(profileId)&select=conversation_id,last_read_at")
            let convIds = participants.map { $0.conversation_id }
            guard !convIds.isEmpty else { conversations = []; totalUnread = 0; return }
            let lastReadMap = Dictionary(participants.map { ($0.conversation_id, $0.last_read_at) }) { a, _ in a }
            let idList = convIds.joined(separator: ",")

            let convs = try await api.select([DBConversation].self, table: "conversations",
                query: "id=in.(\(idList))&organization_id=eq.\(orgId)&is_archived=eq.false&select=*,ministries(color)&order=updated_at.desc&limit=50")

            var result: [Conversation] = []
            var unreadTotal = 0
            for c in convs {
                let lastMsg = try? await api.select([DBMessage].self, table: "messages",
                    query: "conversation_id=eq.\(c.id)&select=content,created_at,sender_id,id&order=created_at.desc&limit=1").first
                let cutoff = (lastReadMap[c.id] ?? nil) ?? "1970-01-01"
                let unread = (try? await api.count(table: "messages",
                    query: "conversation_id=eq.\(c.id)&sender_id=neq.\(userId)&created_at=gt.\(cutoff)&select=id")) ?? 0
                unreadTotal += unread
                result.append(Conversation(
                    id: c.id,
                    name: c.name ?? "Conversation",
                    avatar: c.avatar ?? "https://ui-avatars.com/api/?name=\(c.name ?? "C")&background=1B365D&color=fff",
                    lastMessage: lastMsg?.content ?? "",
                    lastMessageTime: lastMsg?.created_at ?? (c.updated_at ?? ""),
                    unreadCount: unread,
                    type: c.type ?? "direct",
                    ministryColorHex: c.ministries?.color
                ))
            }
            conversations = result
            totalUnread = unreadTotal
        } catch {
            print("DataStore: conversations error: \(error.localizedDescription)")
        }
    }

    // MARK: - Mutations

    func rsvp(eventId: String, status: String, orgId: String, userId: String) async -> Bool {
        guard let profileId = try? await profileId(orgId: orgId, userId: userId), let profileId else { return false }
        do {
            try await api.upsert(table: "event_registrations", values: [
                "event_id": eventId,
                "profile_id": profileId,
                "status": status,
                "registered_at": ISO8601DateFormatter().string(from: Date()),
            ], onConflict: "event_id,profile_id")
            return true
        } catch {
            print("DataStore: rsvp error: \(error.localizedDescription)")
            return false
        }
    }

    private func profileId(orgId: String, userId: String) async throws -> String? {
        try await api.select([DBProfileRef].self, table: "profiles",
            query: "user_id=eq.\(userId)&church_id=eq.\(orgId)&select=id").first?.id
    }
}

extension ISO8601DateFormatter {
    static let flexible: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}
