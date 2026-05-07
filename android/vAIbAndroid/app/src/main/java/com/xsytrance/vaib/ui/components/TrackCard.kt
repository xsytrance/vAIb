package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ThumbDown
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.Track
import com.xsytrance.vaib.data.model.QueueItem
import com.xsytrance.vaib.ui.theme.*

@Composable
fun TrackCard(
    track: Track,
    modifier: Modifier = Modifier
) {
    VaibCard(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = track.title,
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = track.artist,
                    color = TextSecondary,
                    fontSize = 13.sp
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${'$'}{track.bpm} BPM",
                    color = PrimaryNeonCyan,
                    fontSize = 12.sp
                )
                Text(
                    text = track.length,
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }
        }

        if (track.tags.isNotEmpty()) {
            Spacer(modifier = Modifier.height(6.dp))
            Row {
                track.tags.forEach { tag ->
                    Text(
                        text = tag,
                        color = AccentMagenta,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(end = 8.dp)
                    )
                }
            }
        }

        if (track.reason.isNotEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Reason: ${'$'}{track.reason}",
                color = TextMuted,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
fun QueueTrackCard(
    queueItem: QueueItem,
    modifier: Modifier = Modifier
) {
    VaibCard(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = queueItem.title,
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = queueItem.artist,
                    color = TextSecondary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "by ${'$'}{queueItem.requestedBy} • ${'$'}{queueItem.stationId} • ${'$'}{queueItem.mood}",
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${'$'}{queueItem.bpm} BPM",
                    color = PrimaryNeonCyan,
                    fontSize = 12.sp
                )
                Text(
                    text = queueItem.duration,
                    color = TextMuted,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.ThumbUp,
                        contentDescription = "Likes",
                        tint = LiveGreen,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "${'$'}{queueItem.likes}",
                        color = LiveGreen,
                        fontSize = 11.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(
                        imageVector = Icons.Default.ThumbDown,
                        contentDescription = "Dislikes",
                        tint = ErrorRed,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "${'$'}{queueItem.dislikes}",
                        color = ErrorRed,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
