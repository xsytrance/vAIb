package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.AppState
import com.xsytrance.vaib.data.model.Station
import com.xsytrance.vaib.ui.components.StationCard
import com.xsytrance.vaib.ui.theme.PrimaryNeonCyan
import com.xsytrance.vaib.ui.theme.TextPrimary
import com.xsytrance.vaib.ui.theme.TextSecondary

@Composable
fun StationsScreen(
    appState: AppState,
    onStationClick: (Station) -> Unit = {}
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
                    text = "Stations",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${appState.stations.count { it.isLive }} live • ${appState.stations.sumOf { it.listeners }} listeners",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
            }
        }

        items(appState.stations) { station ->
            StationCard(
                station = station,
                isCurrentStation = appState.playback.currentStation?.id == station.id
            )
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}
