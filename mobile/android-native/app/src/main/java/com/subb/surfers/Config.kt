package com.subb.surfers

/**
 * Compile-time configuration. Unlike BuildConfig flags these constants do not
 * change between debug/release variants — override them by editing this file
 * or adding a variant source set (e.g. `src/prod/java/...`) for staged builds.
 */
object Config {
    /** Base URL of the leaderboard HTTP API (no trailing slash). */
    const val API_BASE_URL: String = "https://subb-surfers.example.com"

    /** Fully-qualified URL of the hosted web game. */
    const val GAME_URL: String = "https://subb-surfers.example.com/play"
}
