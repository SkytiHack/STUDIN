import Foundation

final class StudInAPI {
    static let shared = StudInAPI()
    let baseURL = "https://api-production-bedef992.up.railway.app"

    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        return URLSession(configuration: config)
    }()

    func fetchFaculties() async throws -> [Faculty] {
        guard let url = URL(string: "\(baseURL)/api/faculties") else { return [] }
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode([Faculty].self, from: data)
    }

    func fetchCourses(facultyId: String) async throws -> [Course] {
        guard let url = URL(string: "\(baseURL)/api/courses?facultyId=\(facultyId)") else { return [] }
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode([Course].self, from: data)
    }

    func fetchGroups(facultyId: String, course: String) async throws -> [StudentGroup] {
        guard let url = URL(string: "\(baseURL)/api/groups?facultyId=\(facultyId)&course=\(course)") else { return [] }
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode([StudentGroup].self, from: data)
    }

    func fetchAllGroups(facultyId: String) async -> [StudentGroup] {
        let courses = (try? await fetchCourses(facultyId: facultyId)) ?? [
            Course(id: "1", name: "1"),
            Course(id: "2", name: "2"),
            Course(id: "3", name: "3"),
            Course(id: "4", name: "4")
        ]
        var all: [StudentGroup] = []
        await withTaskGroup(of: [StudentGroup].self) { group in
            for c in courses {
                group.addTask {
                    (try? await self.fetchGroups(facultyId: facultyId, course: c.id)) ?? []
                }
            }
            for await chunk in group {
                all.append(contentsOf: chunk)
            }
        }
        return all.sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }

    func fetchSchedule(groupId: String) async throws -> [ScheduleItem] {
        guard let url = URL(string: "\(baseURL)/api/schedule?groupId=\(groupId)") else { return [] }
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode([ScheduleItem].self, from: data)
    }

    func fetchStudents(groupId: String) async throws -> [StudentMember] {
        guard let url = URL(string: "\(baseURL)/api/groups/students?groupId=\(groupId)") else { return [] }
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode([StudentMember].self, from: data)
    }

    func fetchEvents() async throws -> [StudEvent] {
        guard let url = URL(string: "\(baseURL)/api/events") else { return [] }
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode([StudEvent].self, from: data)
    }

    func calendarExportURL(groupId: String) -> URL? {
        URL(string: "\(baseURL)/api/schedule/export/ics?groupId=\(groupId)")
    }
}
