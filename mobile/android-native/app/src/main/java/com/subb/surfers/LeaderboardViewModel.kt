package com.subb.surfers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

/** UI state for [LeaderboardScreen], exposed as an immutable [StateFlow]. */
sealed interface LeaderboardUiState {
    data object Loading : LeaderboardUiState
    data class Success(val entries: List<ScoreEntry>, val total: Int) : LeaderboardUiState
    data class Error(val message: String) : LeaderboardUiState
}

/**
 * Owns leaderboard loading. Refreshes are idempotent; every call flips the
 * state back to [LeaderboardUiState.Loading] so the UI can show progress.
 */
class LeaderboardViewModel(
    private val api: LeaderboardApi = ApiClient.api,
) : ViewModel() {

    private val _state = MutableStateFlow<LeaderboardUiState>(LeaderboardUiState.Loading)
    val state: StateFlow<LeaderboardUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load(limit: Int = 20) {
        _state.value = LeaderboardUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val response = api.fetchLeaderboard(limit)
                if (response.entries.isEmpty()) {
                    LeaderboardUiState.Success(entries = emptyList(), total = response.total)
                } else {
                    LeaderboardUiState.Success(entries = response.entries, total = response.total)
                }
            } catch (e: IOException) {
                LeaderboardUiState.Error(e.message ?: "Network error — check your connection.")
            } catch (e: Exception) {
                LeaderboardUiState.Error(e.message ?: "Unexpected error while loading the leaderboard.")
            }
        }
    }
}
