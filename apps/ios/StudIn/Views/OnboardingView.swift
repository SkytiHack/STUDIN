import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.colorScheme) var scheme

    @State private var nameInput: String = ""
    @State private var selectedFacultyId: String = ""
    @State private var groupSearch: String = ""
    @State private var selectedGroup: StudentGroup? = nil
    @State private var isLoadingGroups: Bool = false

    var filteredGroups: [StudentGroup] {
        let q = groupSearch.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return state.availableGroups }
        return state.availableGroups.filter { $0.name.lowercased().contains(q) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                StudTopHeader()

                VStack(alignment: .leading, spacing: 6) {
                    Text("Налаштуємо\nтвій простір")
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundColor(StudInTheme.textPrimary(scheme))
                    Text("Обери групу — ми підберемо розклад ДТЕУ.")
                        .font(.system(size: 14))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                }

                // University (Fixed DTEU)
                VStack(alignment: .leading, spacing: 6) {
                    Text("УНІВЕРСИТЕТ")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                    HStack {
                        Text("ДТЕУ")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(StudInTheme.textPrimary(scheme))
                        Spacer()
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundColor(StudInTheme.forest)
                    }
                    .padding(14)
                    .background(StudInTheme.bgSurface(scheme))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(StudInTheme.border(scheme), lineWidth: 1))
                }

                // Name
                VStack(alignment: .leading, spacing: 6) {
                    Text("ПРІЗВИЩЕ ТА ІМ’Я")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                    TextField("Введи прізвище та ім’я", text: $nameInput)
                        .padding(14)
                        .background(StudInTheme.bgSurface(scheme))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(StudInTheme.border(scheme), lineWidth: 1))
                }

                // Faculty Picker
                VStack(alignment: .leading, spacing: 6) {
                    Text("ФАКУЛЬТЕТ")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(StudInTheme.textSecondary(scheme))
                    Picker("Факультет", selection: $selectedFacultyId) {
                        Text("Обери факультет").tag("")
                        ForEach(state.faculties) { f in
                            Text(f.name).tag(f.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(StudInTheme.bgSurface(scheme))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(StudInTheme.border(scheme), lineWidth: 1))
                    .onChange(of: selectedFacultyId) { _, newValue in
                        selectedGroup = nil
                        guard !newValue.isEmpty else { return }
                        isLoadingGroups = true
                        Task {
                            await state.loadGroupsForFaculty(newValue)
                            isLoadingGroups = false
                        }
                    }
                }

                // Group search & list
                if !selectedFacultyId.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("АКАДЕМІЧНА ГРУПА")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(StudInTheme.textSecondary(scheme))

                        TextField("Пошук групи (напр. 2-6 або 3-10)", text: $groupSearch)
                            .padding(12)
                            .background(StudInTheme.bgSurface(scheme))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).stroke(StudInTheme.border(scheme), lineWidth: 1))

                        if isLoadingGroups {
                            ProgressView("Завантажуємо групи...")
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            LazyVStack(spacing: 8) {
                                ForEach(filteredGroups.prefix(12)) { group in
                                    let isSelected = selectedGroup?.id == group.id
                                    Button {
                                        selectedGroup = group
                                    } label: {
                                        HStack {
                                            Image(systemName: "person.2")
                                                .foregroundColor(StudInTheme.textPrimary(scheme))
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(group.name)
                                                    .font(.system(size: 15, weight: .bold))
                                                    .foregroundColor(StudInTheme.textPrimary(scheme))
                                                Text("\(group.course) курс · Академічна група")
                                                    .font(.system(size: 12))
                                                    .foregroundColor(StudInTheme.textSecondary(scheme))
                                            }
                                            Spacer()
                                            if isSelected {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(StudInTheme.forest)
                                            }
                                        }
                                        .padding(12)
                                        .background(isSelected ? StudInTheme.bgSurfaceAlt(scheme) : StudInTheme.bgSurface(scheme))
                                        .clipShape(RoundedRectangle(cornerRadius: 14))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 14)
                                                .stroke(isSelected ? StudInTheme.forest : StudInTheme.border(scheme), lineWidth: isSelected ? 1.5 : 1)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }

                Button {
                    if let g = selectedGroup {
                        state.saveOnboarding(group: g, facultyId: selectedFacultyId, name: nameInput)
                    }
                } label: {
                    Text("Перейти до розкладу →")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(selectedGroup != nil ? (scheme == .dark ? StudInTheme.darkTextOnLime : .white) : StudInTheme.textSecondary(scheme))
                        .frame(maxWidth: .infinity)
                        .padding(16)
                        .background(selectedGroup != nil ? (scheme == .dark ? StudInTheme.lime : StudInTheme.forest) : StudInTheme.bgSurfaceAlt(scheme))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .disabled(selectedGroup == nil)
                .padding(.top, 8)
            }
            .padding(18)
        }
        .background(StudInTheme.bgPage(scheme))
    }
}
