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
import com.xsytrance.vaib.data.model.ChangeEvent
import com.xsytrance.vaib.ui.components.FreshnessBadge
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.TextPrimary
import com.xsytrance.vaib.ui.theme.TextSecondary

@Composable
fun UpdatesScreen(
    freshnessScore: Int,
    changeFeed: List<ChangeEvent>
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        FreshnessBadge(score = freshnessScore)
        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Recent Changes",
            color = TextPrimary,
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(modifier = Modifier.height(8.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(changeFeed) { event ->
                VaibCard {
                    Column {
                        Text(text = event.title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = event.detail, color = TextSecondary, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
