import SwiftUI

struct MessagesView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var search = ""

    private var filtered: [Conversation] {
        guard !search.isEmpty else { return data.conversations }
        return data.conversations.filter { $0.name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if data.conversations.isEmpty && !data.isLoading {
                    emptyState
                } else {
                    List {
                        ForEach(filtered) { conv in
                            NavigationLink(value: conv.id) {
                                ConversationRow(conversation: conv)
                            }
                            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Theme.background)
                        }
                    }
                    .listStyle(.plain)
                    .searchable(text: $search, prompt: "Search conversations")
                }
            }
            .background(Theme.background)
            .navigationTitle("Messages")
            .navigationDestination(for: String.self) { convId in
                if let conv = data.conversations.first(where: { $0.id == convId }) {
                    ChatView(conversation: conv)
                }
            }
            .refreshable {
                if let org = auth.currentOrganization?.id, let uid = auth.user?.id {
                    await data.loadConversations(org, userId: uid)
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "message.fill")
                .font(.system(size: 30))
                .foregroundStyle(Theme.primary)
                .frame(width: 72, height: 72)
                .background(Theme.primary.opacity(0.08), in: Circle())
            Text("No Conversations Yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Theme.text)
            Text("Your messages and ministry chats will appear here.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 12) {
            RemoteAvatar(url: conversation.avatar, size: 54, initials: conversation.name.initials)
                .overlay(alignment: .bottomTrailing) {
                    if conversation.type == "group" {
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(.white)
                            .frame(width: 18, height: 18)
                            .background(Theme.primary, in: Circle())
                            .overlay(Circle().stroke(Theme.background, lineWidth: 2))
                    } else if conversation.type == "ministry", let hex = conversation.ministryColorHex {
                        Circle()
                            .fill(Color(hexString: hex))
                            .frame(width: 16, height: 16)
                            .overlay(Circle().stroke(Theme.background, lineWidth: 2))
                    }
                }
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(conversation.name)
                        .font(.system(size: 16, weight: conversation.unreadCount > 0 ? .bold : .semibold))
                        .foregroundStyle(Theme.text)
                        .lineLimit(1)
                    Spacer()
                    Text(ConversationTime.format(conversation.lastMessageTime))
                        .font(.system(size: 12))
                        .foregroundStyle(conversation.unreadCount > 0 ? Theme.primary : Theme.textTertiary)
                }
                HStack {
                    Text(conversation.lastMessage.isEmpty ? "No messages yet" : conversation.lastMessage)
                        .font(.system(size: 14))
                        .foregroundStyle(conversation.unreadCount > 0 ? Theme.text : Theme.textSecondary)
                        .lineLimit(1)
                    Spacer()
                    if conversation.unreadCount > 0 {
                        Text("\(conversation.unreadCount)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(minWidth: 22, minHeight: 22)
                            .background(Theme.primary, in: Circle())
                    }
                }
            }
        }
        .padding(12)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
        .cardShadow()
    }
}

enum ConversationTime {
    static func format(_ iso: String) -> String {
        guard let date = ISO8601DateFormatter.flexible.date(from: iso)
                ?? ISO8601DateFormatter().date(from: iso) else { return "" }
        let now = Date()
        let mins = Int(now.timeIntervalSince(date) / 60)
        if mins < 1 { return "now" }
        if mins < 60 { return "\(mins)m" }
        let hours = mins / 60
        if hours < 24 { return "\(hours)h" }
        let days = hours / 24
        if days == 1 { return "Yesterday" }
        if days < 7 { return "\(days)d" }
        let fmt = DateFormatter(); fmt.dateFormat = "MMM d"
        return fmt.string(from: date)
    }
}
