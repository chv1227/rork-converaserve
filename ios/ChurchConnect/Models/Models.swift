import Foundation

// MARK: - Supabase auth user

struct SupabaseUser: Codable, Identifiable {
    let id: String
    let email: String?
    let email_confirmed_at: String?
    let created_at: String?
    let user_metadata: UserMetadata?

    struct UserMetadata: Codable {
        let name: String?
        let phone: String?
        let avatar_url: String?
    }
}

// MARK: - App user

struct AppUser: Identifiable, Equatable {
    let id: String
    var email: String
    var name: String
    var avatarURL: String
    var role: String
    var phone: String?
    var joinedDate: String

    var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }

    var roleLabel: String {
        switch role {
        case "super_admin": return "Super Admin"
        case "admin": return "Organization Admin"
        case "leader": return "Leader"
        default: return "Member"
        }
    }
}

// MARK: - DB row DTOs (nonisolated Codable)

nonisolated struct DBUser: Decodable {
    let id: String
    let email: String
    let full_name: String?
    let avatar_url: String?
    let phone: String?
    let role: String?
}

nonisolated struct DBChurch: Decodable {
    let id: String
    let name: String
    let description: String?
    let logo_url: String?
    let contact_email: String?
    let contact_phone: String?
    let website: String?
    let status: String?
}

nonisolated struct DBChurchRole: Decodable {
    let id: String
    let church_id: String
    let role: String
    let created_at: String?
    let churches: DBChurch?
}

nonisolated struct DBAnnouncement: Decodable {
    let id: String
    let church_id: String
    let title: String
    let content: String
    let created_at: String
    let ministry_id: String?
    let priority: String?
    let is_pinned: Bool?
    let ministries: NamedRef?
}

nonisolated struct NamedRef: Decodable {
    let name: String?
    let color: String?
}

nonisolated struct DBEvent: Decodable {
    let id: String
    let church_id: String
    let title: String
    let description: String?
    let start_datetime: String?
    let end_datetime: String?
    let location_name: String?
    let ministry_id: String?
    let max_attendees: Int?
    let event_type: String?
    let ministries: NamedRef?
}

nonisolated struct DBMinistry: Decodable {
    let id: String
    let church_id: String
    let name: String
    let description: String?
    let color: String?
    let icon: String?
    let image_url: String?
}

nonisolated struct DBConversation: Decodable {
    let id: String
    let organization_id: String?
    let name: String?
    let avatar: String?
    let type: String?
    let ministry_id: String?
    let updated_at: String?
    let ministries: NamedRef?
}

nonisolated struct DBMessage: Decodable {
    let id: String
    let conversation_id: String
    let sender_id: String?
    let content: String
    let created_at: String
}

nonisolated struct DBParticipant: Decodable {
    let conversation_id: String
    let last_read_at: String?
}

nonisolated struct DBProfileRef: Decodable {
    let id: String
}

nonisolated struct DBDonation: Decodable {
    let id: String
    let amount: Double?
    let donation_type: String?
    let currency: String?
    let frequency: String?
    let note: String?
    let status: String?
    let created_at: String
}

// MARK: - View models

struct Announcement: Identifiable {
    let id: String
    let title: String
    let content: String
    let date: String
    let ministryId: String?
    let ministryName: String?
    let priority: String
    let isPinned: Bool
}

struct ChurchEvent: Identifiable {
    let id: String
    let title: String
    let description: String
    let dateString: String   // yyyy-MM-dd
    let timeString: String   // HH:mm
    let location: String
    let ministryName: String
    let colorHex: String
    let eventType: String

    var date: Date? {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.date(from: dateString)
    }
}

struct Ministry: Identifiable {
    let id: String
    let name: String
    let description: String
    let colorHex: String
    let icon: String
    let imageURL: String
}

struct Conversation: Identifiable {
    let id: String
    let name: String
    let avatar: String
    let lastMessage: String
    let lastMessageTime: String
    var unreadCount: Int
    let type: String  // direct / group / ministry
    let ministryColorHex: String?
}

struct ChatMessage: Identifiable {
    let id: String
    let senderId: String?
    let content: String
    let createdAt: String
    var isMine: Bool
}

struct Donation: Identifiable {
    let id: String
    let amount: Double
    let type: String
    let frequency: String
    let note: String?
    let status: String
    let createdAt: String
}

struct Organization: Identifiable, Equatable {
    let id: String
    let name: String
    let description: String
    let logo: String?
    let status: String
}

struct GivingStats {
    var thisMonth: Double = 0
    var thisYear: Double = 0
    var count: Int = 0
}
