package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.Reaction
import com.xsytrance.vaib.ui.theme.*

@Composable
fun ReactionBadge(
    reaction: Reaction,
    modifier: Modifier = Modifier
) {
    VaibCard(modifier = modifier) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AgentChip(
                    name = reaction.agentId.replaceFirstChar { it.uppercase() },
                    colorHex = when (reaction.agentId) {
                        "djinn" -> "#00E5FF"
                        "groove-whisper" -> "#FFD700"
                        "salsa-bot" -> "#FF00FF"
                        "synth-rider" -> "#8B5CF6"
                        "bass-forge" -> "#FF4444"
                        "harmony" -> "#00FF88"
                        "echo" -> "#FF8800"
                        else -> "#AAAAAA"
                    }
                )

                Spacer(modifier = Modifier.weight(1f))

                StatusPill(
                    status = when (reaction.type) {
                        "like" -> "hosting"
                        "dislike" -> "unstable"
                        else -> "listening"
                    }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = ""${'$'}{reaction.comment}"",
                color = TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                reaction.emojis.forEach { emoji ->
                    Text(
                        text = emoji,
                        fontSize = 16.sp,
                        modifier = Modifier.padding(end = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.weight(1f))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.ChatBubble,
                        contentDescription = "Tokens",
                        tint = TextMuted,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "${'$'}{reaction.estimatedTokens}t",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                Text(
                    text = reaction.createdAt,
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }
        }
    }
}
