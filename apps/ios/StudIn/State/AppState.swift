import Foundation
import SwiftUI

enum AppTab: Int, CaseIterable {
    case home, schedule, services, events, profile

    var title: String {
        switch self {
        case .home: return "Головна"
        case .schedule: return "Розклад"
        case .services: return "Сервіси"
        case .events: return "Події"
        case .profile: return "Профіль"
        }
    }

    var systemIcon: String {
        switch self {
        case .home: return "house"
        case .schedule: return "calendar"
        case .services: return "square.grid.2x2"
        case .events: return "sparkles"
        case .profile: return "person"
        }
    }
}

@MainActor
final class AppState: ObservableObject {
    @Published var isOnboarded: Bool = false
    @Published var selectedTab: AppTab = .home
    @Published var preferredTheme: String = "system" // "system", "light", "dark"

    @Published var userName: String = ""
    @Published var selectedFacultyId: String = ""
    @Published var selectedGroup: StudentGroup? = nil
    @Published var subgroupOverride: Int = 0

    @Published var faculties: [Faculty] = []
    @Published var availableGroups: [StudentGroup] = []
    @Published var schedule: [ScheduleItem] = []
    @Published var students: [StudentMember] = []
    @Published var events: [StudEvent] = []

    @Published var savedFriends: [SavedFriendGroup] = []
    @Published var friendSchedules: [String: [ScheduleItem]] = [:]

    @Published var isLoadingSchedule: Bool = false
    @Published var now: Date = Date()

    private let defaults = UserDefaults.standard
    private var timer: Timer?

    init() {
        loadPersistedState()
        startClock()
        Task {
            await loadInitialData()
        }
    }

    deinit {
        timer?.invalidate()
    }

    var colorSchemeOverride: ColorScheme? {
        switch preferredTheme {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }

    var firstName: String {
        let trimmed = userName.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "студенте" }
        let parts = trimmed.split(separator: " ")
        return parts.count > 1 ? String(parts[1]) : String(parts[0])
    }

    private func startClock() {
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.now = Date()
            }
        }
    }

    private func loadPersistedState() {
        userName = defaults.string(forKey: "studin_user_name") ?? ""
        selectedFacultyId = defaults.string(forKey: "studin_faculty_id") ?? ""
        subgroupOverride = defaults.integer(forKey: "studin_subgroup")
        preferredTheme = defaults.string(forKey: "studin_theme") ?? "system"

        if let gId = defaults.string(forKey: "studin_group_id"),
           let gName = defaults.string(forKey: "studin_group_name") {
            selectedGroup = StudentGroup(id: gId, name: gName, course: defaults.integer(forKey: "studin_group_course"))
            isOnboarded = true
        }

        if let friendsData = defaults.data(forKey: "studin_saved_friends"),
           let decoded = try? JSONDecoder().decode([SavedFriendGroup].self, from: friendsData) {
            savedFriends = decoded
        }
    }

    func saveOnboarding(group: StudentGroup, facultyId: String, name: String) {
        selectedGroup = group
        selectedFacultyId = facultyId
        userName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        isOnboarded = true

        defaults.set(group.id, forKey: "studin_group_id")
        defaults.set(group.name, forKey: "studin_group_name")
        defaults.set(group.course, forKey: "studin_group_course")
        defaults.set(facultyId, forKey: "studin_faculty_id")
        defaults.set(userName, forKey: "studin_user_name")

        Task {
            await refreshSchedule()
            await refreshStudents()
        }
    }

    func updateProfile(name: String, subgroup: Int) {
        userName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        subgroupOverride = subgroup
        defaults.set(userName, forKey: "studin_user_name")
        defaults.set(subgroup, forKey: "studin_subgroup")
    }

    func cycleTheme() {
        switch preferredTheme {
        case "system": preferredTheme = "light"
        case "light": preferredTheme = "dark"
        default: preferredTheme = "system"
        }
        defaults.set(preferredTheme, forKey: "studin_theme")
    }

    func addFriendGroup(_ friend: SavedFriendGroup) {
        savedFriends.append(friend)
        persistFriends()
        Task { await loadFriendSchedule(groupId: friend.groupId) }
    }

    func removeFriendGroup(id: String) {
        savedFriends.removeAll { $0.id == id }
        persistFriends()
    }

    private func persistFriends() {
        if let data = try? JSONEncoder().encode(savedFriends) {
            defaults.set(data, forKey: "studin_saved_friends")
        }
    }

    func loadInitialData() async {
        if let fetchedFaculties = try? await StudInAPI.shared.fetchFaculties(), !fetchedFaculties.isEmpty {
            faculties = fetchedFaculties
        }
        if let fetchedEvents = try? await StudInAPI.shared.fetchEvents() {
            events = fetchedEvents
        }
        if selectedGroup != nil {
            await refreshSchedule()
            await refreshStudents()
        }
        for friend in savedFriends {
            await loadFriendSchedule(groupId: friend.groupId)
        }
    }

    func loadGroupsForFaculty(_ facultyId: String) async {
        availableGroups = await StudInAPI.shared.fetchAllGroups(facultyId: facultyId)
    }

    func refreshSchedule() async {
        guard let groupId = selectedGroup?.id else { return }
        isLoadingSchedule = true
        defer { isLoadingSchedule = false }
        if let items = try? await StudInAPI.shared.fetchSchedule(groupId: groupId) {
            schedule = items
        }
    }

    func refreshStudents() async {
        guard let groupId = selectedGroup?.id else { return }
        if let list = try? await StudInAPI.shared.fetchStudents(groupId: groupId) {
            students = list
        }
    }

    func loadFriendSchedule(groupId: String) async {
        if friendSchedules[groupId] != nil { return }
        if let items = try? await StudInAPI.shared.fetchSchedule(groupId: groupId) {
            friendSchedules[groupId] = items
        }
    }

    func filteredSchedule(for items: [ScheduleItem], subgroup: Int) -> [ScheduleItem] {
        guard subgroup == 1 || subgroup == 2 else { return items }
        let sub1 = ["підгр. 1", "1 підгр", "п/г 1", "1 п/г", "підгрупа 1", "1 підгрупа", "пр 1.1"]
        let sub2 = ["підгр. 2", "2 підгр", "п/г 2", "2 п/г", "підгрупа 2", "2 підгрупа", "пр 1.2"]
        return items.filter { item in
            let lower = item.subject.lowercased()
            let only1 = sub1.contains { lower.contains($0) } && !sub2.contains { lower.contains($0) }
            let only2 = sub2.contains { lower.contains($0) } && !sub1.contains { lower.contains($0) }
            if subgroup == 1 && only2 { return false }
            if subgroup == 2 && only1 { return false }
            return true
        }
    }

    func lessons(for date: Date, from source: [ScheduleItem]? = nil, subgroup: Int? = nil) -> [ScheduleItem] {
        let cal = Calendar.current
        let list = filteredSchedule(for: source ?? schedule, subgroup: subgroup ?? subgroupOverride)
        return list.filter { item in
            guard let d = item.parsedDate else { return false }
            return cal.isDate(d, inSameDayAs: date)
        }.sorted { $0.startTime < $1.startTime }
    }
}
