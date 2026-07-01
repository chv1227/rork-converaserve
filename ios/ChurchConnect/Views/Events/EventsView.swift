import SwiftUI

struct EventsView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data

    var body: some View {
        Group {
            if data.upcomingEvents.isEmpty {
                EmptyStateCard(icon: "calendar", title: "No Upcoming Events",
                               message: "Events from your church will appear here")
                    .padding(20)
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(data.upcomingEvents) { event in
                            NavigationLink(value: event.id) {
                                EventRow(event: event)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                }
            }
        }
        .background(Theme.background)
        .navigationTitle("Events")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: String.self) { id in
            if let event = data.events.first(where: { $0.id == id }) {
                EventDetailView(event: event)
            }
        }
        .refreshable {
            if let org = auth.currentOrganization?.id { await data.loadEvents(org) }
        }
    }
}

struct EventRow: View {
    let event: ChurchEvent

    var body: some View {
        HStack(spacing: 14) {
            VStack(spacing: 2) {
                Text(monthText).font(.system(size: 11, weight: .bold)).foregroundStyle(Theme.primary).textCase(.uppercase)
                Text(dayText).font(.system(size: 22, weight: .bold)).foregroundStyle(Theme.text)
            }
            .frame(width: 56, height: 56)
            .background(Theme.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))

            VStack(alignment: .leading, spacing: 4) {
                Text(event.title).font(.system(size: 16, weight: .semibold)).foregroundStyle(Theme.text).lineLimit(1)
                if !event.timeString.isEmpty {
                    Label(event.timeString, systemImage: "clock").font(.system(size: 13)).foregroundStyle(Theme.textSecondary)
                }
                if !event.location.isEmpty {
                    Label(event.location, systemImage: "mappin.and.ellipse").font(.system(size: 13)).foregroundStyle(Theme.textSecondary).lineLimit(1)
                }
            }
            Spacer()
            Circle().fill(Color(hexString: event.colorHex)).frame(width: 10, height: 10)
        }
        .padding(14)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
        .cardShadow()
    }

    private var monthText: String {
        guard let date = event.date else { return "" }
        let f = DateFormatter(); f.dateFormat = "MMM"; return f.string(from: date)
    }
    private var dayText: String {
        guard let date = event.date else { return "--" }
        let f = DateFormatter(); f.dateFormat = "d"; return f.string(from: date)
    }
}

struct EventDetailView: View {
    let event: ChurchEvent
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var rsvpStatus: String?
    @State private var isSubmitting = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 6) {
                        Circle().fill(Color(hexString: event.colorHex)).frame(width: 8, height: 8)
                        Text(event.ministryName).font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.textSecondary)
                    }
                    Text(event.title).font(.system(size: 26, weight: .bold)).foregroundStyle(Theme.text)
                }

                VStack(spacing: 12) {
                    detailRow(icon: "calendar", text: fullDate)
                    if !event.timeString.isEmpty { detailRow(icon: "clock", text: event.timeString) }
                    if !event.location.isEmpty { detailRow(icon: "mappin.and.ellipse", text: event.location) }
                }
                .padding(16)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
                .cardShadow()

                if !event.description.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("About").font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.text)
                        Text(event.description).font(.system(size: 15)).foregroundStyle(Theme.textSecondary)
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Will you attend?").font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.text)
                    HStack(spacing: 10) {
                        rsvpButton("going", label: "Going", icon: "checkmark.circle.fill", color: Theme.success)
                        rsvpButton("maybe", label: "Maybe", icon: "questionmark.circle.fill", color: Theme.warning)
                        rsvpButton("not_going", label: "Can't", icon: "xmark.circle.fill", color: Theme.error)
                    }
                }
            }
            .padding(20)
        }
        .background(Theme.background)
        .navigationTitle("Event")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func detailRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 15)).foregroundStyle(Theme.primary).frame(width: 24)
            Text(text).font(.system(size: 15)).foregroundStyle(Theme.text)
            Spacer()
        }
    }

    private func rsvpButton(_ status: String, label: String, icon: String, color: Color) -> some View {
        let selected = rsvpStatus == status
        return Button {
            submitRSVP(status)
        } label: {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 22))
                Text(label).font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(selected ? .white : color)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(selected ? color : color.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .disabled(isSubmitting)
    }

    private var fullDate: String {
        guard let date = event.date else { return event.dateString }
        let f = DateFormatter(); f.dateFormat = "EEEE, MMMM d, yyyy"; return f.string(from: date)
    }

    private func submitRSVP(_ status: String) {
        guard let org = auth.currentOrganization?.id, let uid = auth.user?.id else { return }
        isSubmitting = true
        Task {
            let ok = await data.rsvp(eventId: event.id, status: status, orgId: org, userId: uid)
            if ok { rsvpStatus = status }
            isSubmitting = false
        }
    }
}
