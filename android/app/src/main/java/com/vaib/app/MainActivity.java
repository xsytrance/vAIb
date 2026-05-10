package com.vaib.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Allow audio autoplay without requiring a user gesture
    WebView webView = getBridge().getWebView();
    webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
  }
}
