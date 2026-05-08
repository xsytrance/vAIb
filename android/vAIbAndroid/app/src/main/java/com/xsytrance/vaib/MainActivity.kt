package com.xsytrance.vaib

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalConfiguration
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.xsytrance.vaib.ui.VaibNavHost
import com.xsytrance.vaib.ui.screens.LandscapeDjDeck
import com.xsytrance.vaib.ui.fx.core.LocalMotionIntensity
import com.xsytrance.vaib.ui.theme.VaibTheme
import com.xsytrance.vaib.viewmodel.VaibViewModel

/**
 * MainActivity — single-activity entry point for vAIb.
 *
 * Phase 0: Wrapped with [CompositionLocalProvider] providing [LocalMotionIntensity]
 * from the ViewModel. This is infrastructure-only wiring — no visual change.
 * Phase 2+: All animated components will read [LocalMotionIntensity.current]
 * to determine animation behavior.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContent {
            VaibTheme {
                val viewModel: VaibViewModel = viewModel()
                val configuration = LocalConfiguration.current
                val appState by viewModel.appState.collectAsStateWithLifecycle()
                val motionIntensity by viewModel.motionIntensity.collectAsStateWithLifecycle()

                CompositionLocalProvider(
                    LocalMotionIntensity provides motionIntensity
                ) {
                    when (configuration.orientation) {
                        Configuration.ORIENTATION_LANDSCAPE -> {
                            LandscapeDjDeck(
                                appState = appState,
                                viewModel = viewModel
                            )
                        }
                        else -> {
                            VaibNavHost(viewModel = viewModel)
                        }
                    }
                }
            }
        }
    }
}
