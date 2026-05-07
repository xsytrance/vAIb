package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.xsytrance.vaib.ui.VaibNavHost
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.*

@Composable
fun MoreScreen(
    navController: NavHostController
) {
    val items = listOf(
        Triple("Stats", Icons.Default.BarChart, "stats"),
        Triple("Updates", Icons.Default.Update, "updates"),
        Triple("Equalizer", Icons.Default.Equalizer, "eq"),
        Triple("API", Icons.Default.Api, "api"),
        Triple("Settings", Icons.Default.Settings, "settings")
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "More",
            color = TextPrimary,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        items.forEach { (title, icon, route) ->
            VaibCard(
                modifier = Modifier
                    .clickable {
                        navController.navigate(route)
                    }
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = title,
                        tint = PrimaryNeonCyan,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = title,
                            color = TextPrimary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = "Open",
                        tint = TextMuted
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}
