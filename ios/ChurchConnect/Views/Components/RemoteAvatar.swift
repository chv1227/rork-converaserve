import SwiftUI

/// Circular remote avatar with a graceful placeholder.
struct RemoteAvatar: View {
    let url: String?
    var size: CGFloat = 44
    var initials: String = ""

    var body: some View {
        AsyncImage(url: URL(string: url ?? "")) { phase in
            switch phase {
            case .success(let image):
                image.resizable().aspectRatio(contentMode: .fill)
            default:
                Circle()
                    .fill(Theme.primary.opacity(0.15))
                    .overlay {
                        Text(initials.isEmpty ? "?" : initials)
                            .font(.system(size: size * 0.4, weight: .semibold))
                            .foregroundStyle(Theme.primary)
                    }
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }
}

extension String {
    /// Two-letter initials from a display name.
    var initials: String {
        let parts = split(separator: " ")
        let letters = parts.prefix(2).compactMap { $0.first }
        return String(letters).uppercased()
    }
}
