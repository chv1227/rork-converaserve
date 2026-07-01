import SwiftUI

struct ProfileView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var showEdit = false
    @State private var showLogoutConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    profileHeader
                    statsRow
                    if !data.ministries.isEmpty { ministriesSection }
                    actionsSection
                    logoutButton
                    Color.clear.frame(height: 30)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
            }
            .background(Theme.background)
            .navigationTitle("Profile")
            .sheet(isPresented: $showEdit) { EditProfileView() }
            .alert("Sign Out", isPresented: $showLogoutConfirm) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) { auth.logout() }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }

    private var profileHeader: some View {
        VStack(spacing: 14) {
            RemoteAvatar(url: auth.user?.avatarURL, size: 96, initials: auth.user?.name.initials ?? "")
                .overlay(Circle().stroke(Theme.accent, lineWidth: 3))
            VStack(spacing: 4) {
                Text(auth.user?.name ?? "User")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Theme.text)
                Text(auth.user?.email ?? "")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.textSecondary)
            }
            HStack(spacing: 8) {
                Label(auth.user?.roleLabel ?? "Member", systemImage: "shield.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.primary)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(Theme.primary.opacity(0.1), in: Capsule())
                if let org = auth.currentOrganization {
                    Label(org.name, systemImage: "building.2.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.secondary)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(Theme.secondary.opacity(0.12), in: Capsule())
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 22))
        .cardShadow()
    }

    private var statsRow: some View {
        HStack(spacing: 12) {
            profileStat(value: "\(data.ministries.count)", label: "Ministries")
            profileStat(value: "\(data.membersCount)", label: "Members")
            profileStat(value: "$\(Int(data.givingStats.thisYear))", label: "Given (Yr)")
        }
    }

    private func profileStat(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value).font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.text)
            Text(label).font(.system(size: 12)).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
        .cardShadow()
    }

    private var ministriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("My Church Ministries").font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.text)
            ForEach(data.ministries) { m in
                HStack(spacing: 12) {
                    Circle().fill(Color(hexString: m.colorHex)).frame(width: 12, height: 12)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(m.name).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.text)
                        if !m.description.isEmpty {
                            Text(m.description).font(.system(size: 12)).foregroundStyle(Theme.textSecondary).lineLimit(1)
                        }
                    }
                    Spacer()
                }
                .padding(14)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 14))
                .cardShadow()
            }
        }
    }

    private var actionsSection: some View {
        VStack(spacing: 0) {
            ProfileRow(icon: "pencil", tint: Theme.primary, title: "Edit Profile") { showEdit = true }
            Divider().padding(.leading, 56)
            ProfileRow(icon: "bell.fill", tint: Theme.secondary, title: "Notifications") {}
            Divider().padding(.leading, 56)
            ProfileRow(icon: "lock.fill", tint: Theme.tertiary, title: "Privacy & Security") {}
            Divider().padding(.leading, 56)
            ProfileRow(icon: "questionmark.circle.fill", tint: Theme.highlight, title: "Help & Support") {}
        }
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
        .cardShadow()
    }

    private var logoutButton: some View {
        Button { showLogoutConfirm = true } label: {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Sign Out").fontWeight(.semibold)
            }
            .foregroundStyle(Theme.error)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Theme.error.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
        }
    }
}

struct ProfileRow: View {
    let icon: String
    let tint: Color
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundStyle(tint)
                    .frame(width: 30, height: 30)
                    .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                Text(title).font(.system(size: 15, weight: .medium)).foregroundStyle(Theme.text)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(Theme.textTertiary)
            }
            .padding(.horizontal, 13).padding(.vertical, 14)
        }
        .buttonStyle(.plain)
    }
}

struct EditProfileView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Personal Info") {
                    TextField("Full name", text: $name)
                    TextField("Phone", text: $phone).keyboardType(.phonePad)
                }
                Section {
                    LabeledContent("Email", value: auth.user?.email ?? "")
                    LabeledContent("Role", value: auth.user?.roleLabel ?? "Member")
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }.disabled(isSaving || name.isEmpty)
                }
            }
            .onAppear {
                name = auth.user?.name ?? ""
                phone = auth.user?.phone ?? ""
            }
        }
    }

    private func save() {
        isSaving = true
        Task {
            await auth.updateProfile(name: name, phone: phone.isEmpty ? nil : phone)
            isSaving = false
            dismiss()
        }
    }
}
