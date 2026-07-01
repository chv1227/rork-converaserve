//
//  ContentView.swift
//  ChurchConnect
//
//  Created by Rork on July 1, 2026.
//

import SwiftUI

struct ContentView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        Group {
            if auth.isLoading {
                LaunchView()
            } else if auth.isAuthenticated {
                if auth.currentOrganization == nil {
                    NoOrganizationView()
                } else {
                    MainTabView()
                }
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: auth.isLoading)
    }
}

/// Splash shown while the session is being restored.
struct LaunchView: View {
    var body: some View {
        ZStack {
            Theme.loginGradient.ignoresSafeArea()
            VStack(spacing: 20) {
                ZStack {
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(Theme.accent.opacity(0.15))
                        .frame(width: 90, height: 90)
                    Image(systemName: "hands.and.sparkles.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(Theme.accent)
                }
                Text("ChurchConnect")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.white)
                ProgressView().tint(.white)
            }
        }
    }
}

/// Shown when a signed-in user has no church membership yet.
struct NoOrganizationView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "building.2.crop.circle")
                .font(.system(size: 64))
                .foregroundStyle(Theme.primary)
            Text("No Church Yet")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Theme.text)
            Text("You're signed in, but not part of a church community yet. Ask your church admin for an invite to get started.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
            Button {
                auth.logout()
            } label: {
                Text("Sign Out")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.error)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Theme.error.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 30)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background)
    }
}
