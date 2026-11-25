package ua.edu.dteu.studin.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

object StudInColors {
    val Lime = Color(0xFFA8F23A)
    val Forest = Color(0xFF0D3B28)
    val ForestDark = Color(0xFF134832)
    val DarkTextOnLime = Color(0xFF0D291E)

    val LightBgPage = Color(0xFFF6F7F4)
    val LightSurface = Color(0xFFFFFFFF)
    val LightSurfaceAlt = Color(0xFFEAEFE9)
    val LightTextPrimary = Color(0xFF0D291E)
    val LightTextSecondary = Color(0xFF5B6E64)
    val LightBorder = Color(0xFFE2E8E2)

    val DarkBgPage = Color(0xFF07140E)
    val DarkSurface = Color(0xFF12281E)
    val DarkSurfaceAlt = Color(0xFF1A372A)
    val DarkTextPrimary = Color(0xFFF5F9F6)
    val DarkTextSecondary = Color(0xFFADC2B6)
    val DarkBorder = Color(0xFF264A39)
}

private val LightScheme = lightColorScheme(
    primary = StudInColors.Forest,
    onPrimary = Color.White,
    secondary = StudInColors.Lime,
    onSecondary = StudInColors.DarkTextOnLime,
    background = StudInColors.LightBgPage,
    onBackground = StudInColors.LightTextPrimary,
    surface = StudInColors.LightSurface,
    onSurface = StudInColors.LightTextPrimary,
    surfaceVariant = StudInColors.LightSurfaceAlt,
    onSurfaceVariant = StudInColors.LightTextSecondary,
    outline = StudInColors.LightBorder
)

private val DarkScheme = darkColorScheme(
    primary = StudInColors.Lime,
    onPrimary = StudInColors.DarkTextOnLime,
    secondary = StudInColors.ForestDark,
    onSecondary = Color.White,
    background = StudInColors.DarkBgPage,
    onBackground = StudInColors.DarkTextPrimary,
    surface = StudInColors.DarkSurface,
    onSurface = StudInColors.DarkTextPrimary,
    surfaceVariant = StudInColors.DarkSurfaceAlt,
    onSurfaceVariant = StudInColors.DarkTextSecondary,
    outline = StudInColors.DarkBorder
)

@Composable
fun StudInTheme(
    themeMode: String = "system",
    content: @Composable () -> Unit
) {
    val isDark = when (themeMode) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }

    MaterialTheme(
        colorScheme = if (isDark) DarkScheme else LightScheme,
        content = content
    )
}
