import SwiftUI

enum StudInTheme {
    static let lime = Color(hex: "A8F23A")
    static let forest = Color(hex: "0D3B28")
    static let forestDark = Color(hex: "134832")
    static let darkTextOnLime = Color(hex: "0D291E")

    static func bgPage(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: "07140E") : Color(hex: "F6F7F4")
    }

    static func bgSurface(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: "12281E") : Color.white
    }

    static func bgSurfaceAlt(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: "1A372A") : Color(hex: "EAEFE9")
    }

    static func textPrimary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: "F5F9F6") : Color(hex: "0D291E")
    }

    static func textSecondary(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: "ADC2B6") : Color(hex: "5B6E64")
    }

    static func border(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(hex: "264A39") : Color(hex: "E2E8E2")
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255.0
        let g = Double((int >> 8) & 0xFF) / 255.0
        let b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
