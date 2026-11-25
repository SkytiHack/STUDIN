import SwiftUI

@main
struct StudInApp: App {
    @StateObject private var state = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(state)
                .preferredColorScheme(state.colorSchemeOverride)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.colorScheme) var scheme
    @Namespace private var navNamespace

    var body: some View {
        ZStack(alignment: .bottom) {
            StudInTheme.bgPage(scheme)
                .ignoresSafeArea()

            if !state.isOnboarded {
                OnboardingView()
            } else {
                Group {
                    switch state.selectedTab {
                    case .home:
                        NavigationStack { HomeScreen() }
                    case .schedule:
                        NavigationStack { ScheduleScreen() }
                    case .services:
                        NavigationStack { ServicesScreen() }
                    case .events:
                        NavigationStack { EventsScreen() }
                    case .profile:
                        NavigationStack { ProfileScreen() }
                    }
                }
                .padding(.bottom, 76)

                FloatingBottomDock(selectedTab: $state.selectedTab, namespace: navNamespace)
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.8), value: state.selectedTab)
    }
}

struct StudTopHeader: View {
    @Environment(\.colorScheme) var scheme
    var onBellTap: (() -> Void)? = nil

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("STUD IN")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(StudInTheme.textPrimary(scheme))
                Text("ТВІЙ СТУДЕНТСЬКИЙ ПРОСТІР")
                    .font(.system(size: 9, weight: .bold))
                    .tracking(0.9)
                    .foregroundColor(StudInTheme.textSecondary(scheme))
            }
            Spacer()
            if let onBellTap = onBellTap {
                Button(action: onBellTap) {
                    Image(systemName: "bell")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(StudInTheme.textPrimary(scheme))
                        .frame(width: 42, height: 42)
                        .background(StudInTheme.bgSurface(scheme))
                        .clipShape(Circle())
                        .overlay(Circle().stroke(StudInTheme.border(scheme), lineWidth: 1))
                }
            }
        }
    }
}

struct FloatingBottomDock: View {
    @Binding var selectedTab: AppTab
    var namespace: Namespace.ID
    @Environment(\.colorScheme) var scheme

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AppTab.allCases, id: \.self) { tab in
                let isActive = selectedTab == tab
                Button {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.78)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 3) {
                        ZStack {
                            if isActive {
                                Capsule()
                                    .fill(StudInTheme.lime)
                                    .frame(width: 46, height: 30)
                                    .matchedGeometryEffect(id: "dockPill", in: namespace)
                            }
                            Image(systemName: tab.systemIcon)
                                .font(.system(size: 17, weight: isActive ? .semibold : .regular))
                                .foregroundColor(isActive ? StudInTheme.darkTextOnLime : StudInTheme.textSecondary(scheme))
                        }
                        .frame(height: 30)

                        Text(tab.title)
                            .font(.system(size: 10, weight: isActive ? .bold : .medium))
                            .foregroundColor(isActive ? StudInTheme.textPrimary(scheme) : StudInTheme.textSecondary(scheme))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .background(StudInTheme.bgSurface(scheme).opacity(0.65))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(StudInTheme.border(scheme), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(scheme == .dark ? 0.35 : 0.08), radius: 14, y: 5)
        .padding(.horizontal, 14)
        .padding(.bottom, 6)
    }
}
