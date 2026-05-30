package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = CashGreen,
    secondary = CashGreen,
    tertiary = CashGreen,
    background = CashBlack,
    surface = CashDarkGray,
    surfaceVariant = CashLightGray,
    onPrimary = CashBlack,
    onSecondary = CashBlack,
    onTertiary = CashBlack,
    onBackground = CashWhite,
    onSurface = CashWhite,
    onSurfaceVariant = CashWhite
  )

private val LightColorScheme =
  lightColorScheme(
    primary = CashGreen,
    secondary = CashGreen,
    tertiary = CashGreen,
    background = CashWhite,
    surface = CashWhite,
    surfaceVariant = Color(0xFFF2F2F7),
    onPrimary = CashWhite,
    onSecondary = CashWhite,
    onTertiary = CashWhite,
    onBackground = CashBlack,
    onSurface = CashBlack,
    onSurfaceVariant = CashBlack
  )

@Composable
fun MyApplicationTheme(
  // Force dark theme as Cash App defaults to dark mode here
  darkTheme: Boolean = true,
  // Dynamic color disabled to enforce Cash App branding
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
