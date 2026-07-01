import SwiftUI

struct RegisterView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isSubmitting = false
    @State private var localError: String?

    var body: some View {
        ZStack {
            Theme.loginGradient.ignoresSafeArea()
            BackgroundPattern().opacity(0.4)

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 22) {
                    HStack {
                        Button {
                            dismiss()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.7))
                                .frame(width: 40, height: 40)
                                .background(.white.opacity(0.08), in: Circle())
                        }
                        Spacer()
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Create Account")
                            .font(.system(size: 30, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Join your church community today")
                            .font(.system(size: 15))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    .padding(.top, 8)

                    VStack(spacing: 16) {
                        GlassField(icon: "person.fill", placeholder: "Full name", text: $name)
                            .textInputAutocapitalization(.words)
                        GlassField(icon: "envelope.fill", placeholder: "Email address", text: $email)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        GlassField(icon: "phone.fill", placeholder: "Phone (optional)", text: $phone)
                            .keyboardType(.phonePad)
                        GlassField(icon: "lock.fill", placeholder: "Password", text: $password,
                                   isSecure: !showPassword, trailing: {
                            Button { showPassword.toggle() } label: {
                                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                    .foregroundStyle(.white.opacity(0.5))
                            }
                        })
                    }

                    if let error = localError ?? auth.errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.error)
                    }

                    Button(action: submit) {
                        ZStack {
                            if isSubmitting {
                                ProgressView().tint(Theme.primaryDark)
                            } else {
                                Text("Create Account")
                                    .font(.system(size: 17, weight: .semibold))
                                    .foregroundStyle(Theme.primaryDark)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(Theme.accent, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .disabled(isSubmitting)

                    Text("By continuing you agree to our Terms of Service and Privacy Policy.")
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.5))
                        .frame(maxWidth: .infinity, alignment: .center)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private func submit() {
        localError = nil
        isSubmitting = true
        Task {
            let ok = await auth.register(
                email: email.trimmingCharacters(in: .whitespaces),
                password: password,
                name: name.trimmingCharacters(in: .whitespaces),
                phone: phone.isEmpty ? nil : phone
            )
            isSubmitting = false
            if ok { dismiss() }
        }
    }
}

struct ForgotPasswordView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var isSubmitting = false
    @State private var sent = false

    var body: some View {
        ZStack {
            Theme.loginGradient.ignoresSafeArea()
            BackgroundPattern().opacity(0.4)

            VStack(spacing: 22) {
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.7))
                            .frame(width: 40, height: 40)
                            .background(.white.opacity(0.08), in: Circle())
                    }
                    Spacer()
                }

                Spacer()

                if sent {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(Theme.success)
                        Text("Check your email")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(.white)
                        Text("We sent a password reset link to \(email).")
                            .font(.system(size: 15))
                            .foregroundStyle(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Reset Password")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Enter your email and we'll send you a link to reset your password.")
                            .font(.system(size: 15))
                            .foregroundStyle(.white.opacity(0.7))
                        GlassField(icon: "envelope.fill", placeholder: "Email address", text: $email)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Button(action: submit) {
                            ZStack {
                                if isSubmitting { ProgressView().tint(Theme.primaryDark) }
                                else { Text("Send Reset Link").font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.primaryDark) }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(Theme.accent, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                        .disabled(isSubmitting)
                    }
                }

                Spacer()
                Spacer()
            }
            .padding(.horizontal, 24)
        }
    }

    private func submit() {
        isSubmitting = true
        Task {
            let ok = await auth.sendPasswordReset(email: email.trimmingCharacters(in: .whitespaces))
            isSubmitting = false
            if ok { sent = true }
        }
    }
}
