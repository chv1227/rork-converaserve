import SwiftUI

/// Observable authentication + organization state, mirroring AuthProvider.tsx.
@MainActor
@Observable
final class AuthManager {
    var user: AppUser?
    var currentOrganization: Organization?
    var isLoading = true
    var isAuthenticated = false
    var errorMessage: String?

    private let api = SupabaseService.shared
    private let orgKey = "current_org_id"

    var isChurchApproved: Bool { currentOrganization?.status == "active" }
    var isChurchPending: Bool { currentOrganization?.status == "pending" }
    var churchStatus: String? { currentOrganization?.status }

    // MARK: - Bootstrap

    func bootstrap() async {
        guard TokenStore.shared.hasSession else {
            isLoading = false
            return
        }
        do {
            let supaUser = try await api.currentUser()
            await loadUserContext(supaUser)
            isAuthenticated = true
        } catch {
            // Try a refresh once, otherwise fall back to logged-out.
            do {
                try await api.refreshSession()
                let supaUser = try await api.currentUser()
                await loadUserContext(supaUser)
                isAuthenticated = true
            } catch {
                TokenStore.shared.clear()
            }
        }
        isLoading = false
    }

    // MARK: - Auth actions

    func login(email: String, password: String) async -> Bool {
        errorMessage = nil
        guard isValidEmail(email) else { errorMessage = "Please enter a valid email address"; return false }
        guard password.count >= 6 else { errorMessage = "Password must be at least 6 characters"; return false }
        do {
            let supaUser = try await api.signIn(email: email, password: password)
            await loadUserContext(supaUser)
            isAuthenticated = true
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func register(email: String, password: String, name: String, phone: String?) async -> Bool {
        errorMessage = nil
        guard isValidEmail(email) else { errorMessage = "Please enter a valid email address"; return false }
        guard password.count >= 6 else { errorMessage = "Password must be at least 6 characters"; return false }
        guard name.count >= 2 else { errorMessage = "Name must be at least 2 characters"; return false }
        do {
            let supaUser = try await api.signUp(email: email, password: password, name: name, phone: phone)
            // Best-effort upsert into public.users
            try? await api.upsert(table: "users", values: [
                "id": supaUser.id,
                "email": supaUser.email ?? email.lowercased(),
                "full_name": name,
                "phone": phone ?? NSNull(),
                "avatar_url": avatarURL(for: name),
                "status": "active",
            ], onConflict: "id")
            await loadUserContext(supaUser)
            isAuthenticated = true
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func sendPasswordReset(email: String) async -> Bool {
        guard isValidEmail(email) else { errorMessage = "Please enter a valid email address"; return false }
        do {
            try await api.resetPassword(email: email)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func logout() {
        api.signOut()
        UserDefaults.standard.removeObject(forKey: orgKey)
        user = nil
        currentOrganization = nil
        isAuthenticated = false
    }

    func selectOrganization(_ org: Organization) {
        currentOrganization = org
        UserDefaults.standard.set(org.id, forKey: orgKey)
    }

    func updateProfile(name: String, phone: String?) async {
        guard let uid = user?.id else { return }
        try? await api.update(table: "users", values: [
            "full_name": name,
            "phone": phone ?? NSNull(),
        ], match: "id=eq.\(uid)")
        user?.name = name
        user?.phone = phone
    }

    // MARK: - Context loading

    private func loadUserContext(_ supaUser: SupabaseUser) async {
        // Load public.users profile
        var role = "member"
        var name = supaUser.user_metadata?.name ?? supaUser.email?.components(separatedBy: "@").first ?? "User"
        var avatar = supaUser.user_metadata?.avatar_url ?? avatarURL(for: name)
        var phone = supaUser.user_metadata?.phone

        if let profile = try? await api.select([DBUser].self, table: "users",
                                                query: "id=eq.\(supaUser.id)&select=*").first {
            if let n = profile.full_name, !n.isEmpty { name = n }
            if let a = profile.avatar_url, !a.isEmpty { avatar = a }
            if let p = profile.phone { phone = p }
            if let r = profile.role { role = r }
        }

        user = AppUser(
            id: supaUser.id,
            email: supaUser.email ?? "",
            name: name,
            avatarURL: avatar,
            role: role,
            phone: phone,
            joinedDate: supaUser.created_at ?? ""
        )

        await loadOrganization(userId: supaUser.id)
    }

    private func loadOrganization(userId: String) async {
        let storedId = UserDefaults.standard.string(forKey: orgKey)
        do {
            let roles = try await api.select([DBChurchRole].self, table: "user_church_roles",
                query: "user_id=eq.\(userId)&is_active=eq.true&select=*,churches(*)&order=created_at.desc")
            let chosen = roles.first(where: { $0.church_id == storedId }) ?? roles.first
            if let chosen, let church = chosen.churches {
                let org = Organization(
                    id: church.id,
                    name: church.name,
                    description: church.description ?? "",
                    logo: church.logo_url,
                    status: church.status ?? "active"
                )
                currentOrganization = org
                UserDefaults.standard.set(org.id, forKey: orgKey)
            }
        } catch {
            print("AuthManager: loadOrganization error: \(error.localizedDescription)")
        }
    }

    // MARK: - Utils

    private func isValidEmail(_ email: String) -> Bool {
        let regex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
        return NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: email)
    }

    private func avatarURL(for name: String) -> String {
        let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "User"
        return "https://ui-avatars.com/api/?name=\(encoded)&background=1B365D&color=fff"
    }
}
