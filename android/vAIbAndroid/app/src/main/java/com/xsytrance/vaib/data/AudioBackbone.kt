package com.xsytrance.vaib.data

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.net.Uri
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
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

    fun bindListener(listener: Player.Listener) {
        player.addListener(listener)
    }

    fun playStation(station: Station) {
        val mediaItem = MediaItem.fromUri(resolveUri(station))
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
    }

    fun togglePlayPause() {
        if (player.isPlaying) player.pause() else player.play()
    }

    fun pause() = player.pause()

    fun isPlaying(): Boolean = player.isPlaying

    fun isBuffering(): Boolean = player.playbackState == Player.STATE_BUFFERING

    fun progress(): Float {
        val duration = player.duration
        if (duration <= 0L) return 0f
        return (player.currentPosition.toFloat() / duration.toFloat()).coerceIn(0f, 1f)
    }

    fun sourceFor(station: Station): String {
        val local = station.fallbackLocalTrack
        if (!local.isNullOrBlank() && File(local).exists()) return "local"
        if (!station.streamUrl.isNullOrBlank()) return "stream"
        return "asset"
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
        val localPath = station.fallbackLocalTrack
        if (!localPath.isNullOrBlank()) {
            val file = File(localPath)
            if (file.exists()) return Uri.fromFile(file)
        }

        val stationAsset = "asset:///audio/${station.id}.mp3"
        return when (station.playbackMode) {
            "local" -> Uri.parse(stationAsset)
            "stream" -> Uri.parse(station.streamUrl ?: stationAsset)
            else -> {
                if (!station.streamUrl.isNullOrBlank()) Uri.parse(station.streamUrl)
                else Uri.parse(stationAsset)
            }
        }
    }

    fun release() {
        mediaSession.release()
        player.release()
    }
}
