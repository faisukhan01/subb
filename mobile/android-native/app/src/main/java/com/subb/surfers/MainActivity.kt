package com.subb.surfers

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SubbSurfersTheme {
                HomeShell()
            }
        }
    }
}

private val Amber = Color(0xFFFFB300)
private val AmberLight = Color(0xFFFFD54F)

/** Dark amber-seeded Material 3 theme matching the Flutter client. */
@Composable
fun SubbSurfersTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Amber,
            secondary = AmberLight,
        ),
        content = content,
    )
}

private enum class Tab(val label: String) {
    GAME("Play"),
    LEADERBOARD("Leaderboard"),
    PROFILE("Profile"),
}

@Composable
private fun HomeShell() {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    val tabs = Tab.entries

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, tab ->
                    NavigationBarItem(
                        selected = selected == index,
                        onClick = { selected = index },
                        icon = {
                            when (tab) {
                                Tab.GAME -> Icon(Icons.Filled.SportsEsports, contentDescription = null)
                                Tab.LEADERBOARD -> Icon(Icons.Filled.EmojiEvents, contentDescription = null)
                                Tab.PROFILE -> Icon(Icons.Filled.Person, contentDescription = null)
                            }
                        },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        when (tabs[selected]) {
            Tab.GAME -> GameScreen(Modifier.padding(innerPadding))
            Tab.LEADERBOARD -> LeaderboardScreen(Modifier.padding(innerPadding))
            Tab.PROFILE -> ProfileScreen(Modifier.padding(innerPadding))
        }
    }
}
