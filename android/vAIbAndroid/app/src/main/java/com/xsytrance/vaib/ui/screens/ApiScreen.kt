package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.*

@Composable
fun ApiScreen(
    backendUrl: String = "http://10.0.2.2:4014"
) {
    val reactionCurl = """curl -X POST ${backendUrl}/agent/reaction \
  -H "Content-Type: application/json" \
  -d '{"agentId":"djinn","trackId":"track-001","type":"like","rating":5,"emojis":["high-voltage","cyclone"],"comment":"Clean pulse."}'"""

    val queueCurl = """curl -X POST ${backendUrl}/queue/add \
  -H "Content-Type: application/json" \
  -d '{"stationId":"prime-pulse","agent":"DJinn","title":"Synthetic Sunrise","artist":"Procedural Ghost","mood":"neon focus","bpm":132}'"""

    val endpoints = listOf(
        "GET  /state" to "Get full app state",
        "GET  /stations" to "List all stations",
        "GET  /queue" to "Get current queue",
        "GET  /agents" to "List all agents",
        "GET  /reactions" to "Get reactions",
        "POST /agent/reaction" to "Submit agent reaction",
        "POST /queue/add" to "Add track to queue",
        "GET  /stats" to "Get listening stats",
        "GET  /health" to "Health check"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "API",
                color = TextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Backend: ${backendUrl}",
                color = TextSecondary,
                fontSize = 14.sp
            )
        }

        VaibCard {
            Column {
                Text(
                    text = "POST /agent/reaction",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = reactionCurl,
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    lineHeight = 16.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        VaibCard {
            Column {
                Text(
                    text = "POST /queue/add",
                    color = PrimaryNeonCyan,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = queueCurl,
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    lineHeight = 16.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Endpoints",
            color = TextPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(4.dp))

        endpoints.forEach { (endpoint, description) ->
            VaibCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = endpoint,
                            color = PrimaryNeonCyan,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            fontFamily = FontFamily.Monospace
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = description,
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp))
    }
}
