import SwiftUI

struct ScheduleScreen: View {
    @EnvironmentObject var state: AppState
    @Environment(\.colorScheme) var scheme
    @Environment(\.openURL) var openURL

    enum SchedulePeriod: String, CaseIterable {
        case today = "Сьогодні"
        case tomorrow = "Завтра"
        case week = "Тиждень"
    }

    @State private var period: SchedulePeriod = .today
    @State private var selectedWeekDate: Date = Date()
    @State private var activeTargetId: String = "my" // "my" or friend.id
    @State private var isCompareMode: Bool = false
    @State private var showAddFriendSheet: Bool = false

    private var activeDate: Date {
        switch period {
        case .today: return state.now
        case .tomorrow: return Calendar.current.date(byAdding: .day, value: 1, to: state.now) ?? state.now
        case .week: return selectedWeekDate
        }
    }

    private var activeFriend: SavedFriendGroup? {
        state.savedFriends.first { $0.id == activeTargetId }
    }

    private var activeLessons: [ScheduleItem] {
        if let friend = activeFriend {
            return state.lessons(for: activeDate, from: state.friendSchedules[friend.groupId] ?? [], subgroup: friend.subgroup)
        }
        return state.lessons(for: activeDate)
    }

    private var weekDays: [Date] {
        let cal = Calendar.current
        let weekday = cal.component(.weekday, from: selectedWeekDate)
        let offsetToMonday = weekday == 1 ? -6 : (2 - weekday)
        let monday = cal.date(byAdding: .day, value: offsetToMonday, to: selectedWeekDate) ?? selectedWeekDate
        return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: monday) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                StudTopHeader {
                    state.selectedTab = .profile
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Мій розклад")
                        .font(.system(size: 28, weight: .heavy))
                        .foregroundColor(StudInTheme.textPrimary(scheme))
                    Text("ДТЕУ · \(activeFriend?.groupName ?? state.selectedGroup?.name ?? "ФТМ 3-10")")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                }

                // Multi-schedule horizontal bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        Button {
                            isCompareMode = false
                            activeTargetId = "my"
                        } label: {
                            HStack(spacing: 6) {
                                Circle().fill(StudInTheme.lime).frame(width: 7, height: 7)
                                Text("\(state.selectedGroup?.name ?? "Моя") (Моя)")
                                    .font(.system(size: 13, weight: .bold))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(!isCompareMode && activeTargetId == "my" ? StudInTheme.forest : StudInTheme.bgSurface(scheme))
                            .foregroundColor(!isCompareMode && activeTargetId == "my" ? .white : StudInTheme.textPrimary(scheme))
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(StudInTheme.border(scheme), lineWidth: 1))
                        }

                        ForEach(state.savedFriends) { friend in
                            let isSelected = !isCompareMode && activeTargetId == friend.id
                            Button {
                                isCompareMode = false
                                activeTargetId = friend.id
                                Task { await state.loadFriendSchedule(groupId: friend.groupId) }
                            } label: {
                                HStack(spacing: 6) {
                                    Text("\(friend.groupName)\(friend.label.isEmpty ? "" : " · \(friend.label)")")
                                        .font(.system(size: 13, weight: .bold))
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10, weight: .bold))
                                        .onTapGesture {
                                            if activeTargetId == friend.id { activeTargetId = "my" }
                                            state.removeFriendGroup(id: friend.id)
                                        }
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(isSelected ? StudInTheme.forest : StudInTheme.bgSurface(scheme))
                                .foregroundColor(isSelected ? .white : StudInTheme.textPrimary(scheme))
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(StudInTheme.border(scheme), lineWidth: 1))
                            }
                        }

                        if !state.savedFriends.isEmpty {
                            Button {
                                isCompareMode.toggle()
                            } label: {
                                Text("⇄ Спільні вікна")
                                    .font(.system(size: 13, weight: .bold))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(isCompareMode ? StudInTheme.lime : StudInTheme.bgSurfaceAlt(scheme))
                                    .foregroundColor(isCompareMode ? StudInTheme.darkTextOnLime : StudInTheme.textPrimary(scheme))
                                    .clipShape(Capsule())
                            }
                        }

                        Button {
                            showAddFriendSheet = true
                        } label: {
                            Text("+ Група друга")
                                .font(.system(size: 13, weight: .bold))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(StudInTheme.bgSurface(scheme))
                                .foregroundColor(StudInTheme.textSecondary(scheme))
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(StudInTheme.border(scheme), style: StrokeStyle(lineWidth: 1, dash: [4])))
                        }

                        if let gid = activeFriend?.groupId ?? state.selectedGroup?.id,
                           let url = StudInAPI.shared.calendarExportURL(groupId: gid) {
                            Button {
                                openURL(url)
                            } label: {
                                Label("У календар", systemImage: "calendar.badge.plus")
                                    .font(.system(size: 13, weight: .bold))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(StudInTheme.bgSurface(scheme))
                                    .foregroundColor(StudInTheme.textPrimary(scheme))
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(StudInTheme.border(scheme), lineWidth: 1))
                            }
                        }
                    }
                }

                // Period Segmented Control
                HStack(spacing: 4) {
                    ForEach(SchedulePeriod.allCases, id: \.self) { p in
                        let isActive = period == p
                        Button {
                            withAnimation(.spring(response: 0.28, dampingFraction: 0.8)) {
                                period = p
                            }
                        } label: {
                            Text(p.rawValue)
                                .font(.system(size: 13, weight: isActive ? .bold : .semibold))
                                .foregroundColor(isActive ? .white : StudInTheme.textSecondary(scheme))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 9)
                                .background(isActive ? StudInTheme.forest : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 11))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(4)
                .background(StudInTheme.bgSurfaceAlt(scheme))
                .clipShape(RoundedRectangle(cornerRadius: 14))

                // Week Strip
                if period == .week {
                    HStack(spacing: 4) {
                        let names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]
                        ForEach(Array(weekDays.enumerated()), id: \.offset) { idx, day in
                            let isSelected = Calendar.current.isDate(day, inSameDayAs: selectedWeekDate)
                            Button {
                                selectedWeekDate = day
                            } label: {
                                VStack(spacing: 4) {
                                    Text(names[idx])
                                        .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                                    Text("\(Calendar.current.component(.day, from: day))")
                                        .font(.system(size: 15, weight: .bold))
                                }
                                .foregroundColor(isSelected ? StudInTheme.darkTextOnLime : StudInTheme.textPrimary(scheme))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(isSelected ? StudInTheme.lime : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // Content: Compare Mode or Normal List
                if isCompareMode, let friend = state.savedFriends.first {
                    CompareScheduleBlock(
                        myGroupName: state.selectedGroup?.name ?? "Моя",
                        friend: friend,
                        myLessons: state.lessons(for: activeDate),
                        friendLessons: state.lessons(for: activeDate, from: state.friendSchedules[friend.groupId] ?? [], subgroup: friend.subgroup)
                    )
                } else if state.isLoadingSchedule {
                    ProgressView("Оновлюємо розклад...")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                } else if activeLessons.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 28))
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                            .frame(width: 60, height: 60)
                            .background(StudInTheme.bgSurfaceAlt(scheme))
                            .clipShape(RoundedRectangle(cornerRadius: 18))
                        Text("Сьогодні пар немає")
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                        Text("Час для себе й нових планів.")
                            .font(.system(size: 14))
                            .foregroundColor(StudInTheme.textSecondary(scheme))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(32)
                    .background(StudInTheme.bgSurface(scheme))
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                    .overlay(RoundedRectangle(cornerRadius: 22).stroke(StudInTheme.border(scheme), lineWidth: 1))
                } else {
                    LazyVStack(spacing: 10) {
                        ForEach(activeLessons) { lesson in
                            LessonRowCard(lesson: lesson)
                        }
                    }
                }
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
        .refreshable {
            await state.refreshSchedule()
        }
        .sheet(isPresented: $showAddFriendSheet) {
            AddFriendGroupSheet()
        }
    }
}

private struct LessonRowCard: View {
    let lesson: ScheduleItem
    @Environment(\.colorScheme) var scheme

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 2) {
                Text(lesson.startTime)
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundColor(StudInTheme.textPrimary(scheme))
                Text(lesson.endTime)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(StudInTheme.textSecondary(scheme))
            }
            .frame(width: 56, alignment: .leading)

            VStack(alignment: .leading, spacing: 4) {
                Text("\(lesson.lessonNumber) ПАРА · \(lesson.typeLabel.uppercased())")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(StudInTheme.textSecondary(scheme))
                Text(lesson.subject)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(StudInTheme.textPrimary(scheme))
                if let teacher = lesson.teacher, !teacher.isEmpty {
                    Text(teacher)
                        .font(.system(size: 13))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                }

                HStack(spacing: 5) {
                    Image(systemName: lesson.isOnline ? "video" : "mappin.and.ellipse")
                        .font(.system(size: 11))
                    Text(lesson.isOnline ? "Онлайн" : "Ауд. \(lesson.classroom ?? "")")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(StudInTheme.textPrimary(scheme))
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(StudInTheme.bgSurfaceAlt(scheme))
                .clipShape(Capsule())
                .padding(.top, 4)
            }
            Spacer()
        }
        .padding(14)
        .background(StudInTheme.bgSurface(scheme))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(StudInTheme.border(scheme), lineWidth: 1))
    }
}

private struct CompareScheduleBlock: View {
    let myGroupName: String
    let friend: SavedFriendGroup
    let myLessons: [ScheduleItem]
    let friendLessons: [ScheduleItem]
    @Environment(\.colorScheme) var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("ПОРІВНЯННЯ · \(myGroupName) ⇄ \(friend.groupName)")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(StudInTheme.lime)
                Text("Твоїх пар: \(myLessons.count) · У друга: \(friendLessons.count)")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(StudInTheme.forest)
            .clipShape(RoundedRectangle(cornerRadius: 18))

            ForEach(BellSlot.dteuSchedule.prefix(4)) { bell in
                let myL = myLessons.first { $0.lessonNumber == bell.number }
                let frL = friendLessons.first { $0.lessonNumber == bell.number }
                if myL != nil || frL != nil {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("\(bell.number) пара · \(bell.start)–\(bell.end)")
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                        HStack(spacing: 8) {
                            CompareSideBox(title: "ВИ", lesson: myL)
                            CompareSideBox(title: friend.label.isEmpty ? friend.groupName : friend.label, lesson: frL)
                        }
                    }
                    .padding(12)
                    .background(StudInTheme.bgSurface(scheme))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(StudInTheme.border(scheme), lineWidth: 1))
                }
            }
        }
    }
}

private struct CompareSideBox: View {
    let title: String
    let lesson: ScheduleItem?
    @Environment(\.colorScheme) var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(StudInTheme.textSecondary(scheme))
            if let l = lesson {
                Text(l.subject)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(StudInTheme.textPrimary(scheme))
                    .lineLimit(2)
                Text(l.isOnline ? "Онлайн" : "Ауд. \(l.classroom ?? "")")
                    .font(.system(size: 11))
                    .foregroundColor(StudInTheme.textSecondary(scheme))
            } else {
                Text("Вільно (Вікно)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(StudInTheme.textSecondary(scheme))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 74, alignment: .topLeading)
        .padding(10)
        .background(StudInTheme.bgSurfaceAlt(scheme).opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct AddFriendGroupSheet: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) var dismiss
    @State private var friendLabel = ""
    @State private var selectedFacId = ""
    @State private var selectedGroup: StudentGroup? = nil

    var body: some View {
        NavigationStack {
            Form {
                Section("Підпис друга") {
                    TextField("Наприклад: Макс, Аліна...", text: $friendLabel)
                }
                Section("Факультет і група ДТЕУ") {
                    Picker("Факультет", selection: $selectedFacId) {
                        Text("Обери факультет").tag("")
                        ForEach(state.faculties) { f in
                            Text(f.name).tag(f.id)
                        }
                    }
                    .onChange(of: selectedFacId) { _, fid in
                        Task { await state.loadGroupsForFaculty(fid) }
                    }

                    if !state.availableGroups.isEmpty {
                        Picker("Група", selection: $selectedGroup) {
                            Text("Обери групу").tag(Optional<StudentGroup>.none)
                            ForEach(state.availableGroups) { g in
                                Text(g.name).tag(Optional(g))
                            }
                        }
                    }
                }
            }
            .navigationTitle("Додати групу друга")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Скасувати") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Додати") {
                        if let g = selectedGroup {
                            state.addFriendGroup(
                                SavedFriendGroup(
                                    id: "fr-\(g.id)-\(Int(Date().timeIntervalSince1970))",
                                    groupId: g.id,
                                    groupName: g.name,
                                    label: friendLabel.trimmingCharacters(in: .whitespaces),
                                    subgroup: 0
                                )
                            )
                            dismiss()
                        }
                    }
                    .disabled(selectedGroup == nil)
                }
            }
        }
    }
}
