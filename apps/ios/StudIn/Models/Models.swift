import Foundation

struct Faculty: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let shortName: String?

    var displayShort: String {
        if let short = shortName, !short.isEmpty { return short }
        let lower = name.lowercased()
        if lower.contains("торгівлі та маркетингу") { return "ФТМ" }
        if lower.contains("інформаційних") { return "ФІТ" }
        if lower.contains("технологій та бізнесу") { return "ФТБ" }
        if lower.contains("економіки") { return "ФЕМП" }
        if lower.contains("міжнародної") { return "ФМТП" }
        if lower.contains("фінансів") { return "ФФО" }
        return "ДТЕУ"
    }
}

struct Course: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}

struct StudentGroup: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let course: Int
}

struct ScheduleItem: Codable, Identifiable, Hashable {
    let id: String
    let date: String
    let startTime: String
    let endTime: String
    let lessonNumber: Int
    let subject: String
    let teacher: String?
    let classroom: String?
    let type: String
    let annotation: String?

    var typeLabel: String {
        switch type {
        case "lecture": return "Лекція"
        case "practice": return "Практика"
        case "lab": return "Лабораторна"
        default: return "Заняття"
        }
    }

    var isOnline: Bool {
        guard let room = classroom?.lowercased(), !room.isEmpty else { return true }
        return room.contains("онлайн") || room.contains("дист") || room.contains("zoom") || room.contains("teams")
    }

    var parsedDate: Date? {
        let isoFull = ISO8601DateFormatter()
        isoFull.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = isoFull.date(from: date) { return d }

        let isoBasic = ISO8601DateFormatter()
        if let d = isoBasic.date(from: date) { return d }

        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.timeZone = TimeZone(identifier: "Europe/Kyiv")
        return df.date(from: String(date.prefix(10)))
    }
}

struct StudentMember: Codable, Identifiable, Hashable {
    let id: String
    let fullName: String
}

struct StudEvent: Codable, Identifiable, Hashable {
    let id: String
    let uri: String?
    let title: String
    let subtitle: String
    let category: String
    let categoryBadge: String
    let dateLabel: String
    let dayNum: String
    let monthShort: String
    let timeInfo: String
    let locationTitle: String
    let locationSub: String
    let description: String
    let actionUrl: String?
    let sourceUrl: String?
}

struct SavedFriendGroup: Codable, Identifiable, Hashable {
    let id: String
    let groupId: String
    let groupName: String
    let label: String
    let subgroup: Int
}

struct BellSlot: Identifiable {
    let id: Int
    let number: Int
    let start: String
    let end: String
    let breakAfter: Int

    static let dteuSchedule: [BellSlot] = [
        BellSlot(id: 1, number: 1, start: "08:20", end: "09:40", breakAfter: 25),
        BellSlot(id: 2, number: 2, start: "10:05", end: "11:25", breakAfter: 40),
        BellSlot(id: 3, number: 3, start: "12:05", end: "13:25", breakAfter: 25),
        BellSlot(id: 4, number: 4, start: "13:50", end: "15:10", breakAfter: 15),
        BellSlot(id: 5, number: 5, start: "15:25", end: "16:45", breakAfter: 15),
        BellSlot(id: 6, number: 6, start: "17:00", end: "18:20", breakAfter: 0)
    ]
}

struct CampusBuilding: Identifiable {
    let id: String
    let code: String
    let title: String
    let subtitle: String
    let address: String
    let details: String
    let mapQuery: String

    static let dteuBuildings: [CampusBuilding] = [
        CampusBuilding(id: "a", code: "А", title: "Головний корпус А", subtitle: "Ректорат, ФТМ, ФЕМП, ФМТП, актова зала", address: "вул. Кіото, 19", details: "Головний вхід з боку парку «Кіото»", mapQuery: "Державний торговельно-економічний університет, вулиця Кіото, 19, Київ"),
        CampusBuilding(id: "b", code: "Б", title: "Корпус Б · Бібліотека та ІТ-хаб", subtitle: "Наукова бібліотека, читальні зали, коворкінг", address: "вул. Кіото, 19", details: "Перехід із корпусу А або окремий вхід", mapQuery: "Бібліотека КНТЕУ, вулиця Кіото, 19, Київ"),
        CampusBuilding(id: "v", code: "В", title: "Навчальний корпус В", subtitle: "Лекційні потокові аудиторії, деканати", address: "вул. Кіото, 19", details: "Поруч із головним корпусом А", mapQuery: "вулиця Кіото, 19, Київ"),
        CampusBuilding(id: "g", code: "Г", title: "Навчальний корпус Г", subtitle: "Лабораторії, навчальні кабінети", address: "вул. Мілютенка, 8", details: "10 хвилин пішки від головного кампусу", mapQuery: "вулиця Мілютенка, 8, Київ"),
        CampusBuilding(id: "d", code: "Д", title: "Навчальний корпус Д (ФІТ / ФФО)", subtitle: "Факультет інформаційних технологій, комп’ютерні класи", address: "вул. Кіото, 21", details: "Через дорогу від парку «Кіото»", mapQuery: "вулиця Кіото, 21, Київ"),
        CampusBuilding(id: "l", code: "Л", title: "Спортивний комплекс та корпус Л", subtitle: "Спорткомплекс, стадіон, секції", address: "вул. Кіото, 23", details: "Спортивне містечко ДТЕУ", mapQuery: "вулиця Кіото, 23, Київ")
    ]
}
