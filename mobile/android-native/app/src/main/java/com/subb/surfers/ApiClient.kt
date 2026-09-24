package com.subb.surfers

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

/** Typed Retrofit interface for the leaderboard API. */
interface LeaderboardApi {

    @GET("api/leaderboard")
    suspend fun fetchLeaderboard(@Query("limit") limit: Int = 20): LeaderboardResponse

    @POST("api/leaderboard")
    suspend fun submitScore(@Body body: ScoreSubmissionRequest): ScoreSubmissionResult
}

/**
 * Single shared Retrofit/OkHttp client.
 *
 * The base URL comes from the compile-time constant [Config.API_BASE_URL].
 * Calls are suspending functions, so the calling scope decides the lifetime;
 * timeouts are enforced by OkHttp below.
 */
object ApiClient {

    private val json: Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
    }

    val api: LeaderboardApi by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val http = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        Retrofit.Builder()
            .baseUrl(Config.API_BASE_URL.ensureTrailingSlash())
            .client(http)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(LeaderboardApi::class.java)
    }

    private fun String.ensureTrailingSlash(): String = if (endsWith('/')) this else "$this/"
}
