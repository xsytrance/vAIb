package com.xsytrance.vaib.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.xsytrance.vaib.ui.theme.BorderSubtle
import com.xsytrance.vaib.ui.theme.SurfaceCard
import com.xsytrance.vaib.ui.theme.PrimaryNeonCyan

@Composable
fun VaibCard(
    modifier: Modifier = Modifier,
    neonGlow: Boolean = false,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceCard),
        border = BorderStroke(
            width = if (neonGlow) 1.5.dp else 1.dp,
            color = if (neonGlow) PrimaryNeonCyan else BorderSubtle
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (neonGlow) 8.dp else 2.dp
        )
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            content()
        }
    }
}
