package ua.edu.dteu.studin

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import ua.edu.dteu.studin.data.*
import ua.edu.dteu.studin.ui.theme.StudInColors
import ua.edu.dteu.studin.ui.theme.StudInTheme
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

enum class NavTab(val label: String, val icon: ImageVector) {
    HOME("Головна", Icons.Outlined.Home),
    SCHEDULE("Розклад", Icons.Outlined.CalendarToday),
    SERVICES("Сервіси", Icons.Outlined.GridView),
    EVENTS("Події", Icons.Outlined.AutoAwesome),
    PROFILE("Профіль", Icons.Outlined.Person)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            StudInRootApp()
        }
    }
}

@Composable
fun StudInRootApp() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("studin_prefs", Context.MODE_PRIVATE) }
    val scope = rememberCoroutineScope()

    var themeMode by remember { mutableStateOf(prefs.getString("theme", "system") ?: "system") }
    var userName by remember { mutableStateOf(prefs.getString("user_name", "") ?: "") }
    var groupId by remember { mutableStateOf(prefs.getString("group_id", "") ?: "") }
    var groupName by remember { mutableStateOf(prefs.getString("group_name", "") ?: "") }
    var isOnboarded by remember { mutableStateOf(groupId.isNotBlank() && groupName.isNotBlank()) }

    var activeTab by remember { mutableStateOf(NavTab.HOME) }
    var subScreen by remember { mutableStateOf<String?>(null) } // "campus", "bells", "students"

    var faculties by remember { mutableStateOf<List<Faculty>>(emptyList()) }
    var schedule by remember { mutableStateOf<List<ScheduleItem>>(emptyList()) }
    var students by remember { mutableStateOf<List<StudentMember>>(emptyList()) }
    var events by remember { mutableStateOf<List<StudEvent>>(emptyList()) }
    var isLoadingSchedule by remember { mutableStateOf(false) }

    var savedFriends by remember {
        val raw = prefs.getString("friends_json", null)
        val initial = runCatching {
            if (raw != null) Json.decodeFromString<List<SavedFriendGroup>>(raw) else emptyList()
        }.getOrDefault(emptyList())
        mutableStateOf(initial)
    }
    var friendSchedules by remember { mutableStateOf<Map<String, List<ScheduleItem>>>(emptyMap()) }

    fun openExternal(url: String) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    LaunchedEffect(Unit) {
        faculties = StudInApi.fetchFaculties()
        events = StudInApi.fetchEvents()
    }

    LaunchedEffect(groupId) {
        if (groupId.isNotBlank()) {
            isLoadingSchedule = true
            schedule = StudInApi.fetchSchedule(groupId)
            isLoadingSchedule = false
            students = StudInApi.fetchStudents(groupId)
        }
    }

    StudInTheme(themeMode = themeMode) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            if (!isOnboarded) {
                OnboardingScreen(
                    faculties = faculties,
                    initialName = userName,
                    onComplete = { g, name ->
                        groupId = g.id
                        groupName = g.name
                        userName = name.trim()
                        isOnboarded = true
                        prefs.edit()
                            .putString("group_id", g.id)
                            .putString("group_name", g.name)
                            .putString("user_name", userName)
                            .apply()
                    }
                )
            } else {
                Box(modifier = Modifier.fillMaxSize()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .statusBarsPadding()
                            .padding(bottom = 82.dp)
                    ) {
                        when (subScreen) {
                            "campus" -> CampusSubScreen(
                                onBack = { subScreen = null },
                                onOpenMap = { q -> openExternal("https://maps.google.com/?q=${Uri.encode(q)}") }
                            )
                            "bells" -> BellsSubScreen(onBack = { subScreen = null })
                            "students" -> StudentsSubScreen(
                                groupName = groupName,
                                students = students,
                                onBack = { subScreen = null }
                            )
                            else -> when (activeTab) {
                                NavTab.HOME -> HomeTabScreen(
                                    userName = userName,
                                    groupName = groupName,
                                    schedule = schedule,
                                    events = events,
                                    onOpenTab = { activeTab = it },
                                    onOpenSub = { subScreen = it }
                                )
                                NavTab.SCHEDULE -> ScheduleTabScreen(
                                    groupId = groupId,
                                    groupName = groupName,
                                    schedule = schedule,
                                    isLoading = isLoadingSchedule,
                                    faculties = faculties,
                                    savedFriends = savedFriends,
                                    friendSchedules = friendSchedules,
                                    onAddFriend = { fr ->
                                        val updated = savedFriends + fr
                                        savedFriends = updated
                                        prefs.edit().putString("friends_json", Json.encodeToString(updated)).apply()
                                        scope.launch {
                                            val data = StudInApi.fetchSchedule(fr.groupId)
                                            friendSchedules = friendSchedules + (fr.groupId to data)
                                        }
                                    },
                                    onRemoveFriend = { id ->
                                        val updated = savedFriends.filterNot { it.id == id }
                                        savedFriends = updated
                                        prefs.edit().putString("friends_json", Json.encodeToString(updated)).apply()
                                    },
                                    onLoadFriend = { gid ->
                                        if (!friendSchedules.containsKey(gid)) {
                                            scope.launch {
                                                val data = StudInApi.fetchSchedule(gid)
                                                friendSchedules = friendSchedules + (gid to data)
                                            }
                                        }
                                    },
                                    onExportCalendar = { gid ->
                                        openExternal(StudInApi.calendarExportUrl(gid))
                                    }
                                )
                                NavTab.SERVICES -> ServicesTabScreen(
                                    onOpenSub = { subScreen = it },
                                    onOpenUrl = ::openExternal
                                )
                                NavTab.EVENTS -> EventsTabScreen(
                                    events = events,
                                    onOpenUrl = ::openExternal
                                )
                                NavTab.PROFILE -> ProfileTabScreen(
                                    userName = userName,
                                    groupName = groupName,
                                    studentsCount = students.size,
                                    themeMode = themeMode,
                                    onCycleTheme = {
                                        themeMode = when (themeMode) {
                                            "system" -> "light"
                                            "light" -> "dark"
                                            else -> "system"
                                        }
                                        prefs.edit().putString("theme", themeMode).apply()
                                    },
                                    onOpenStudents = { subScreen = "students" },
                                    onExportCalendar = { openExternal(StudInApi.calendarExportUrl(groupId)) },
                                    onChangeGroup = { isOnboarded = false }
                                )
                            }
                        }
                    }

                    // Minimal Floating Bottom Navigation Dock
                    FloatingBottomBar(
                        activeTab = activeTab,
                        onSelect = {
                            subScreen = null
                            activeTab = it
                        },
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .navigationBarsPadding()
                            .padding(horizontal = 14.dp, vertical = 10.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun StudTopBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "STUD IN",
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "ТВІЙ СТУДЕНТСЬКИЙ ПРОСТІР",
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.8.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun FloatingBottomBar(
    activeTab: NavTab,
    onSelect: (NavTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        shadowElevation = 6.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 6.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            NavTab.entries.forEach { tab ->
                val isActive = activeTab == tab
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { onSelect(tab) }
                        .padding(vertical = 2.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .width(46.dp)
                            .height(30.dp)
                            .clip(CircleShape)
                            .background(if (isActive) StudInColors.Lime else Color.Transparent),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = tab.label,
                            tint = if (isActive) StudInColors.DarkTextOnLime else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = tab.label,
                        fontSize = 10.sp,
                        fontWeight = if (isActive) FontWeight.ExtraBold else FontWeight.Medium,
                        color = if (isActive) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
fun OnboardingScreen(
    faculties: List<Faculty>,
    initialName: String,
    onComplete: (StudentGroup, String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(initialName) }
    var selectedFaculty by remember { mutableStateOf<Faculty?>(null) }
    var groups by remember { mutableStateOf<List<StudentGroup>>(emptyList()) }
    var groupSearch by remember { mutableStateOf("") }
    var selectedGroup by remember { mutableStateOf<StudentGroup?>(null) }
    var loadingGroups by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        StudTopBar()

        Text(
            text = "Налаштуємо\nтвій простір",
            fontSize = 28.sp,
            fontWeight = FontWeight.ExtraBold,
            lineHeight = 32.sp,
            color = MaterialTheme.colorScheme.onBackground
        )
        Text(
            text = "Обери факультет та групу ДТЕУ — ми підберемо розклад.",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Прізвище та ім’я") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            singleLine = true
        )

        Text("ФАКУЛЬТЕТ ДТЕУ", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            faculties.forEach { fac ->
                val isSelected = selectedFaculty?.id == fac.id
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = if (isSelected) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface,
                    border = BorderStroke(if (isSelected) 1.5.dp else 1.dp, if (isSelected) StudInColors.Forest else MaterialTheme.colorScheme.outline),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            selectedFaculty = fac
                            selectedGroup = null
                            loadingGroups = true
                            scope.launch {
                                groups = StudInApi.fetchAllGroups(fac.id)
                                loadingGroups = false
                            }
                        }
                ) {
                    Text(
                        text = fac.name,
                        modifier = Modifier.padding(14.dp),
                        fontSize = 14.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }
        }

        if (selectedFaculty != null) {
            Text("АКАДЕМІЧНА ГРУПА", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(
                value = groupSearch,
                onValueChange = { groupSearch = it },
                label = { Text("Пошук групи (напр. 2-6, 3-10)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                singleLine = true
            )

            if (loadingGroups) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
            } else {
                val filtered = groups.filter {
                    groupSearch.isBlank() || it.name.contains(groupSearch.trim(), ignoreCase = true)
                }.take(10)

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    filtered.forEach { g ->
                        val isSel = selectedGroup?.id == g.id
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = if (isSel) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface,
                            border = BorderStroke(if (isSel) 1.5.dp else 1.dp, if (isSel) StudInColors.Forest else MaterialTheme.colorScheme.outline),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedGroup = g }
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(g.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                if (isSel) {
                                    Text("✓", fontWeight = FontWeight.ExtraBold, color = StudInColors.Forest)
                                }
                            }
                        }
                    }
                }
            }
        }

        Button(
            onClick = { selectedGroup?.let { onComplete(it, name) } },
            enabled = selectedGroup != null,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = StudInColors.Forest,
                contentColor = Color.White
            )
        ) {
            Text("Перейти до розкладу →", fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

@Composable
fun HomeTabScreen(
    userName: String,
    groupName: String,
    schedule: List<ScheduleItem>,
    events: List<StudEvent>,
    onOpenTab: (NavTab) -> Unit,
    onOpenSub: (String) -> Unit
) {
    val todayStr = remember { LocalDate.now().toString() }
    val nowTime = remember { LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")) }
    val todayLessons = remember(schedule) {
        schedule.filter { it.datePrefix == todayStr }.sortedBy { it.startTime }
    }
    val nextLesson = remember(schedule, todayLessons) {
        todayLessons.firstOrNull { it.endTime >= nowTime }
            ?: schedule.filter { it.datePrefix > todayStr }.minByOrNull { it.datePrefix + it.startTime }
    }

    val displayName = remember(userName) {
        val t = userName.trim()
        if (t.isEmpty()) "студенте" else t.split(" ").let { if (it.size > 1) it[1] else it[0] }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        StudTopBar()

        Column {
            Text("Привіт, $displayName", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("ДТЕУ · $groupName", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Text(
                        text = if (todayLessons.isEmpty()) "Сьогодні без пар" else "Сьогодні ${todayLessons.size} пар(и)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                    )
                }
            }
        }

        // Featured Dark Green Card
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = StudInColors.Forest,
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onOpenTab(NavTab.SCHEDULE) }
        ) {
            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("НАСТУПНА ПАРА", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = StudInColors.Lime)
                if (nextLesson != null) {
                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(nextLesson.startTime, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                        Text("— ${nextLesson.endTime}", fontSize = 15.sp, color = Color.White.copy(alpha = 0.78f))
                    }
                    Text(nextLesson.subject, fontSize = 19.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text(
                        "${nextLesson.typeLabel}${if (!nextLesson.teacher.isNullOrBlank()) " · ${nextLesson.teacher}" else ""}",
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                    Surface(
                        shape = CircleShape,
                        color = Color.White.copy(alpha = 0.14f)
                    ) {
                        Text(
                            text = if (nextLesson.isOnline) "Онлайн" else "Ауд. ${nextLesson.classroom}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                } else {
                    Text("Пар найближчим часом не знайдено", fontSize = 15.sp, color = Color.White)
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.14f), modifier = Modifier.padding(vertical = 4.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Відкрити розклад", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = StudInColors.Lime)
                    Text("→", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = StudInColors.Lime)
                }
            }
        }

        Text("Швидкий доступ", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            QuickCard(Modifier.weight(1f), "Розклад", Icons.Outlined.CalendarToday) { onOpenTab(NavTab.SCHEDULE) }
            QuickCard(Modifier.weight(1f), "Кампус", Icons.Outlined.LocationOn) { onOpenSub("campus") }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            QuickCard(Modifier.weight(1f), "Дзвінки", Icons.Outlined.Notifications) { onOpenSub("bells") }
            QuickCard(Modifier.weight(1f), "Події", Icons.Outlined.AutoAwesome) { onOpenTab(NavTab.EVENTS) }
        }

        if (events.isNotEmpty()) {
            val ev = events.first()
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Студентське життя", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    "Усі події →",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onOpenTab(NavTab.EVENTS) }
                )
            }
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenTab(NavTab.EVENTS) }
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(StudInColors.Lime),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(ev.dayNum, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = StudInColors.DarkTextOnLime)
                            Text(ev.monthShort, fontWeight = FontWeight.SemiBold, fontSize = 10.sp, color = StudInColors.DarkTextOnLime)
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(ev.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Text("Офіційний анонс · sute.edu.ua", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun QuickCard(modifier: Modifier, title: String, icon: ImageVector, onClick: () -> Unit) {
    Surface(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = title, modifier = Modifier.size(20.dp))
            }
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

@Composable
fun ScheduleTabScreen(
    groupId: String,
    groupName: String,
    schedule: List<ScheduleItem>,
    isLoading: Boolean,
    faculties: List<Faculty>,
    savedFriends: List<SavedFriendGroup>,
    friendSchedules: Map<String, List<ScheduleItem>>,
    onAddFriend: (SavedFriendGroup) -> Unit,
    onRemoveFriend: (String) -> Unit,
    onLoadFriend: (String) -> Unit,
    onExportCalendar: (String) -> Unit
) {
    var period by remember { mutableStateOf(0) } // 0=Today, 1=Tomorrow
    var activeTarget by remember { mutableStateOf("my") }
    var isCompareMode by remember { mutableStateOf(false) }
    var showAddDialog by remember { mutableStateOf(false) }

    val targetDate = remember(period) {
        if (period == 0) LocalDate.now().toString() else LocalDate.now().plusDays(1).toString()
    }
    val activeFriend = savedFriends.find { it.id == activeTarget }
    val activeList = if (activeFriend != null) {
        (friendSchedules[activeFriend.groupId] ?: emptyList()).filter { it.datePrefix == targetDate }.sortedBy { it.startTime }
    } else {
        schedule.filter { it.datePrefix == targetDate }.sortedBy { it.startTime }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StudTopBar()
        Text("Мій розклад", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
        Text("ДТЕУ · ${activeFriend?.groupName ?: groupName}", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

        // Multi-schedule chips bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = !isCompareMode && activeTarget == "my",
                onClick = { isCompareMode = false; activeTarget = "my" },
                label = { Text("$groupName (Моя)") }
            )
            savedFriends.forEach { fr ->
                FilterChip(
                    selected = !isCompareMode && activeTarget == fr.id,
                    onClick = {
                        isCompareMode = false
                        activeTarget = fr.id
                        onLoadFriend(fr.groupId)
                    },
                    label = { Text("${fr.groupName}${if (fr.label.isNotBlank()) " · ${fr.label}" else ""} ✕") },
                    trailingIcon = null
                )
            }
            if (savedFriends.isNotEmpty()) {
                FilterChip(
                    selected = isCompareMode,
                    onClick = {
                        isCompareMode = !isCompareMode
                        savedFriends.firstOrNull()?.let { onLoadFriend(it.groupId) }
                    },
                    label = { Text("⇄ Спільні вікна") }
                )
            }
            AssistChip(
                onClick = { showAddDialog = true },
                label = { Text("+ Група друга") }
            )
            AssistChip(
                onClick = { onExportCalendar(activeFriend?.groupId ?: groupId) },
                label = { Text("У календар (.ics)") }
            )
        }

        // Period switcher
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(4.dp)
        ) {
            listOf("Сьогодні", "Завтра").forEachIndexed { idx, label ->
                val isSel = period == idx
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(11.dp))
                        .background(if (isSel) StudInColors.Forest else Color.Transparent)
                        .clickable { period = idx }
                        .padding(vertical = 9.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        label,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isSel) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        if (isLoading) {
            Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (isCompareMode && savedFriends.isNotEmpty()) {
            val friend = savedFriends.first()
            val myToday = schedule.filter { it.datePrefix == targetDate }
            val frToday = (friendSchedules[friend.groupId] ?: emptyList()).filter { it.datePrefix == targetDate }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(DTEU_BELLS.take(4)) { bell ->
                    val myL = myToday.find { it.lessonNumber == bell.number }
                    val frL = frToday.find { it.lessonNumber == bell.number }
                    if (myL != null || frL != null) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("${bell.number} пара · ${bell.start}–${bell.end}", fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    CompareCell(Modifier.weight(1f), "ВИ", myL)
                                    CompareCell(Modifier.weight(1f), friend.label.ifBlank { friend.groupName }, frL)
                                }
                            }
                        }
                    }
                }
            }
        } else if (activeList.isEmpty()) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Пар немає", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Час для себе й нових планів.", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(activeList) { item ->
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(modifier = Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            Column(modifier = Modifier.width(56.dp)) {
                                Text(item.startTime, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                                Text(item.endTime, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text("${item.lessonNumber} ПАРА · ${item.typeLabel.uppercase()}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(item.subject, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                                if (!item.teacher.isNullOrBlank()) {
                                    Text(item.teacher, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(
                                    if (item.isOnline) "Онлайн" else "Ауд. ${item.classroom}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onBackground
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AddFriendDialog(
            faculties = faculties,
            onDismiss = { showAddDialog = false },
            onAdd = { fr ->
                onAddFriend(fr)
                showAddDialog = false
            }
        )
    }
}

@Composable
fun CompareCell(modifier: Modifier, title: String, lesson: ScheduleItem?) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Text(title.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (lesson != null) {
            Text(lesson.subject, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 2)
            Text(if (lesson.isOnline) "Онлайн" else "Ауд. ${lesson.classroom}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            Text("Вільно (Вікно)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun AddFriendDialog(
    faculties: List<Faculty>,
    onDismiss: () -> Unit,
    onAdd: (SavedFriendGroup) -> Unit
) {
    val scope = rememberCoroutineScope()
    var label by remember { mutableStateOf("") }
    var groups by remember { mutableStateOf<List<StudentGroup>>(emptyList()) }
    var selectedGroup by remember { mutableStateOf<StudentGroup?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Додати групу друга", fontWeight = FontWeight.ExtraBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text("Ім’я друга (напр. Макс)") },
                    singleLine = true
                )
                Text("Обери факультет:", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Column(modifier = Modifier.heightIn(max = 160.dp).verticalScroll(rememberScrollState())) {
                    faculties.forEach { f ->
                        Text(
                            f.name,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    scope.launch {
                                        groups = StudInApi.fetchAllGroups(f.id)
                                        selectedGroup = groups.firstOrNull()
                                    }
                                }
                                .padding(vertical = 6.dp),
                            fontSize = 13.sp
                        )
                    }
                }
                if (groups.isNotEmpty()) {
                    Text("Обрана група: ${selectedGroup?.name ?: "—"}", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        groups.take(15).forEach { g ->
                            FilterChip(
                                selected = selectedGroup?.id == g.id,
                                onClick = { selectedGroup = g },
                                label = { Text(g.name) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = selectedGroup != null,
                onClick = {
                    selectedGroup?.let { g ->
                        onAdd(SavedFriendGroup("fr-${g.id}-${System.currentTimeMillis()}", g.id, g.name, label.trim(), 0))
                    }
                }
            ) { Text("Додати") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Скасувати") }
        }
    )
}

@Composable
fun ServicesTabScreen(onOpenSub: (String) -> Unit, onOpenUrl: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StudTopBar()
        Text("Сервіси", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
        Text("Університет ДТЕУ під рукою", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

        ServiceItemCard("Кампус", "Корпуси А, Б, В, Г, Д, Л та адреси", Icons.Outlined.LocationOn) { onOpenSub("campus") }
        ServiceItemCard("Розклад дзвінків", "Час пар та перерв ДТЕУ", Icons.Outlined.Notifications) { onOpenSub("bells") }
        ServiceItemCard("Електронний кабінет МІА", "Журнал оцінок та успішність", Icons.Outlined.School) { onOpenUrl("https://mia1.knute.edu.ua") }
        ServiceItemCard("Moodle ДТЕУ", "Дистанційне навчання", Icons.Outlined.MenuBook) { onOpenUrl("https://dl.knute.edu.ua") }
        ServiceItemCard("Спільнота ДТЕУ", "Офіційний канал та студентське самоврядування", Icons.Outlined.Groups) { onOpenUrl("https://t.me/knute_official") }
    }
}

@Composable
fun ServiceItemCard(title: String, subtitle: String, icon: ImageVector, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = title)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("›", fontSize = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun EventsTabScreen(events: List<StudEvent>, onOpenUrl: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StudTopBar()
        Text("Події", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
        Text("Офіційні анонси sute.edu.ua", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(events) { ev ->
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { (ev.actionUrl ?: ev.sourceUrl)?.let(onOpenUrl) }
                ) {
                    Row(modifier = Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(ev.dayNum, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                                Text(ev.monthShort, fontSize = 10.sp)
                            }
                        }
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(ev.categoryBadge, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = StudInColors.Forest)
                            Text(ev.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("${ev.dateLabel} · ${ev.timeInfo}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileTabScreen(
    userName: String,
    groupName: String,
    studentsCount: Int,
    themeMode: String,
    onCycleTheme: () -> Unit,
    onOpenStudents: () -> Unit,
    onExportCalendar: () -> Unit,
    onChangeGroup: () -> Unit
) {
    val themeLabel = when (themeMode) {
        "light" -> "Світла · UA"
        "dark" -> "Темна · UA"
        else -> "Системна · UA"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        StudTopBar()
        Text("Мій профіль", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)

        Surface(shape = RoundedCornerShape(20.dp), color = StudInColors.Forest, modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(StudInColors.Lime),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Outlined.Person, contentDescription = null, tint = StudInColors.DarkTextOnLime)
                }
                Column {
                    Text(userName.ifBlank { "Студент STUD IN" }, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Color.White)
                    Text("ДТЕУ · $groupName", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                }
            }
        }

        Surface(
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Column {
                ProfileOptionRow("Академічна група", groupName, onChangeGroup)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                ProfileOptionRow("Одногрупники", "$studentsCount осіб", onOpenStudents)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                ProfileOptionRow("Експорт у Календар", "Google (.ics)", onExportCalendar)
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                ProfileOptionRow("Тема і мова", themeLabel, onCycleTheme)
            }
        }
    }
}

@Composable
fun ProfileOptionRow(title: String, value: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        Text("$value ›", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun CampusSubScreen(onBack: () -> Unit, onOpenMap: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("‹ До сервісів", fontWeight = FontWeight.Bold, modifier = Modifier.clickable { onBack() })
        Text("Кампус ДТЕУ", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(DTEU_BUILDINGS) { b ->
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.fillMaxWidth().clickable { onOpenMap(b.mapQuery) }
                ) {
                    Row(modifier = Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(44.dp).clip(RoundedCornerShape(13.dp)).background(StudInColors.Lime),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(b.code, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = StudInColors.DarkTextOnLime)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(b.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Text(b.subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("📍 ${b.address}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BellsSubScreen(onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("‹ До сервісів", fontWeight = FontWeight.Bold, modifier = Modifier.clickable { onBack() })
        Text("Розклад дзвінків", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(DTEU_BELLS) { b ->
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(
                            modifier = Modifier.size(38.dp).clip(RoundedCornerShape(11.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("${b.number}", fontWeight = FontWeight.ExtraBold)
                        }
                        Column {
                            Text("${b.number} пара", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${b.start} — ${b.end}", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                        }
                    }
                }
                if (b.breakAfter > 0) {
                    Text(
                        "Перерва · ${b.breakAfter} хв",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 12.dp, top = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun StudentsSubScreen(groupName: String, students: List<StudentMember>, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("‹ До профілю", fontWeight = FontWeight.Bold, modifier = Modifier.clickable { onBack() })
        Text("Одногрупники · $groupName", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            itemsIndexed(students) { idx, st ->
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(
                            modifier = Modifier.size(34.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("${idx + 1}", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                        Text(st.fullName, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    }
                }
            }
        }
    }
}
