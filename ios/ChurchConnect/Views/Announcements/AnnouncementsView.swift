import SwiftUI

struct AnnouncementsView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var filter = 0  // 0 all, 1 general, 2 ministry

    private var items: [Announcement] {
        switch filter {
        case 1: return data.announcements.filter { $0.ministryId == nil || $0.ministryId?.isEmpty == true }
        case 2: return data.announcements.filter { ($0.ministryId?.isEmpty == false) }
        default: return data.announcements
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            Picker("", selection: $filter) {
                Text("All").tag(0)
                Text("General").tag(1)
                Text("Ministry").tag(2)
            }
            .pickerStyle(.segmented)
            .padding(16)

            if items.isEmpty {
                EmptyStateCard(icon: "megaphone.fill", title: "No Announcements",
                               message: "Announcements from your church will appear here")
                    .padding(20)
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(items) { AnnouncementRow(announcement: $0) }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(Theme.background)
        .navigationTitle("Announcements")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            if let org = auth.currentOrganization?.id { await data.loadAnnouncements(org) }
        }
    }
}
