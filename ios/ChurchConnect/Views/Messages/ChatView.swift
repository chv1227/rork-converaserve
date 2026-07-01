import SwiftUI

struct ChatView: View {
    let conversation: Conversation
    @Environment(AuthManager.self) private var auth
    @State private var messages: [ChatMessage] = []
    @State private var draft = ""
    @State private var isLoading = true
    @State private var isSending = false

    private let api = SupabaseService.shared

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 10) {
                        if isLoading {
                            ProgressView().padding(.top, 40)
                        }
                        ForEach(messages) { msg in
                            MessageBubble(message: msg)
                                .id(msg.id)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }
            .background(Theme.background)

            inputBar
        }
        .background(Theme.background)
        .navigationTitle(conversation.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Message", text: $draft, axis: .vertical)
                .font(.system(size: 16))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Theme.surfaceSecondary, in: Capsule())
                .lineLimit(1...4)
            Button(action: send) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(draft.trimmingCharacters(in: .whitespaces).isEmpty ? Theme.textTertiary : Theme.primary, in: Circle())
            }
            .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Theme.surface)
        .overlay(Rectangle().fill(Theme.border).frame(height: 0.5), alignment: .top)
    }

    private func load() async {
        do {
            let rows = try await api.select([DBMessage].self, table: "messages",
                query: "conversation_id=eq.\(conversation.id)&select=*&order=created_at.asc&limit=100")
            messages = rows.map {
                ChatMessage(id: $0.id, senderId: $0.sender_id, content: $0.content,
                            createdAt: $0.created_at, isMine: $0.sender_id == auth.user?.id)
            }
            await markRead()
        } catch {
            print("ChatView: load error \(error.localizedDescription)")
        }
        isLoading = false
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty, let uid = auth.user?.id else { return }
        draft = ""
        isSending = true
        Task {
            do {
                let created = try await api.insert(DBMessage.self, table: "messages", values: [
                    "conversation_id": conversation.id,
                    "sender_id": uid,
                    "content": text,
                ])
                messages.append(ChatMessage(id: created.id, senderId: uid, content: created.content,
                                            createdAt: created.created_at, isMine: true))
                try? await api.update(table: "conversations",
                                      values: ["updated_at": ISO8601DateFormatter().string(from: Date())],
                                      match: "id=eq.\(conversation.id)")
            } catch {
                print("ChatView: send error \(error.localizedDescription)")
            }
            isSending = false
        }
    }

    private func markRead() async {
        guard let uid = auth.user?.id, let org = auth.currentOrganization?.id else { return }
        guard let profileId = try? await api.select([DBProfileRef].self, table: "profiles",
            query: "user_id=eq.\(uid)&church_id=eq.\(org)&select=id").first?.id else { return }
        try? await api.update(table: "conversation_participants",
                              values: ["last_read_at": ISO8601DateFormatter().string(from: Date())],
                              match: "conversation_id=eq.\(conversation.id)&profile_id=eq.\(profileId)")
    }
}

struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            if message.isMine { Spacer(minLength: 50) }
            Text(message.content)
                .font(.system(size: 15))
                .foregroundStyle(message.isMine ? .white : Theme.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    message.isMine ? Theme.primary : Theme.surface,
                    in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                )
                .cardShadow()
            if !message.isMine { Spacer(minLength: 50) }
        }
    }
}
