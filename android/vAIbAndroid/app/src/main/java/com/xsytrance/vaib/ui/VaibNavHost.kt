package com.xsytrance.vaib.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.QueueMusic
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.xsytrance.vaib.ui.screens.*
import com.xsytrance.vaib.ui.theme.*
import com.xsytrance.vaib.viewmodel.VaibViewModel

sealed class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
) {
    object Cockpit : BottomNavItem("cockpit", "Cockpit", Icons.Default.Home)
    object Stations : BottomNavItem("stations", "Stations", Icons.Default.Radio)
    object Queue : BottomNavItem("queue", "Queue", Icons.AutoMirrored.Filled.QueueMusic)
    object Agents : BottomNavItem("agents", "Agents", Icons.Default.SmartToy)
    object More : BottomNavItem("more", "More", Icons.Default.MoreHoriz)
}

object MoreRoutes {
    const val Stats = "stats"
    const val Eq = "eq"
    const val Api = "api"
    const val Settings = "settings"
    const val Updates = "updates"
    const val Automation = "automation"
    const val Integrity = "integrity"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaibNavHost(
    viewModel: VaibViewModel,
    navController: NavHostController = rememberNavController()
) {
    val appState by viewModel.appState.collectAsStateWithLifecycle()
    val freshnessScore by viewModel.freshnessScore.collectAsStateWithLifecycle()
    val changeFeed by viewModel.changeFeed.collectAsStateWithLifecycle()
    val automationRules by viewModel.automationRules.collectAsStateWithLifecycle()
    val automationLog by viewModel.automationLog.collectAsStateWithLifecycle()
    val conflicts by viewModel.conflicts.collectAsStateWithLifecycle()
    val weeklySummary by viewModel.weeklySummary.collectAsStateWithLifecycle()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: BottomNavItem.Cockpit.route

    val bottomNavItems = listOf(
        BottomNavItem.Cockpit,
        BottomNavItem.Stations,
        BottomNavItem.Queue,
        BottomNavItem.Agents,
        BottomNavItem.More
    )

    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

    Scaffold(
        containerColor = BackgroundAmoled,
        topBar = {
            if (!showBottomBar) {
                TopAppBar(
                    title = {
                        val title = when (currentRoute) {
                            MoreRoutes.Stats -> "Stats"
                            MoreRoutes.Eq -> "Equalizer"
                            MoreRoutes.Api -> "API"
                            MoreRoutes.Settings -> "Settings"
                            MoreRoutes.Updates -> "Updates"
                            MoreRoutes.Automation -> "Automation"
                            MoreRoutes.Integrity -> "Integrity"
                            else -> "vAIb"
                        }
                        Text(text = title, color = TextPrimary)
                    },
                    navigationIcon = {
                        IconButton(onClick = { navController.navigate(BottomNavItem.More.route) }) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = PrimaryNeonCyan
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = SurfaceDark
                    )
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = SurfaceDark,
                    tonalElevation = 0.dp
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = item.icon,
                                    contentDescription = item.title
                                )
                            },
                            label = {
                                Text(
                                    text = item.title,
                                    fontSize = 10.sp
                                )
                            },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.startDestinationId) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = PrimaryNeonCyan,
                                selectedTextColor = PrimaryNeonCyan,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted,
                                indicatorColor = SurfaceCard
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomNavItem.Cockpit.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(BottomNavItem.Cockpit.route) {
                CockpitScreen(
                    appState = appState,
                    viewModel = viewModel
                )
            }
            composable(BottomNavItem.Stations.route) {
                StationsScreen(
                    appState = appState,
                    onStationClick = { station ->
                        viewModel.selectStation(station)
                    }
                )
            }
            composable(BottomNavItem.Queue.route) {
                QueueScreen(appState = appState)
            }
            composable(BottomNavItem.Agents.route) {
                AgentsScreen(
                    appState = appState,
                    viewModel = viewModel
                )
            }
            composable(BottomNavItem.More.route) {
                MoreScreen(navController = navController)
            }
            composable(MoreRoutes.Stats) {
                StatsScreen(
                    appState = appState,
                    viewModel = viewModel
                )
            }
            composable(MoreRoutes.Eq) {
                EqScreen(outputMode = appState.playback.outputMode)
            }
            composable(MoreRoutes.Api) {
                ApiScreen()
            }
            composable(MoreRoutes.Settings) {
                SettingsScreen(viewModel = viewModel)
            }
            composable(MoreRoutes.Updates) {
                UpdatesScreen(freshnessScore = freshnessScore, changeFeed = changeFeed)
            }
            composable(MoreRoutes.Automation) {
                AutomationScreen(
                    rules = automationRules,
                    log = automationLog,
                    onRuleToggled = { ruleId, enabled -> viewModel.setRuleEnabled(ruleId, enabled) }
                )
            }
            composable(MoreRoutes.Integrity) {
                IntegrityScreen(
                    conflicts = conflicts,
                    weeklySummary = weeklySummary,
                    onApplySafeFixes = { viewModel.applySafeConflictFixes() }
                )
            }
        }
    }
}
