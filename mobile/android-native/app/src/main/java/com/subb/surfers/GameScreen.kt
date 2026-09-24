package com.subb.surfers

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Hosts the published web build of SUBB SURFERS in an embedded WebView.
 * The URL is the compile-time constant [Config.GAME_URL] — deliberately not a
 * BuildConfig field so debug and release always use the same game host unless
 * the constant itself is overridden per source set.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GameScreen(modifier: Modifier = Modifier) {
    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                settings.mediaPlaybackRequiresUserGesture = false
                webViewClient = WebViewClient()
                // window.SubbSurfers.postRun(json) — see RunStatsStore.Bridge.
                addJavascriptInterface(RunStatsStore.Bridge(context), "SubbSurfers")
                loadUrl(Config.GAME_URL)
            }
        },
        onRelease = { it.destroy() },
        update = { /* no-op: the WebView owns its own state */ },
    )
}
