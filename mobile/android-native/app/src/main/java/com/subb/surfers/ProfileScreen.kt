package com.subb.surfers

import android.content.Context
import android.webkit.JavascriptInterface
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.SocialDistance
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import kotlin.math.max

/**
 * SharedPreferences-backed player profile and aggregate run stats.
 *
 * The embedded WebView game posts finished runs through the `SubbSurfers`
 * JS bridge ([Bridge]) with payloads shaped like
 * `{"type":"run","score":1200,"coins":45,"distance":678}` — malformed
 * messages are ignored.
 */
object RunStatsStore {

    private const val PREFS_NAME = "subb_prefs"
    private const val KEY_NAME = "player_name"
    private const val KEY_BEST = "best_score"
    private const val KEY_RUNS = "total_runs"
    private const val KEY_LAST_COINS = "last_coins"
    private const val KEY_LAST_DISTANCE = "last_distance"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun playerName(context: Context): String =
        prefs(context).getString(KEY_NAME, "").orEmpty()

    fun saveName(context: Context, value: String) {
        prefs(context).edit().putString(KEY_NAME, value.trim()).apply()
    }

    data class Stats(
        val bestScore: Int,
        val totalRuns: Int,
        val lastCoins: Int,
        val lastDistance: Int,
    )

    fun stats(context: Context): Stats {
        val p = prefs(context)
        return Stats(
            bestScore = p.getInt(KEY_BEST, 0),
            totalRuns = p.getInt(KEY_RUNS, 0),
            lastCoins = p.getInt(KEY_LAST_COINS, 0),
            lastDistance = p.getInt(KEY_LAST_DISTANCE, 0),
        )
    }

    /** Records a finished run. Returns true when it set a new personal best. */
    fun recordRun(context: Context, score: Int, coins: Int, distance: Int): Boolean {
        val p = prefs(context)
        val previousBest = p.getInt(KEY_BEST, 0)
        p.edit()
            .putInt(KEY_BEST, max(previousBest, score))
            .putInt(KEY_RUNS, p.getInt(KEY_RUNS, 0) + 1)
            .putInt(KEY_LAST_COINS, coins)
            .putInt(KEY_LAST_DISTANCE, distance)
            .apply()
        return score > previousBest
    }

    /** JS bridge exposed to the web game as `window.SubbSurfers.postRun(json)`. */
    class Bridge(private val appContext: Context) {
        @JavascriptInterface
        fun postRun(json: String) {
            val payload = runCatching { JSONObject(json) }.getOrNull() ?: return
            if (payload.optString("type") == "run") {
                recordRun(
                    appContext,
                    payload.optInt("score", 0),
                    payload.optInt("coins", 0),
                    payload.optInt("distance", 0),
                )
            }
        }
    }
}

/** Local profile: editable player name + persisted stats + best-score upload. */
@Composable
fun ProfileScreen(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var name by remember { mutableStateOf(RunStatsStore.playerName(context)) }
    var stats by remember { mutableStateOf(RunStatsStore.stats(context)) }
    var submitting by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            "Profile",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Player name") },
            placeholder = { Text("DashKing") },
            singleLine = true,
            supportingText = { Text("Saved locally on this device") },
            trailingIcon = {
                TextButton(
                    onClick = {
                        RunStatsStore.saveName(context, name)
                        message = if (name.isBlank()) {
                            "Name cleared — you will submit as anonymous."
                        } else {
                            "Name saved."
                        }
                    },
                ) { Text("Save") }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        Text("Local stats", style = MaterialTheme.typography.titleMedium)

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard(
                modifier = Modifier.weight(1f),
                icon = { Icon(Icons.Filled.EmojiEvents, contentDescription = null) },
                label = "Best score",
                value = stats.bestScore.toString(),
            )
            StatCard(
                modifier = Modifier.weight(1f),
                icon = { Icon(Icons.Filled.DirectionsRun, contentDescription = null) },
                label = "Total runs",
                value = stats.totalRuns.toString(),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard(
                modifier = Modifier.weight(1f),
                icon = { Icon(Icons.Filled.MonetizationOn, contentDescription = null) },
                label = "Last coins",
                value = stats.lastCoins.toString(),
            )
            StatCard(
                modifier = Modifier.weight(1f),
                icon = { Icon(Icons.Filled.SocialDistance, contentDescription = null) },
                label = "Last distance",
                value = "${stats.lastDistance} m",
            )
        }

        Button(
            enabled = !submitting,
            onClick = {
                submitting = true
                scope.launch {
                    // Re-read at click time so a run recorded since composition counts.
                    val currentStats = RunStatsStore.stats(context)
                    val result = runCatching {
                        withContext(Dispatchers.IO) {
                            ApiClient.api.submitScore(
                                ScoreSubmissionRequest(
                                    name = name.ifBlank { "Anonymous Surfer" },
                                    score = currentStats.bestScore,
                                    coins = currentStats.lastCoins,
                                    distance = currentStats.lastDistance,
                                ),
                            )
                        }
                    }
                    submitting = false
                    message = result.fold(
                        onSuccess = { response ->
                            "Best score submitted — global rank #${response.rank}, " +
                                "personal best rank #${response.best}."
                        },
                        onFailure = { throwable ->
                            "Submission failed: ${throwable.message ?: "unknown error"}"
                        },
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (submitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                )
                Spacer(Modifier.size(8.dp))
            }
            Text("Submit best score to leaderboard")
        }

        message?.let { text ->
            Text(
                text,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun StatCard(
    icon: @Composable () -> Unit,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            icon()
            Text(
                value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
