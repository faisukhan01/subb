package com.subb.surfers

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Wire models for the leaderboard API.
 *
 * Contract:
 *  - GET  /api/leaderboard -> LeaderboardResponse
 *  - POST /api/leaderboard -> ScoreSubmissionResult
 *
 * Every field is annotated with [SerialName] so the JSON contract stays
 * explicit even if Kotlin property names ever drift from the wire format.
 */
@Serializable
data class ScoreEntry(
    @SerialName("rank") val rank: Int = 0,
    @SerialName("name") val name: String = "",
    @SerialName("score") val score: Int = 0,
    @SerialName("coins") val coins: Int = 0,
    @SerialName("distance") val distance: Int = 0,
)

@Serializable
data class LeaderboardResponse(
    @SerialName("entries") val entries: List<ScoreEntry> = emptyList(),
    @SerialName("total") val total: Int = 0,
)

@Serializable
data class ScoreSubmissionRequest(
    @SerialName("name") val name: String,
    @SerialName("score") val score: Int,
    @SerialName("coins") val coins: Int,
    @SerialName("distance") val distance: Int,
)

@Serializable
data class ScoreSubmissionResult(
    @SerialName("rank") val rank: Int = 0,
    @SerialName("best") val best: Int = 0,
)
