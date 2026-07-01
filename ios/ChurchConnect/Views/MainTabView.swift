import SwiftUI

struct MainTabView: View {
    @Environment(AuthManager.self) private var auth
    @State private var data = DataStore()
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            HomeView(selection: $selection)
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)

            MessagesView()
                .tabItem { Label("Messages", systemImage: "message.fill") }
                .badge(data.totalUnread)
                .tag(1)

            GivingView()
                .tabItem { Label("Giving", systemImage: "heart.fill") }
                .tag(2)

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.fill") }
                .tag(3)
        }
        .tint(Theme.primary)
        .environment(data)
        .task(id: auth.currentOrganization?.id) {
            if let org = auth.currentOrganization?.id, let uid = auth.user?.id {
                await data.loadAll(orgId: org, userId: uid)
            }
        }
    }
}
