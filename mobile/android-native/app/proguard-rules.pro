# SUBB SURFERS Android client — R8 / ProGuard rules.

# ---------- kotlinx.serialization ----------
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions
-dontnote kotlinx.serialization.**

# Keep generated serializers for our models.
-keep,includedescriptorclasses class com.subb.surfers.**$$serializer { *; }
-keepclassmembers class com.subb.surfers.** {
    *** Companion;
}
-keepclasseswithmembers class com.subb.surfers.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# ---------- Retrofit ----------
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# ---------- OkHttp ----------
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ---------- WebView JS bridge ----------
-keepclassmembers class com.subb.surfers.RunStatsStore$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
