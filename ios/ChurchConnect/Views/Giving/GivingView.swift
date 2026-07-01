import SwiftUI

struct GivingView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var tab = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("", selection: $tab) {
                    Text("Give").tag(0)
                    Text("History").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(16)

                if tab == 0 {
                    GiveTab()
                } else {
                    HistoryTab()
                }
            }
            .background(Theme.background)
            .navigationTitle("Giving")
        }
    }
}

private struct GiveTab: View {
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var givingType = "tithe"
    @State private var amount = ""
    @State private var frequency = "one_time"
    @State private var note = ""
    @State private var showConfirm = false
    @State private var showSuccess = false

    private let presets = [25, 50, 100, 250, 500, 1000]
    private let frequencies = [("one_time", "One-time"), ("weekly", "Weekly"), ("bi_weekly", "Bi-weekly"), ("monthly", "Monthly")]
    private let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 24) {
                summaryCard
                typeSelector
                amountSelector
                frequencySelector
                noteField
                giveButton
                securityNote
                Color.clear.frame(height: 20)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .alert("Confirm Donation", isPresented: $showConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Give \(formattedAmount)") { confirm() }
        } message: {
            Text("\(givingType == "tithe" ? "Tithe" : "Offering") of \(formattedAmount), \(frequencies.first { $0.0 == frequency }?.1 ?? "")")
        }
        .alert("Thank You!", isPresented: $showSuccess) {
            Button("Done") {}
        } message: {
            Text("Your \(givingType) has been recorded successfully.")
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(Theme.primary)
                Text("Your Giving Summary").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.text)
            }
            HStack {
                summaryItem(value: currency(data.givingStats.thisMonth), label: "This Month")
                Divider().frame(height: 40)
                summaryItem(value: currency(data.givingStats.thisYear), label: "This Year")
                Divider().frame(height: 40)
                summaryItem(value: "\(data.givingStats.count)", label: "Total Gifts")
            }
        }
        .padding(20)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18))
        .cardShadow()
    }

    private func summaryItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value).font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.text)
            Text(label).font(.system(size: 11)).foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private var typeSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Giving Type")
            HStack(spacing: 12) {
                typeButton("tithe", icon: "dollarsign", title: "Tithe", subtitle: "10% of income")
                typeButton("offering", icon: "gift", title: "Offering", subtitle: "Additional gift")
            }
        }
    }

    private func typeButton(_ value: String, icon: String, title: String, subtitle: String) -> some View {
        let selected = givingType == value
        return Button { givingType = value } label: {
            VStack(spacing: 8) {
                Image(systemName: icon).font(.system(size: 22)).foregroundStyle(selected ? .white : Theme.primary)
                Text(title).font(.system(size: 16, weight: .semibold)).foregroundStyle(selected ? .white : Theme.text)
                Text(subtitle).font(.system(size: 12)).foregroundStyle(selected ? .white.opacity(0.9) : Theme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(18)
            .background(selected ? Theme.primary : Theme.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: selected ? 0 : 1))
        }
        .buttonStyle(.plain)
    }

    private var amountSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Amount")
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(presets, id: \.self) { p in
                    let selected = amount == "\(p)"
                    Button { amount = "\(p)" } label: {
                        Text("$\(p)")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(selected ? .white : Theme.text)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(selected ? Theme.primary : Theme.surface, in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.border, lineWidth: selected ? 0 : 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            HStack {
                Text("$").font(.system(size: 20, weight: .semibold)).foregroundStyle(Theme.text)
                TextField("0.00", text: $amount)
                    .keyboardType(.decimalPad)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Theme.text)
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
        }
    }

    private var frequencySelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Frequency")
            VStack(spacing: 10) {
                ForEach(frequencies, id: \.0) { value, label in
                    let selected = frequency == value
                    Button { frequency = value } label: {
                        HStack {
                            Text(label).font(.system(size: 15, weight: .semibold)).foregroundStyle(selected ? .white : Theme.text)
                            Spacer()
                            if selected { Image(systemName: "checkmark").foregroundStyle(.white) }
                        }
                        .padding(15)
                        .background(selected ? Theme.primary : Theme.surface, in: RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: selected ? 0 : 1))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var noteField: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Note (Optional)")
            TextField("Add a note or memo...", text: $note, axis: .vertical)
                .lineLimit(3...5)
                .padding(14)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.border, lineWidth: 1))
        }
    }

    private var giveButton: some View {
        Button { showConfirm = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "heart.fill")
                Text("Give \(formattedAmount)").font(.system(size: 17, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 17)
            .background(Theme.primary, in: RoundedRectangle(cornerRadius: 16))
        }
        .disabled((Double(amount) ?? 0) <= 0)
        .opacity((Double(amount) ?? 0) <= 0 ? 0.5 : 1)
    }

    private var securityNote: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.shield.fill").font(.system(size: 14))
            Text("Secured · SSL encrypted").font(.system(size: 12))
        }
        .foregroundStyle(Theme.success)
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.text)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var formattedAmount: String { currency(Double(amount) ?? 0) }

    private func currency(_ value: Double) -> String {
        let f = NumberFormatter(); f.numberStyle = .currency; f.currencyCode = "USD"
        return f.string(from: NSNumber(value: value)) ?? "$0.00"
    }

    private func confirm() {
        guard let value = Double(amount), value > 0,
              let org = auth.currentOrganization?.id, let uid = auth.user?.id else { return }
        Task {
            do {
                try await SupabaseService.shared.upsert(table: "donations", values: [
                    "church_id": org,
                    "user_id": uid,
                    "donation_type": givingType,
                    "amount": value,
                    "currency": "USD",
                    "frequency": frequency,
                    "note": note.isEmpty ? NSNull() : note,
                    "payment_method": "manual",
                    "status": "completed",
                ])
                amount = ""; note = ""
                showSuccess = true
                await data.loadGivingStats(org, userId: uid)
            } catch {
                print("Giving: error \(error.localizedDescription)")
            }
        }
    }
}

private struct HistoryTab: View {
    @Environment(AuthManager.self) private var auth
    @Environment(DataStore.self) private var data
    @State private var donations: [Donation] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if donations.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "clock.arrow.circlepath").font(.system(size: 44)).foregroundStyle(Theme.textTertiary)
                    Text("No Giving History").font(.system(size: 18, weight: .semibold)).foregroundStyle(Theme.text)
                    Text("Your donations will appear here after your first gift.")
                        .font(.system(size: 14)).foregroundStyle(Theme.textSecondary).multilineTextAlignment(.center)
                }
                .padding(40)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(donations) { d in DonationRow(donation: d) }
                    }
                    .padding(16)
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        guard let org = auth.currentOrganization?.id, let uid = auth.user?.id else { isLoading = false; return }
        donations = await data.donationHistory(orgId: org, userId: uid)
        isLoading = false
    }
}

private struct DonationRow: View {
    let donation: Donation

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: donation.type == "tithe" ? "dollarsign" : "gift")
                .font(.system(size: 18))
                .foregroundStyle(donation.type == "tithe" ? Theme.primary : Theme.secondary)
                .frame(width: 40, height: 40)
                .background((donation.type == "tithe" ? Theme.primary : Theme.secondary).opacity(0.12), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(donation.type == "tithe" ? "Tithe" : "Offering").font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.text)
                Text(dateLabel).font(.system(size: 13)).foregroundStyle(Theme.textSecondary)
                if let note = donation.note, !note.isEmpty {
                    Text(note).font(.system(size: 12)).foregroundStyle(Theme.textTertiary).lineLimit(1)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(currency(donation.amount)).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.text)
                Text(donation.status.capitalized)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.success)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Theme.success.opacity(0.15), in: RoundedRectangle(cornerRadius: 6))
            }
        }
        .padding(15)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 14))
        .cardShadow()
    }

    private var dateLabel: String {
        guard let date = ISO8601DateFormatter.flexible.date(from: donation.createdAt)
                ?? ISO8601DateFormatter().date(from: donation.createdAt) else { return "" }
        let f = DateFormatter(); f.dateFormat = "MMM d, yyyy"
        return f.string(from: date)
    }

    private func currency(_ value: Double) -> String {
        let f = NumberFormatter(); f.numberStyle = .currency; f.currencyCode = "USD"
        return f.string(from: NSNumber(value: value)) ?? "$0.00"
    }
}
