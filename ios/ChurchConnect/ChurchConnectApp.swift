//
//  ChurchConnectApp.swift
//  ChurchConnect
//
//  Created by Rork on July 1, 2026.
//

import SwiftUI

@main
struct ChurchConnectApp: App {
    @State private var auth = AuthManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(auth)
                .task { await auth.bootstrap() }
        }
    }
}
