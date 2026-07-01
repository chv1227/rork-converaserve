import SwiftUI

struct LoginView: View {
    @Environment(AuthManager.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isSubmitting = false
    @State private var showRegister = false
    @State private var showForgot = false
    @State private var appeared = false

    var body: some View {
        ZStack {
            Theme.loginGradient.ignoresSafeArea()
            BackgroundPattern().opacity(0.5)

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer(minLength: 70)
                    brand
                        .padding(.bottom, 40)
                    form
                    Spacer(minLength: 40)
                    footer
                        .padding(.bottom, 32)
                }
                .padding(.horizontal, 28)
                .frame(maxWidth: .infinity)
            }
        }
        .opacity(appeared ? 1 : 0)
        .animation(.easeOut(duration: 0.5), value: appeared)
        .onAppear { appeared = true }
        .sheet(isPresented: $showRegister) { RegisterView() }
        .sheet(isPresented: $showForgot) { ForgotPasswordView() }
    }

    private var brand: some View {
        VStack(spacing: 18) {
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Theme.accent.opacity(0.15))
                    .frame(width: 84, height: 84)
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(Theme.accent.opacity(0.3), lineWidth: 1)
                    )
                Image(systemName: "hands.and.sparkles.fill")
                    .font(.system(size: 38))
                    .foregroundStyle(Theme.accent)
            }
            VStack(spacing: 6) {
                Text("ChurchConnect")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(.white)
                Text("Welcome back to your community")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.7))
            }
        }
    }

    private var form: some View {
        VStack(spacing: 16) {
            GlassField(icon: "envelope.fill", placeholder: "Email address", text: $email)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            GlassField(icon: "lock.fill", placeholder: "Password", text: $password,
                       isSecure: !showPassword, trailing: {
                Button {
                    showPassword.toggle()
                } label: {
                    Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                        .foregroundStyle(.white.opacity(0.5))
                }
            })

            HStack {
                Spacer()
                Button("Forgot password?") { showForgot = true }
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Theme.accent)
            }

            if let error = auth.errorMessage {
                Text(error)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.error)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(action: submit) {
                ZStack {
                    if isSubmitting {
                        ProgressView().tint(Theme.primaryDark)
                    } else {
                        Text("Sign In")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Theme.primaryDark)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Theme.accent, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .disabled(isSubmitting)
            .padding(.top, 4)
        }
    }

    private var footer: some View {
        HStack(spacing: 4) {
            Text("Don't have an account?")
                .foregroundStyle(.white.opacity(0.7))
            Button("Sign Up") { showRegister = true }
                .fontWeight(.semibold)
                .foregroundStyle(Theme.accent)
        }
        .font(.system(size: 15))
    }

    private func submit() {
        isSubmitting = true
        Task {
            _ = await auth.login(email: email.trimmingCharacters(in: .whitespaces), password: password)
            isSubmitting = false
        }
    }
}

/// Glassmorphism text field used on auth screens.
struct GlassField<Trailing: View>: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    @ViewBuilder var trailing: () -> Trailing

    init(icon: String, placeholder: String, text: Binding<String>, isSecure: Bool = false,
         @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }) {
        self.icon = icon
        self.placeholder = placeholder
        self._text = text
        self.isSecure = isSecure
        self.trailing = trailing
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(.white.opacity(0.5))
                .frame(width: 20)
            Group {
                if isSecure {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(.white.opacity(0.4)))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundColor(.white.opacity(0.4)))
                }
            }
            .foregroundStyle(.white)
            .font(.system(size: 16))
            trailing()
        }
        .padding(.horizontal, 18)
        .frame(height: 56)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.white.opacity(0.12), lineWidth: 1)
        )
    }
}

/// Subtle decorative circles/dots evoking stained-glass motifs.
struct BackgroundPattern: View {
    var body: some View {
        GeometryReader { geo in
            ZStack {
                Circle()
                    .stroke(Theme.accent.opacity(0.10), lineWidth: 1.5)
                    .frame(width: 260, height: 260)
                    .position(x: geo.size.width * 0.85, y: geo.size.height * 0.12)
                Circle()
                    .stroke(.white.opacity(0.06), lineWidth: 1)
                    .frame(width: 180, height: 180)
                    .position(x: geo.size.width * 0.1, y: geo.size.height * 0.35)
                Circle()
                    .fill(Theme.highlight.opacity(0.08))
                    .frame(width: 120, height: 120)
                    .position(x: geo.size.width * 0.2, y: geo.size.height * 0.9)
            }
        }
        .ignoresSafeArea()
    }
}
