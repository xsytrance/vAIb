package com.xsytrance.vaib.data

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.net.Uri
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.ui.PlayerNotificationManager
import com.xsytrance.vaib.MainActivity
import com.xsytrance.vaib.data.model.Station
import java.io.File

@SuppressLint("UnsafeOptInUsageError")
class AudioBackbone(private val context: Context) {

    private val player: ExoPlayer = ExoPlayer.Builder(context).build().apply {
        setAudioAttributes(
            AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .setUsage(C.USAGE_MEDIA)
                .build(),
            true
        )
        playWhenReady = false
        repeatMode = Player.REPEAT_MODE_ONE
    }

    private val mediaSession = MediaSession.Builder(context, player)
        .setId("vaib-media-session")
        .build()

    private val notificationManager: PlayerNotificationManager by lazy {
        ensureNotificationChannel()
        PlayerNotificationManager.Builder(context, 4014, "vaib-playback")
            .setMediaDescriptionAdapter(object : PlayerNotificationManager.MediaDescriptionAdapter {
                override fun createCurrentContentIntent(player: Player) =
                    android.app.PendingIntent.getActivity(
                        context,
                        0,
                        Intent(context, MainActivity::class.java),
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                    )

                override fun getCurrentContentTitle(player: Player): CharSequence = "vAIb Broadcasting"
                override fun getCurrentContentText(player: Player): CharSequence =
                    player.currentMediaItem?.mediaMetadata?.title ?: "Agent-native radio"

                override fun getCurrentSubText(player: Player): CharSequence =
                    if (player.isPlaying) "LIVE" else "Paused"

                override fun getCurrentLargeIcon(
                    player: Player,
                    callback: PlayerNotificationManager.BitmapCallback
                ) = null
            })
            .build().apply {
                setUseNextAction(false)
                setUsePreviousAction(false)
                setPlayer(this@AudioBackbone.player)
            }
    }

    fun bindListener(listener: Player.Listener) {
        player.addListener(listener)
    }

    fun playStation(station: Station) {
        val uri = resolveUri(station)
        val mediaItem = MediaItem.Builder()
            .setUri(uri)
            .setMediaId(station.id)
            .setMediaMetadata(
                androidx.media3.common.MediaMetadata.Builder()
                    .setTitle(station.name)
                    .setArtist(station.hostAgent)
                    .build()
            )
            .build()
        player.repeatMode = Player.REPEAT_MODE_ONE
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        notificationManager
    }

    fun playNarrationFile(file: File, announcer: String = "vAIb DJ") {
        if (!file.exists() || file.length() <= 0L) return
        val mediaItem = MediaItem.Builder()
            .setUri(Uri.fromFile(file))
            .setMediaId("dj-narration-${file.nameWithoutExtension}")
            .setMediaMetadata(
                androidx.media3.common.MediaMetadata.Builder()
                    .setTitle("DJ Interstitial")
                    .setArtist(announcer)
                    .build()
            )
            .build()
        player.repeatMode = Player.REPEAT_MODE_OFF
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
    }

    fun togglePlayPause() {
        if (player.isPlaying) player.pause() else player.play()
    }

    fun isPlaying(): Boolean = player.isPlaying
    fun isBuffering(): Boolean = player.playbackState == Player.STATE_BUFFERING

    fun progress(): Float {
        val duration = player.duration
        if (duration <= 0L) return 0f
        return (player.currentPosition.toFloat() / duration.toFloat()).coerceIn(0f, 1f)
    }

    fun sourceFor(station: Station): String {
        val hasLocal = hasExternalLocal(station)
        val hasStream = !station.streamUrl.isNullOrBlank()
        val hasAsset = hasBundledAsset(station)

        return when (station.playbackMode) {
            "local" -> if (hasLocal) "local" else if (hasAsset) "asset" else if (hasStream) "stream" else "asset"
            "stream" -> if (hasStream) "stream" else if (hasLocal) "local" else "asset"
            else -> if (hasLocal) "local" else if (hasStream) "stream" else "asset"
        }
    }

    fun outputMode(): String {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val outputs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        val bluetooth = outputs.any {
            it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                it.type == AudioDeviceInfo.TYPE_BLE_SPEAKER ||
                it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
        }
        return if (bluetooth) "bluetooth" else "speaker"
    }

    private fun resolveUri(station: Station): Uri {
        val hasLocal = hasExternalLocal(station)
        val hasStream = !station.streamUrl.isNullOrBlank()
        val assetUri = Uri.parse("asset:///audio/${station.id}.mp3")

        return when (station.playbackMode) {
            "local" -> {
                when {
                    hasLocal -> Uri.fromFile(File(station.fallbackLocalTrack!!))
                    hasBundledAsset(station) -> assetUri
                    hasStream -> Uri.parse(station.streamUrl!!)
                    else -> assetUri
                }
            }
            "stream" -> {
                when {
                    hasStream -> Uri.parse(station.streamUrl!!)
                    hasLocal -> Uri.fromFile(File(station.fallbackLocalTrack!!))
                    else -> assetUri
                }
            }
            else -> {
                when {
                    hasLocal -> Uri.fromFile(File(station.fallbackLocalTrack!!))
                    hasStream -> Uri.parse(station.streamUrl!!)
                    else -> assetUri
                }
            }
        }
    }

    private fun hasExternalLocal(station: Station): Boolean {
        val localPath = station.fallbackLocalTrack ?: return false
        return File(localPath).exists()
    }

    private fun hasBundledAsset(station: Station): Boolean = try {
        context.assets.open("audio/${station.id}.mp3").close(); true
    } catch (_: Exception) {
        false
    }

    private fun ensureNotificationChannel() {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel("vaib-playback", "vAIb Playback", NotificationManager.IMPORTANCE_LOW)
        manager.createNotificationChannel(channel)
    }

    fun release() {
        notificationManager.setPlayer(null)
        mediaSession.release()
        player.release()
    }
}
