import SwiftUI

struct HomeScreen: View {
    @EnvironmentObject var state: AppState
    @Environment(\.colorScheme) var scheme

    private var todayLessons: [ScheduleItem] {
        state.lessons(for: state.now)
    }

    private var currentOrNextLesson: ScheduleItem? {
        let df = DateFormatter()
        df.dateFormat = "HH:mm"
        let nowStr = df.string(from: state.now)

        if let todayNext = todayLessons.first(where: { $0.endTime >= nowStr }) {
            return todayNext
        }

        let all = state.filteredSchedule(for: state.schedule, subgroup: state.subgroupOverride)
        let startOfToday = Calendar.current.startOfDay(for: state.now)
        return all
            .filter { ($0.parsedDate ?? .distantPast) > startOfToday }
            .sorted { ($0.parsedDate ?? .distantFuture) < ($1.parsedDate ?? .distantFuture) }
            .first
    }

    private var liveProgress: (label: String, percent: Double)? {
        let cal = Calendar.current
        let nowMin = cal.component(.hour, from: state.now) * 60 + cal.component(.minute, from: state.now)

        func toMin(_ str: String) -> Int {
            let parts = str.split(separator: ":").compactMap { Int($0) }
            return (parts.first ?? 0) * 60 + (parts.count > 1 ? parts[1] : 0)
        }

        for lesson in todayLessons {
            let s = toMin(lesson.startTime)
            let e = toMin(lesson.endTime)
            if nowMin >= s && nowMin <= e {
                let left = max(0, e - nowMin)
                let pct = Double(nowMin - s) / Double(max(1, e - s))
                return ("До кінця пари: \(left) хв", min(1, max(0, pct)))
            }
        }
        return nil
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                StudTopHeader {
                    state.selectedTab = .profile
                }

                // Greeting
                VStack(alignment: .leading, spacing: 6) {
                    Text("Привіт, \(state.firstName)")
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(StudInTheme.textPrimary(scheme))

                    HStack {
                        Text("ДТЕУ · \(state.selectedGroup?.name ?? "ФТМ 3-10")")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(StudInTheme.textSecondary(scheme))
                        Spacer()
                        Text(todayLessons.isEmpty ? "Сьогодні без пар" : "Сьогодні \(todayLessons.count) пар(и)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(StudInTheme.bgSurfaceAlt(scheme))
                            .clipShape(Capsule())
                    }
                }

                // Hero Card: Next Lesson + Live Timer
                VStack(alignment: .leading, spacing: 10) {
                    Text(liveProgress != nil ? "ЗАРАЗ ТРИВАЄ ПАРА" : "НАСТУПНА ПАРА")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(0.6)
                        .foregroundColor(StudInTheme.lime)

                    if let lesson = currentOrNextLesson {
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(lesson.startTime)
                                .font(.system(size: 32, weight: .heavy))
                                .foregroundColor(.white)
                            Text("— \(lesson.endTime)")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.white.opacity(0.75))
                        }

                        Text(lesson.subject)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)

                        Text("\(lesson.typeLabel)\(lesson.teacher != nil ? " · \(lesson.teacher!)" : "")")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.78))

                        if let live = liveProgress {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text("⏱ \(live.label)")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(StudInTheme.lime)
                                    Spacer()
                                    Text("\(Int(live.percent * 100))%")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(StudInTheme.lime)
                                }
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        Capsule().fill(Color.white.opacity(0.18))
                                        Capsule().fill(StudInTheme.lime).frame(width: geo.size.width * live.percent)
                                    }
                                }
                                .frame(height: 6)
                            }
                            .padding(.vertical, 4)
                        }

                        HStack(spacing: 6) {
                            Image(systemName: lesson.isOnline ? "video" : "mappin.and.ellipse")
                                .font(.system(size: 12))
                            Text(lesson.isOnline ? "Онлайн" : "Ауд. \(lesson.classroom ?? "")")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 11)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.14))
                        .clipShape(Capsule())
                    } else {
                        Text("Розклад завантажується або пар найближчим часом немає.")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white.opacity(0.85))
                    }

                    Divider().overlay(Color.white.opacity(0.15)).padding(.vertical, 4)

                    Button {
                        state.selectedTab = .schedule
                    } label: {
                        HStack {
                            Text("Відкрити розклад")
                                .font(.system(size: 14, weight: .bold))
                            Spacer()
                            Text("→")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(StudInTheme.lime)
                    }
                }
                .padding(18)
                .background(scheme == .dark ? StudInTheme.forestDark : StudInTheme.forest)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

                // Quick Access 2x2
                Text("Швидкий доступ")
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundColor(StudInTheme.textPrimary(scheme))

                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    QuickTile(icon: "calendar", title: "Розклад") { state.selectedTab = .schedule }
                    QuickTile(icon: "mappin.and.ellipse", title: "Кампус") { state.selectedTab = .services }
                    QuickTile(icon: "bell", title: "Дзвінки") { state.selectedTab = .services }
                    QuickTile(icon: "book", title: "Довідник") { state.selectedTab = .services }
                }

                // Student Life (Live SUTE Event)
                HStack {
                    Text("Студентське життя")
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundColor(StudInTheme.textPrimary(scheme))
                    Spacer()
                    Button("Усі події →") {
                        state.selectedTab = .events
                    }
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(StudInTheme.textPrimary(scheme))
                }

                if let firstEvent = state.events.first {
                    Button {
                        state.selectedTab = .events
                    } label: {
                        HStack(spacing: 12) {
                            VStack(spacing: 1) {
                                Text(firstEvent.dayNum)
                                    .font(.system(size: 17, weight: .heavy))
                                Text(firstEvent.monthShort)
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundColor(StudInTheme.darkTextOnLime)
                            .frame(width: 48, height: 48)
                            .background(StudInTheme.lime)
                            .clipShape(RoundedRectangle(cornerRadius: 14))

                            VStack(alignment: .leading, spacing: 3) {
                                Text(firstEvent.title)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(StudInTheme.textPrimary(scheme))
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                Text("Офіційний анонс · sute.edu.ua")
                                    .font(.system(size: 12))
                                    .foregroundColor(StudInTheme.textSecondary(scheme))
                            }
                            Spacer()
                            Text("→").foregroundColor(StudInTheme.textSecondary(scheme))
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

private struct QuickTile: View {
    let icon: String
    let title: String
    let action: () -> Void
    @Environment(\.colorScheme) var scheme

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 17, weight: .medium))
                    .foregroundColor(scheme == .dark ? StudInTheme.lime : StudInTheme.textPrimary(scheme))
                    .frame(width: 38, height: 38)
                    .background(StudInTheme.bgSurfaceAlt(scheme))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(StudInTheme.textPrimary(scheme))
                Spacer()
            }
            .padding(12)
            .background(StudInTheme.bgSurface(scheme))
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
