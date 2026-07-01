import Foundation
import Security

/// Securely persists Supabase auth tokens in the Keychain.
final class TokenStore {
    static let shared = TokenStore()

    private let accessKey = "cc_access_token"
    private let refreshKey = "cc_refresh_token"

    private(set) var accessToken: String?
    private(set) var refreshToken: String?

    private init() {
        accessToken = readKeychain(accessKey)
        refreshToken = readKeychain(refreshKey)
    }

    func save(access: String, refresh: String) {
        accessToken = access
        refreshToken = refresh
        writeKeychain(accessKey, value: access)
        writeKeychain(refreshKey, value: refresh)
    }

    func clear() {
        accessToken = nil
        refreshToken = nil
        deleteKeychain(accessKey)
        deleteKeychain(refreshKey)
    }

    var hasSession: Bool { refreshToken != nil }

    // MARK: - Keychain primitives

    private func writeKeychain(_ key: String, value: String) {
        deleteKeychain(key)
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    private func readKeychain(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func deleteKeychain(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
