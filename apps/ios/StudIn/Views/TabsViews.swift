import SwiftUI

// ==================== SERVICES, CAMPUS & BELLS ====================

struct ServicesScreen: View {
    @Environment(\.colorScheme) var scheme
    @Environment(\.openURL) var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                StudTopHeader()

                VStack(alignment: .leading, spacing: 4) {
                    Text("Сервіси")
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(StudInTheme.textPrimary(scheme))
                    Text("Університет ДТЕУ під рукою")
                        .font(.system(size: 14))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                }

                NavigationLink(destination: CampusDetailScreen()) {
                    ServiceRow(icon: "mappin.and.ellipse", title: "Кампус", subtitle: "Корпуси А, Б, В, Г, Д, Л та адреси")
                }
                .buttonStyle(.plain)

                NavigationLink(destination: BellsDetailScreen()) {
                    ServiceRow(icon: "bell", title: "Розклад дзвінків", subtitle: "Час пар, перерв та живий таймер")
                }
                .buttonStyle(.plain)

                Button {
                    if let url = URL(string: "https://mia1.knute.edu.ua") { openURL(url) }
                } label: {
                    ServiceRow(icon: "graduationcap", title: "Електронний кабінет МІА", subtitle: "Журнал оцінок та успішність")
                }
                .buttonStyle(.plain)

                Button {
                    if let url = URL(string: "https://dl.knute.edu.ua") { openURL(url) }
                } label: {
                    ServiceRow(icon: "book", title: "Moodle ДТЕУ", subtitle: "Система дистанційного навчання")
                }
                .buttonStyle(.plain)

                Button {
                    if let url = URL(string: "https://t.me/knute_official") { openURL(url) }
                } label: {
                    ServiceRow(icon: "person.2", title: "Спільнота ДТЕУ", subtitle: "Офіційний канал та студентське самоврядування")
                }
                .buttonStyle(.plain)
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
    }
}

private struct ServiceRow: View {
    let icon: String
    let title: String
    let subtitle: String
    @Environment(\.colorScheme) var scheme

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(scheme == .dark ? StudInTheme.lime : StudInTheme.textPrimary(scheme))
                .frame(width: 40, height: 40)
                .background(StudInTheme.bgSurfaceAlt(scheme))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(StudInTheme.textPrimary(scheme))
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundColor(StudInTheme.textSecondary(scheme))
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(StudInTheme.textSecondary(scheme))
        }
        .padding(14)
        .background(StudInTheme.bgSurface(scheme))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))
    }
}

struct CampusDetailScreen: View {
    @Environment(\.colorScheme) var scheme
    @Environment(\.openURL) var openURL

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(CampusBuilding.dteuBuildings) { b in
                    Button {
                        let q = b.mapQuery.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                        if let url = URL(string: "http://maps.apple.com/?q=\(q)") {
                            openURL(url)
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Text(b.code)
                                .font(.system(size: 18, weight: .heavy))
                                .foregroundColor(StudInTheme.darkTextOnLime)
                                .frame(width: 44, height: 44)
                                .background(StudInTheme.lime)
                                .clipShape(RoundedRectangle(cornerRadius: 13))
                            VStack(alignment: .leading, spacing: 3) {
                                Text(b.title)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(StudInTheme.textPrimary(scheme))
                                Text(b.subtitle)
                                    .font(.system(size: 12))
                                    .foregroundColor(StudInTheme.textSecondary(scheme))
                                Text("📍 \(b.address)")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(StudInTheme.textPrimary(scheme))
                            }
                            Spacer()
                            Image(systemName: "map")
                                .foregroundColor(StudInTheme.textSecondary(scheme))
                        }
                        .padding(14)
                        .background(StudInTheme.bgSurface(scheme))
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
        .navigationTitle("Кампус ДТЕУ")
    }
}

struct BellsDetailScreen: View {
    @Environment(\.colorScheme) var scheme

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                ForEach(BellSlot.dteuSchedule) { b in
                    VStack(spacing: 6) {
                        HStack(spacing: 14) {
                            Text("\(b.number)")
                                .font(.system(size: 16, weight: .heavy))
                                .foregroundColor(StudInTheme.textPrimary(scheme))
                                .frame(width: 40, height: 40)
                                .background(StudInTheme.bgSurfaceAlt(scheme))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(b.number) пара")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(StudInTheme.textSecondary(scheme))
                                Text("\(b.start) — \(b.end)")
                                    .font(.system(size: 18, weight: .heavy))
                                    .foregroundColor(StudInTheme.textPrimary(scheme))
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(StudInTheme.bgSurface(scheme))
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))

                        if b.breakAfter > 0 {
                            Text("Перерва · \(b.breakAfter) хв")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(StudInTheme.textSecondary(scheme))
                        }
                    }
                }
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
        .navigationTitle("Розклад дзвінків")
    }
}

// ==================== EVENTS ====================

struct EventsScreen: View {
    @EnvironmentObject var state: AppState
    @Environment(\.colorScheme) var scheme
    @Environment(\.openURL) var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                StudTopHeader()

                VStack(alignment: .leading, spacing: 4) {
                    Text("Події")
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(StudInTheme.textPrimary(scheme))
                    Text("Офіційні анонси sute.edu.ua")
                        .font(.system(size: 14))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                }

                ForEach(state.events) { ev in
                    Button {
                        if let str = ev.actionUrl ?? ev.sourceUrl, let url = URL(string: str) {
                            openURL(url)
                        }
                    } label: {
                        HStack(alignment: .top, spacing: 12) {
                            VStack(spacing: 1) {
                                Text(ev.dayNum)
                                    .font(.system(size: 17, weight: .heavy))
                                Text(ev.monthShort)
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                            .frame(width: 48, height: 48)
                            .background(StudInTheme.bgSurfaceAlt(scheme))
                            .clipShape(RoundedRectangle(cornerRadius: 14))

                            VStack(alignment: .leading, spacing: 4) {
                                Text(ev.categoryBadge)
                                    .font(.system(size: 10, weight: .heavy))
                                    .foregroundColor(scheme == .dark ? StudInTheme.lime : StudInTheme.forest)
                                Text(ev.title)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(StudInTheme.textPrimary(scheme))
                                    .multilineTextAlignment(.leading)
                                Text("\(ev.dateLabel) · \(ev.timeInfo)")
                                    .font(.system(size: 12))
                                    .foregroundColor(StudInTheme.textSecondary(scheme))
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(StudInTheme.bgSurface(scheme))
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
        .refreshable {
            await state.loadInitialData()
        }
    }
}

// ==================== PROFILE & CLASSMATES ====================

struct ProfileScreen: View {
    @EnvironmentObject var state: AppState
    @Environment(\.colorScheme) var scheme
    @Environment(\.openURL) var openURL

    var themeLabel: String {
        switch state.preferredTheme {
        case "light": return "Світла · UA"
        case "dark": return "Темна · UA"
        default: return "Системна · UA"
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                StudTopHeader()

                Text("Мій профіль")
                    .font(.system(size: 28, weight: .heavy))
                    .foregroundColor(StudInTheme.textPrimary(scheme))

                // User Card
                HStack(spacing: 14) {
                    Image(systemName: "person")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(StudInTheme.darkTextOnLime)
                        .frame(width: 48, height: 48)
                        .background(StudInTheme.lime)
                        .clipShape(Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(state.userName.isEmpty ? "Студент STUD IN" : state.userName)
                            .font(.system(size: 17, weight: .heavy))
                            .foregroundColor(.white)
                        Text("ДТЕУ · \(state.selectedGroup?.name ?? "ФТМ 3-10")")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    Spacer()
                }
                .padding(16)
                .background(StudInTheme.forest)
                .clipShape(RoundedRectangle(cornerRadius: 20))

                // Education Group
                VStack(spacing: 0) {
                    ProfileRow(icon: "building.columns", title: "Університет", value: "ДТЕУ") {
                        state.isOnboarded = false
                    }
                    Divider()
                    ProfileRow(icon: "person.2", title: "Академічна група", value: state.selectedGroup?.name ?? "Обрати") {
                        state.isOnboarded = false
                    }
                    Divider()
                    NavigationLink(destination: ClassmatesScreen()) {
                        ProfileRowLabel(icon: "person.3", title: "Одногрупники", value: "\(state.students.count) осіб")
                    }
                    .buttonStyle(.plain)
                    Divider()
                    ProfileRow(icon: "calendar.badge.plus", title: "Експорт у Календар", value: "Apple (.ics)") {
                        if let gid = state.selectedGroup?.id,
                           let url = StudInAPI.shared.calendarExportURL(groupId: gid) {
                            openURL(url)
                        }
                    }
                }
                .background(StudInTheme.bgSurface(scheme))
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))

                // Settings Group
                VStack(spacing: 0) {
                    ProfileRow(icon: "circle.lefthalf.filled", title: "Тема і мова", value: themeLabel) {
                        state.cycleTheme()
                    }
                }
                .background(StudInTheme.bgSurface(scheme))
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
    }
}

private struct ProfileRow: View {
    let icon: String
    let title: String
    let value: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ProfileRowLabel(icon: icon, title: title, value: value)
        }
        .buttonStyle(.plain)
    }
}

private struct ProfileRowLabel: View {
    let icon: String
    let title: String
    let value: String
    @Environment(\.colorScheme) var scheme

    var body: some View {
        HStack {
            Image(systemName: icon)
                .frame(width: 24)
                .foregroundColor(StudInTheme.textPrimary(scheme))
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(StudInTheme.textPrimary(scheme))
            Spacer()
            Text(value)
                .font(.system(size: 14))
                .foregroundColor(StudInTheme.textSecondary(scheme))
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(StudInTheme.textSecondary(scheme))
        }
        .padding(15)
    }
}

struct ClassmatesScreen: View {
    @EnvironmentObject var state: AppState
    @Environment(\.colorScheme) var scheme

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                ForEach(Array(state.students.enumerated()), id: \.element.id) { idx, student in
                    HStack(spacing: 12) {
                        Text("\(idx + 1)")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                            .frame(width: 36, height: 36)
                            .background(StudInTheme.bgSurfaceAlt(scheme))
                            .clipShape(Circle())
                        Text(student.fullName)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                        Spacer()
                    }
                    .padding(12)
                    .background(StudInTheme.bgSurface(scheme))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(StudInTheme.border(scheme), lineWidth: 1))
                }
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
        .navigationTitle("Одногрупники")
    }
}
