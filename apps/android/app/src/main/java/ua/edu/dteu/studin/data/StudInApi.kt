package ua.edu.dteu.studin.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

@Serializable
data class Faculty(
    val id: String,
    val name: String,
    val shortName: String? = null
)

@Serializable
data class Course(
    val id: String,
    val name: String
)

@Serializable
data class StudentGroup(
    val id: String,
    val name: String,
    val course: Int = 0
)

@Serializable
data class ScheduleItem(
    val id: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val lessonNumber: Int,
    val subject: String,
    val teacher: String? = null,
    val classroom: String? = null,
    val type: String = "lecture",
    val annotation: String? = null
) {
    val typeLabel: String
        get() = when (type) {
            "lecture" -> "Лекція"
            "practice" -> "Практика"
            "lab" -> "Лабораторна"
            else -> "Заняття"
        }

    val isOnline: Boolean
        get() {
            val room = classroom?.lowercase() ?: return true
            return room.isBlank() || room.contains("онлайн") || room.contains("дист") || room.contains("zoom") || room.contains("teams")
        }

    val datePrefix: String
        get() = if (date.length >= 10) date.substring(0, 10) else date
}

@Serializable
data class StudentMember(
    val id: String,
    val fullName: String
)

@Serializable
data class StudEvent(
    val id: String,
    val uri: String? = null,
    val title: String,
    val subtitle: String = "",
    val category: String = "studlife",
    val categoryBadge: String = "ПОДІЯ",
    val dateLabel: String = "",
    val dayNum: String = "01",
    val monthShort: String = "лис",
    val timeInfo: String = "",
    val locationTitle: String = "",
    val locationSub: String = "",
    val description: String = "",
    val actionUrl: String? = null,
    val sourceUrl: String? = null
)

@Serializable
data class SavedFriendGroup(
    val id: String,
    val groupId: String,
    val groupName: String,
    val label: String = "",
    val subgroup: Int = 0
)

data class BellSlot(
    val number: Int,
    val start: String,
    val end: String,
    val breakAfter: Int
)

val DTEU_BELLS = listOf(
    BellSlot(1, "08:20", "09:40", 25),
    BellSlot(2, "10:05", "11:25", 40),
    BellSlot(3, "12:05", "13:25", 25),
    BellSlot(4, "13:50", "15:10", 15),
    BellSlot(5, "15:25", "16:45", 15),
    BellSlot(6, "17:00", "18:20", 0)
)

data class CampusBuilding(
    val code: String,
    val title: String,
    val subtitle: String,
    val address: String,
    val mapQuery: String
)

val DTEU_BUILDINGS = listOf(
    CampusBuilding("А", "Головний корпус А", "Ректорат, ФТМ, ФЕМП, ФМТП, актова зала", "вул. Кіото, 19", "Державний торговельно-економічний університет, вулиця Кіото, 19, Київ"),
    CampusBuilding("Б", "Корпус Б · Бібліотека та ІТ-хаб", "Наукова бібліотека, читальні зали, коворкінг", "вул. Кіото, 19", "Бібліотека КНТЕУ, вулиця Кіото, 19, Київ"),
    CampusBuilding("В", "Навчальний корпус В", "Лекційні потокові аудиторії, деканати", "вул. Кіото, 19", "вулиця Кіото, 19, Київ"),
    CampusBuilding("Г", "Навчальний корпус Г", "Лабораторії, навчальні кабінети", "вул. Мілютенка, 8", "вулиця Мілютенка, 8, Київ"),
    CampusBuilding("Д", "Навчальний корпус Д (ФІТ / ФФО)", "Факультет інформаційних технологій, комп’ютерні класи", "вул. Кіото, 21", "вулиця Кіото, 21, Київ"),
    CampusBuilding("Л", "Спортивний комплекс та корпус Л", "Спорткомплекс, стадіон, секції", "вул. Кіото, 23", "вулиця Кіото, 23, Київ")
)

object StudInApi {
    const val BASE_URL = "https://api-production-bedef992.up.railway.app"

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private suspend fun getBody(url: String): String = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url).build()
        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) throw Exception("HTTP ${resp.code}")
            resp.body?.string() ?: "[]"
        }
    }

    suspend fun fetchFaculties(): List<Faculty> = runCatching {
        json.decodeFromString<List<Faculty>>(getBody("$BASE_URL/api/faculties"))
    }.getOrDefault(emptyList())

    suspend fun fetchCourses(facultyId: String): List<Course> = runCatching {
        json.decodeFromString<List<Course>>(getBody("$BASE_URL/api/courses?facultyId=$facultyId"))
    }.getOrDefault(listOf(Course("1", "1"), Course("2", "2"), Course("3", "3"), Course("4", "4")))

    suspend fun fetchGroups(facultyId: String, course: String): List<StudentGroup> = runCatching {
        json.decodeFromString<List<StudentGroup>>(getBody("$BASE_URL/api/groups?facultyId=$facultyId&course=$course"))
    }.getOrDefault(emptyList())

    suspend fun fetchAllGroups(facultyId: String): List<StudentGroup> = coroutineScope {
        val courses = fetchCourses(facultyId)
        courses.map { c -> async { fetchGroups(facultyId, c.id) } }
            .awaitAll()
            .flatten()
            .sortedBy { it.name }
    }

    suspend fun fetchSchedule(groupId: String): List<ScheduleItem> = runCatching {
        json.decodeFromString<List<ScheduleItem>>(getBody("$BASE_URL/api/schedule?groupId=$groupId"))
    }.getOrDefault(emptyList())

    suspend fun fetchStudents(groupId: String): List<StudentMember> = runCatching {
        json.decodeFromString<List<StudentMember>>(getBody("$BASE_URL/api/groups/students?groupId=$groupId"))
    }.getOrDefault(emptyList())

    suspend fun fetchEvents(): List<StudEvent> = runCatching {
        json.decodeFromString<List<StudEvent>>(getBody("$BASE_URL/api/events"))
    }.getOrDefault(emptyList())

    fun calendarExportUrl(groupId: String): String =
        "$BASE_URL/api/schedule/export/ics?groupId=$groupId"
}
