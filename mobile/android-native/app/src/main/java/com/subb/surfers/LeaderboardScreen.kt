package com.subb.surfers

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory

private val MedalGold = Color(0xFFFFD24A)
private val MedalSilver = Color(0xFFC7CDD6)
private val MedalBronze = Color(0xFFCD8C5C)

/**
 * Global leaderboard: LazyColumn with gold/silver/bronze medals for the top
 * three, pull-to-refresh, and explicit loading / error / empty states.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(modifier: Modifier = Modifier) {
    val vm: LeaderboardViewModel = viewModel(
        factory = viewModelFactory {
            initializer { LeaderboardViewModel() }
        },
    )
    val state by vm.state.collectAsStateWithLifecycle()

    PullToRefreshBox(
        modifier = modifier.fillMaxSize(),
        isRefreshing = state is LeaderboardUiState.Loading,
        onRefresh = { vm.load() },
    ) {
        when (val current = state) {
            is LeaderboardUiState.Loading -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }

            is LeaderboardUiState.Error -> ErrorPane(
                message = current.message,
                onRetry = { vm.load() },
            )

            is LeaderboardUiState.Success ->
                if (current.entries.isEmpty()) {
                    EmptyPane(onRetry = { vm.load() })
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(vertical = 8.dp),
                    ) {
                        itemsIndexed(current.entries, key = { index, _ -> index }) { _, entry ->
                            LeaderboardRow(entry)
                            HorizontalDivider()
                        }
                    }
                }
        }
    }
}

@Composable
private fun LeaderboardRow(entry: ScoreEntry) {
    ListItem(
        leadingContent = { RankBadge(entry.rank) },
        headlineContent = {
            Text(entry.name, fontWeight = FontWeight.SemiBold, maxLines = 1)
        },
        supportingContent = { Text("${entry.coins} coins · ${entry.distance} m") },
        trailingContent = {
            Text(
                entry.score.toString(),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
        },
    )
}

@Composable
private fun RankBadge(rank: Int) {
    when (rank) {
        1 -> Icon(
            Icons.Filled.EmojiEvents,
            contentDescription = "1st place",
            tint = MedalGold,
            modifier = Modifier.size(32.dp),
        )

        2 -> Icon(
            Icons.Filled.EmojiEvents,
            contentDescription = "2nd place",
            tint = MedalSilver,
            modifier = Modifier.size(32.dp),
        )

        3 -> Icon(
            Icons.Filled.EmojiEvents,
            contentDescription = "3rd place",
            tint = MedalBronze,
            modifier = Modifier.size(32.dp),
        )

        else -> Text(
            "#$rank",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun ErrorPane(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            Icons.Filled.CloudOff,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            "Could not load the leaderboard",
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodySmall,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Icon(Icons.Filled.Refresh, contentDescription = null)
            Text("  Retry")
        }
    }
}

@Composable
private fun EmptyPane(onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            Icons.Filled.EmojiEvents,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            "No scores yet — be the first!",
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("Refresh")
        }
    }
}
