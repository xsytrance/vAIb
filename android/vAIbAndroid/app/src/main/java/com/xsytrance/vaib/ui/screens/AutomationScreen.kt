package com.xsytrance.vaib.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.xsytrance.vaib.data.model.AutomationDecision
import com.xsytrance.vaib.data.model.AutomationRule
import com.xsytrance.vaib.ui.components.VaibCard
import com.xsytrance.vaib.ui.theme.TextPrimary
import com.xsytrance.vaib.ui.theme.TextSecondary

@Composable
fun AutomationScreen(
    rules: List<AutomationRule>,
    log: List<AutomationDecision>,
    onRuleToggled: (String, Boolean) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text("Automation Rules", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        }

        items(rules) { rule ->
            VaibCard {
                Column {
                    Text(rule.name, color = TextPrimary, fontWeight = FontWeight.Medium)
                    Spacer(Modifier.height(4.dp))
                    Text("${rule.trigger} → ${rule.action}", color = TextSecondary, fontSize = 12.sp)
                    Spacer(Modifier.height(8.dp))
                    Switch(
                        checked = rule.enabled,
                        onCheckedChange = { enabled -> onRuleToggled(rule.id, enabled) }
                    )
                }
            }
        }

        item {
            Spacer(Modifier.height(8.dp))
            Text("Audit Log", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        }

        items(log.take(30)) { row ->
            VaibCard {
                Column {
                    Text("${row.ruleName} • ${row.action}", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    Spacer(Modifier.height(4.dp))
                    Text(row.detail, color = TextSecondary, fontSize = 12.sp)
                }
            }
        }
    }
}
