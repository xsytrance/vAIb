package com.xsytrance.vaib.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.net.Uri
import android.os.Build
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
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        notificationManager
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
        if (hasExternalLocal(station)) return "local"
        return when {
            hasBundledAsset(station) -> "asset"
            !station.streamUrl.isNullOrBlank() -> "stream"
            else -> "asset"
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
        if (hasExternalLocal(station)) return Uri.fromFile(File(station.fallbackLocalTrack!!))

        val assetUri = Uri.parse("asset:///audio/${station.id}.mp3")
        return when (station.playbackMode) {
            "local" -> assetUri
            "stream" -> Uri.parse(station.streamUrl ?: assetUri.toString())
            else -> if (hasBundledAsset(station)) assetUri else Uri.parse(station.streamUrl ?: assetUri.toString())
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel("vaib-playback", "vAIb Playback", NotificationManager.IMPORTANCE_LOW)
            manager.createNotificationChannel(channel)
        }
    }

    fun release() {
        notificationManager.setPlayer(null)
        mediaSession.release()
        player.release()
    }
}
