package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.ConflictItem
import com.xsytrance.vaib.data.model.WeeklyRefreshSummary
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.TextPrimary
import com.xsytrance.vaib.ui.theme.TextSecondary

@Composable
fun IntegrityScreen(
    conflicts: List<ConflictItem>,
    weeklySummary: WeeklyRefreshSummary,
    onApplySafeFixes: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text("Integrity", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        }

        item {
            VaibCard {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Weekly Refresh Ops", color = TextPrimary, fontWeight = FontWeight.Medium)
                    Spacer(Modifier.height(6.dp))
                    Text("Stale sources: ${weeklySummary.staleSourceCount}", color = TextSecondary, fontSize = 12.sp)
                    Text("Unresolved conflicts: ${weeklySummary.unresolvedConflictCount}", color = TextSecondary, fontSize = 12.sp)
                    Text("Low-freshness windows: ${weeklySummary.lowFreshnessWindowCount}", color = TextSecondary, fontSize = 12.sp)
                    Spacer(Modifier.height(8.dp))
                    weeklySummary.notes.forEach { note ->
                        Text("• $note", color = TextSecondary, fontSize = 12.sp)
                    }
                }
            }
        }

        item {
            Button(onClick = onApplySafeFixes, modifier = Modifier.fillMaxWidth()) {
                Text("Apply Safe Fixes")
            }
        }

        item {
            Text("Detected Conflicts", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        }

        if (conflicts.isEmpty()) {
            item {
                VaibCard {
                    Text("No integrity conflicts detected.", color = TextSecondary)
                }
            }
        } else {
            items(conflicts) { conflict ->
                VaibCard {
                    Column {
                        Text(conflict.title, color = TextPrimary, fontWeight = FontWeight.Medium)
                        Spacer(Modifier.height(4.dp))
                        Text(conflict.detail, color = TextSecondary, fontSize = 12.sp)
                        Spacer(Modifier.height(4.dp))
                        Text("${conflict.type} • ${conflict.severity}", color = TextSecondary, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}
