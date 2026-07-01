import SwiftUI
import UIKit

/// Central design system for ChurchConnect — a navy + brass palette
/// that mirrors the React Native app's "Modern Sanctuary" aesthetic.
enum Theme {
    // MARK: - Brand
    static let primary = Color(hex: 0x1B365D)
    static let primaryLight = Color(hex: 0x2E5A8A)
    static let primaryDark = Color(hex: 0x0F2440)

    static let secondary = Color(hex: 0xC8943E)
    static let secondaryLight = Color(hex: 0xDEBA6F)
    static let secondaryDark = Color(hex: 0xA67A2E)

    static let accent = Color(hex: 0xD4A843)
    static let tertiary = Color(hex: 0x4A8B6E)
    static let highlight = Color(hex: 0x3B82A0)
    static let coral = Color(hex: 0xC76F54)

    // MARK: - Surfaces (adaptive light/dark)
    static let background = Color(light: 0xFAFAFA, dark: 0x0F1724)
    static let surface = Color(light: 0xFFFFFF, dark: 0x1A2436)
    static let surfaceSecondary = Color(light: 0xF4F5F7, dark: 0x212D40)

    // MARK: - Text (adaptive)
    static let text = Color(light: 0x111827, dark: 0xF1F5F9)
    static let textSecondary = Color(light: 0x6B7280, dark: 0x94A3B8)
    static let textTertiary = Color(light: 0x9CA3AF, dark: 0x64748B)
    static let border = Color(light: 0xE5E7EB, dark: 0x2D3A50)

    // MARK: - Semantic
    static let success = Color(hex: 0x10B981)
    static let warning = Color(hex: 0xF59E0B)
    static let error = Color(hex: 0xEF4444)
    static let info = Color(hex: 0x3B82F6)

    // MARK: - Gradients
    static let headerGradient = LinearGradient(
        colors: [Color(hex: 0x1B365D), Color(hex: 0x1E4A6E), Color(hex: 0x0F2440)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let loginGradient = LinearGradient(
        colors: [Color(hex: 0x0C1B2E), Color(hex: 0x132D4A), Color(hex: 0x0C1B2E)],
        startPoint: .top,
        endPoint: .bottom
    )
}

extension Color {
    /// Adaptive color that resolves differently in light and dark mode.
    init(light: UInt, dark: UInt) {
        self.init(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(
                red: CGFloat((hex >> 16) & 0xff) / 255,
                green: CGFloat((hex >> 8) & 0xff) / 255,
                blue: CGFloat(hex & 0xff) / 255,
                alpha: 1
            )
        })
    }

    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: alpha
        )
    }

    /// Parse a "#RRGGBB" / "RRGGBB" string, falling back to a provided default.
    init(hexString: String?, fallback: Color = Theme.primary) {
        guard var s = hexString?.trimmingCharacters(in: .whitespacesAndNewlines) else {
            self = fallback
            return
        }
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let value = UInt(s, radix: 16) else {
            self = fallback
            return
        }
        self.init(hex: value)
    }
}

extension View {
    /// Standard elevated card shadow used across the app.
    func cardShadow() -> some View {
        shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 4)
    }
}
