import Foundation

/// Lightweight Supabase client (Auth + PostgREST) built on URLSession.
/// Mirrors the endpoints used by the React Native app.
final class SupabaseService {
    static let shared = SupabaseService()

    private let baseURL: String
    private let anonKey: String
    private let session = URLSession.shared

    private init() {
        baseURL = Config.EXPO_PUBLIC_SUPABASE_URL.trimmingCharacters(in: .whitespaces)
        anonKey = Config.EXPO_PUBLIC_SUPABASE_ANON_KEY.trimmingCharacters(in: .whitespaces)
    }

    // MARK: - Token storage (delegated to TokenStore)
    var accessToken: String? { TokenStore.shared.accessToken }

    // MARK: - Errors
    struct APIError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    // MARK: - Auth

    struct AuthResponse: Decodable {
        let access_token: String
        let refresh_token: String
        let expires_in: Int?
        let user: SupabaseUser
    }

    func signIn(email: String, password: String) async throws -> SupabaseUser {
        let url = URL(string: "\(baseURL)/auth/v1/token?grant_type=password")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        applyAuthHeaders(&req, includeBearer: false)
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email.lowercased(), "password": password,
        ])
        let auth = try await decode(AuthResponse.self, from: req, authErrorKey: "error_description")
        TokenStore.shared.save(access: auth.access_token, refresh: auth.refresh_token)
        return auth.user
    }

    func signUp(email: String, password: String, name: String, phone: String?) async throws -> SupabaseUser {
        let url = URL(string: "\(baseURL)/auth/v1/signup")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        applyAuthHeaders(&req, includeBearer: false)
        var data: [String: Any] = ["name": name]
        if let phone, !phone.isEmpty { data["phone"] = phone }
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email.lowercased(), "password": password, "data": data,
        ])
        let auth = try await decode(AuthResponse.self, from: req, authErrorKey: "msg")
        TokenStore.shared.save(access: auth.access_token, refresh: auth.refresh_token)
        return auth.user
    }

    func resetPassword(email: String) async throws {
        let url = URL(string: "\(baseURL)/auth/v1/recover")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        applyAuthHeaders(&req, includeBearer: false)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["email": email.lowercased()])
        _ = try await raw(req)
    }

    func currentUser() async throws -> SupabaseUser {
        let url = URL(string: "\(baseURL)/auth/v1/user")!
        var req = URLRequest(url: url)
        applyAuthHeaders(&req, includeBearer: true)
        return try await decode(SupabaseUser.self, from: req, authErrorKey: "msg")
    }

    func refreshSession() async throws {
        guard let refresh = TokenStore.shared.refreshToken else {
            throw APIError(message: "No refresh token")
        }
        let url = URL(string: "\(baseURL)/auth/v1/token?grant_type=refresh_token")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        applyAuthHeaders(&req, includeBearer: false)
        req.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refresh])
        let auth = try await decode(AuthResponse.self, from: req, authErrorKey: "error_description")
        TokenStore.shared.save(access: auth.access_token, refresh: auth.refresh_token)
    }

    func signOut() {
        TokenStore.shared.clear()
    }

    // MARK: - PostgREST

    /// GET rows from a table. `query` is the raw querystring after "?".
    func select<T: Decodable>(_ type: [T].Type, table: String, query: String) async throws -> [T] {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(query)")!
        var req = URLRequest(url: url)
        applyAuthHeaders(&req, includeBearer: true)
        return try await withAutoRefresh {
            try await self.decode([T].self, from: req, authErrorKey: "message")
        }
    }

    /// Insert a row, returning the created record.
    @discardableResult
    func insert<T: Decodable>(_ type: T.Type, table: String, values: [String: Any]) async throws -> T {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        applyAuthHeaders(&req, includeBearer: true)
        req.setValue("return=representation", forHTTPHeaderField: "Prefer")
        req.httpBody = try JSONSerialization.data(withJSONObject: values)
        let rows = try await withAutoRefresh {
            try await self.decode([T].self, from: req, authErrorKey: "message")
        }
        guard let first = rows.first else { throw APIError(message: "Insert returned no rows") }
        return first
    }

    /// Upsert a row (on conflict merge).
    func upsert(table: String, values: [String: Any], onConflict: String? = nil) async throws {
        var urlString = "\(baseURL)/rest/v1/\(table)"
        if let onConflict { urlString += "?on_conflict=\(onConflict)" }
        let url = URL(string: urlString)!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        applyAuthHeaders(&req, includeBearer: true)
        req.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
        req.httpBody = try JSONSerialization.data(withJSONObject: values)
        _ = try await withAutoRefresh { try await self.raw(req) }
    }

    func update(table: String, values: [String: Any], match query: String) async throws {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(query)")!
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        applyAuthHeaders(&req, includeBearer: true)
        req.httpBody = try JSONSerialization.data(withJSONObject: values)
        _ = try await withAutoRefresh { try await self.raw(req) }
    }

    func delete(table: String, match query: String) async throws {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(query)")!
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        applyAuthHeaders(&req, includeBearer: true)
        _ = try await withAutoRefresh { try await self.raw(req) }
    }

    /// Count rows matching a query using the exact count header.
    func count(table: String, query: String) async throws -> Int {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(query)")!
        var req = URLRequest(url: url)
        applyAuthHeaders(&req, includeBearer: true)
        req.setValue("count=exact", forHTTPHeaderField: "Prefer")
        req.setValue("0-0", forHTTPHeaderField: "Range")
        return try await withAutoRefresh {
            let (_, resp) = try await self.raw(req)
            guard let http = resp as? HTTPURLResponse,
                  let range = http.value(forHTTPHeaderField: "content-range"),
                  let total = range.split(separator: "/").last,
                  let value = Int(total) else { return 0 }
            return value
        }
    }

    // MARK: - Helpers

    private func applyAuthHeaders(_ req: inout URLRequest, includeBearer: Bool) {
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let bearer = (includeBearer ? accessToken : nil) ?? anonKey
        req.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
    }

    private func raw(_ req: URLRequest) async throws -> (Data, URLResponse) {
        let (data, resp) = try await session.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let message = Self.extractError(from: data) ?? "Request failed (\(http.statusCode))"
            throw APIError(message: message)
        }
        return (data, resp)
    }

    private func decode<T: Decodable>(_ type: T.Type, from req: URLRequest, authErrorKey: String) async throws -> T {
        let (data, resp) = try await session.data(for: req)
        if let http = resp as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let message = Self.extractError(from: data, preferredKey: authErrorKey) ?? "Request failed (\(http.statusCode))"
            throw APIError(message: message)
        }
        do {
            return try JSONDecoder.supabase.decode(T.self, from: data)
        } catch {
            throw APIError(message: "Failed to parse server response")
        }
    }

    /// Retry once after refreshing the token on a 401.
    private func withAutoRefresh<T>(_ operation: () async throws -> T) async throws -> T {
        do {
            return try await operation()
        } catch let error as APIError where error.message.contains("JWT") || error.message.contains("401") {
            try? await refreshSession()
            return try await operation()
        }
    }

    private static func extractError(from data: Data, preferredKey: String? = nil) -> String? {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        if let key = preferredKey, let msg = obj[key] as? String { return msg }
        return (obj["message"] as? String)
            ?? (obj["error_description"] as? String)
            ?? (obj["msg"] as? String)
            ?? (obj["error"] as? String)
    }
}

extension JSONDecoder {
    static let supabase: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()
}
