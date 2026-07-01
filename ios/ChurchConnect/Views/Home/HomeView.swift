import SwiftUI

struct HomeView: View {
    @Binding var selection: Int
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var showAnnouncements = false
    @State private var showEvents = false

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good Morning"
        case 12..<17: return "Good Afternoon"
        case 17..<21: return "Good Evening"
        default: return "Good Night"
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    header
                    quickActions
                    statsRow
                    announcementsSection
                    Color.clear.frame(height: 24)
                }
            }
            .background(Theme.background)
            .ignoresSafeArea(edges: .top)
            .refreshable {
                if let org = auth.currentOrganization?.id, let uid = auth.user?.id {
                    await data.refresh(orgId: org, userId: uid)
                }
            }
            .navigationDestination(isPresented: $showAnnouncements) { AnnouncementsView() }
            .navigationDestination(isPresented: $showEvents) { EventsView() }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 20) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    if let org = auth.currentOrganization {
                        HStack(spacing: 5) {
                            Image(systemName: "building.2.fill").font(.system(size: 11))
                            Text(org.name).font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(Theme.accent.opacity(0.95))
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(Theme.accent.opacity(0.15), in: Capsule())
                    }
                    Text(greeting)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))
                    Text(auth.user?.firstName ?? "Friend")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(.white)
                }
                Spacer()
                HStack(spacing: 12) {
                    Button {
                        selection = 1
                    } label: {
                        Image(systemName: "bell.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(.white.opacity(0.1), in: Circle())
                            .overlay(alignment: .topTrailing) {
                                if data.totalUnread > 0 {
                                    Text(data.totalUnread > 9 ? "9+" : "\(data.totalUnread)")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(Theme.primaryDark)
                                        .frame(minWidth: 18, minHeight: 18)
                                        .background(Theme.accent, in: Circle())
                                        .offset(x: 4, y: -4)
                                }
                            }
                    }
                    Button { selection = 3 } label: {
                        RemoteAvatar(url: auth.user?.avatarURL, size: 44, initials: auth.user?.name.initials ?? "")
                            .overlay(Circle().stroke(.white.opacity(0.4), lineWidth: 2))
                    }
                }
            }

            heroCard
        }
        .padding(.horizontal, 20)
        .padding(.top, 60)
        .padding(.bottom, 28)
        .background(Theme.headerGradient)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: "sparkles")
                .font(.system(size: 18))
                .foregroundStyle(Theme.accent)
                .frame(width: 36, height: 36)
                .background(Theme.accent.opacity(0.2), in: RoundedRectangle(cornerRadius: 12))
            Text("Stay Connected")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
            Text(data.announcements.isEmpty
                 ? "Check out what's happening in your community"
                 : "\(data.announcements.count) announcement\(data.announcements.count > 1 ? "s" : "") from your church")
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.9))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Theme.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.accent.opacity(0.12), lineWidth: 1))
    }

    // MARK: - Quick actions

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    private var quickActions: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            QuickActionCard(icon: "megaphone.fill", tint: Theme.primary, title: "Announcements",
                            subtitle: data.announcements.isEmpty ? "Stay updated" : "\(data.announcements.count) total") { showAnnouncements = true }
            QuickActionCard(icon: "message.fill", tint: Theme.tertiary, title: "Messages",
                            subtitle: data.totalUnread > 0 ? "\(data.totalUnread) unread" : "Chat") { selection = 1 }
            QuickActionCard(icon: "heart.fill", tint: Theme.secondary, title: "Giving",
                            subtitle: data.givingStats.thisMonth > 0 ? "$\(Int(data.givingStats.thisMonth)) this month" : "Tithes & Offerings") { selection = 2 }
            QuickActionCard(icon: "person.3.fill", tint: Theme.highlight, title: "Community",
                            subtitle: "\(data.membersCount) members") { selection = 3 }
            QuickActionCard(icon: "calendar", tint: Theme.success, title: "Events",
                            subtitle: "Calendar") { showEvents = true }
            QuickActionCard(icon: "list.clipboard.fill", tint: Theme.warning, title: "Ministries",
                            subtitle: "\(data.ministries.count) groups") { selection = 3 }
        }
        .padding(.horizontal, 16)
        .padding(.top, 24)
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: 12) {
            StatCard(icon: "message.fill", tint: Theme.primary, value: "\(data.totalUnread)", label: "Unread Messages") { selection = 1 }
            StatCard(icon: "heart.fill", tint: Theme.secondary, value: "\(data.membersCount)", label: "Church Members") { selection = 3 }
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
    }

    // MARK: - Announcements

    private var announcementsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            let items = Array(data.generalAnnouncements.prefix(4))
            if !items.isEmpty {
                HStack {
                    Text("Latest Announcements")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.text)
                    Spacer()
                    Button("View all") { showAnnouncements = true }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.primary)
                }
                .padding(.horizontal, 20)
                VStack(spacing: 12) {
                    ForEach(items) { a in
                        Button { showAnnouncements = true } label: {
                            AnnouncementRow(announcement: a)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)
            } else if !data.isLoading {
                EmptyStateCard(icon: "megaphone.fill", title: "No Announcements Yet",
                               message: "Announcements from your church will appear here")
                    .padding(.horizontal, 20)
            }
        }
        .padding(.top, 24)
    }
}

// MARK: - Sub-components

struct QuickActionCard: View {
    let icon: String
    let tint: Color
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundStyle(tint)
                    .frame(width: 40, height: 40)
                    .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                Text(title).font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.text)
                Text(subtitle).font(.system(size: 12)).foregroundStyle(Theme.textSecondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 110, alignment: .leading)
            .padding(18)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 20))
            .cardShadow()
        }
        .buttonStyle(PressableStyle())
    }
}

struct StatCard: View {
    let icon: String
    let tint: Color
    let value: String
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundStyle(tint)
                    .frame(width: 44, height: 44)
                    .background(tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 2) {
                    Text(value).font(.system(size: 22, weight: .bold)).foregroundStyle(Theme.text)
                    Text(label).font(.system(size: 11)).foregroundStyle(Theme.textSecondary).lineLimit(1)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
            }
            .padding(16)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
            .cardShadow()
        }
        .buttonStyle(PressableStyle())
    }
}

struct AnnouncementRow: View {
    let announcement: Announcement

    private var priorityColor: Color {
        switch announcement.priority {
        case "high", "urgent": return Theme.error
        case "low": return Theme.textTertiary
        default: return Theme.primary
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                if announcement.isPinned {
                    HStack(spacing: 4) {
                        Image(systemName: "pin.fill").font(.system(size: 9))
                        Text("Pinned").font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(Theme.primary)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Theme.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 6))
                }
                let isMinistry = announcement.ministryId != nil && !(announcement.ministryId?.isEmpty ?? true)
                HStack(spacing: 4) {
                    Image(systemName: isMinistry ? "person.2.fill" : "globe").font(.system(size: 9))
                    Text(isMinistry ? (announcement.ministryName ?? "Ministry") : "General")
                        .font(.system(size: 10, weight: .semibold))
                        .textCase(.uppercase)
                }
                .foregroundStyle(isMinistry ? Theme.secondary : Theme.primary)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background((isMinistry ? Theme.secondary : Theme.primary).opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                Spacer()
            }
            Text(announcement.title)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Theme.text)
                .lineLimit(2)
            Text(announcement.content)
                .font(.system(size: 14))
                .foregroundStyle(Theme.textSecondary)
                .lineLimit(2)
            HStack(spacing: 6) {
                Circle().fill(priorityColor).frame(width: 6, height: 6)
                Text(RelativeDate.format(announcement.date))
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
        .cardShadow()
    }
}

struct EmptyStateCard: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 28))
                .foregroundStyle(Theme.primary)
                .frame(width: 64, height: 64)
                .background(Theme.primary.opacity(0.06), in: Circle())
            Text(title).font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.text)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 20))
        .cardShadow()
    }
}

struct PressableStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

enum RelativeDate {
    static func format(_ iso: String) -> String {
        guard let date = ISO8601DateFormatter.flexible.date(from: iso)
                ?? ISO8601DateFormatter().date(from: iso) else { return "" }
        let days = Calendar.current.dateComponents([.day], from: date, to: Date()).day ?? 0
        switch days {
        case 0: return "Today"
        case 1: return "Yesterday"
        case 2..<7: return "\(days)d ago"
        default:
            let fmt = DateFormatter(); fmt.dateFormat = "MMM d"
            return fmt.string(from: date)
        }
    }
}
