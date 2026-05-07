package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.ui.components.QueueTrackCard
import com.xsytrance.vaib.ui.theme.PrimaryNeonCyan
import com.xsytrance.vaib.ui.theme.TextPrimary
import com.xsytrance.vaib.ui.theme.TextSecondary

@Composable
fun QueueScreen(
    appState: AppState
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp)
    ) {
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = "Queue",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${'$'}{appState.queue.size} tracks queued",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
            }
        }

        items(appState.queue) { queueItem ->
            QueueTrackCard(queueItem = queueItem)
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}
