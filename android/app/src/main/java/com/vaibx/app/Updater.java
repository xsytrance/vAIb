package com.vaibx.app;

import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.channels.Channels;
import java.nio.channels.FileChannel;
import java.io.RandomAccessFile;

/**
 * Auto-update system for vAIb-X Android.
 * - Checks /settings/mobile-updates on the API server
 * - If newer version available, prompts user
 * - Downloads APK to Downloads folder and triggers install intent
 */
public class Updater {
    private static final String TAG = "vAIbX-Updater";
    private static final String API_BASE_URL = "https://100.110.224.126:4014";
    private static final String UPDATE_ENDPOINT = "/settings/mobile-updates";
    private static final String SHARED_PREFS_NAME = "vaibx_updates";
    private static final String PREF_LAST_CHECKED = "last_checked_ms";
    private static final long CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

    private final Context context;
    private DownloadManager downloadManager;

    public Updater(Context context) {
        this.context = context;
        this.downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
    }

    /** Run the update check. Call from MainActivity.onCreate(). */
    public void checkForUpdates() {
        // Throttle checks to avoid spamming the server
        long lastChecked = getLastCheckTime();
        long now = System.currentTimeMillis();
        if (now - lastChecked < CHECK_INTERVAL_MS) {
            Log.d(TAG, "Skipping update check, last checked " + (now - lastChecked) / 60000 + " min ago");
            return;
        }

        new Thread(() -> {
            try {
                // Build JSON payload with current version info
                PackageInfo packageInfo = context.getPackageManager().getPackageInfo(
                        context.getPackageName(), 0);
                String currentVersionName = packageInfo.versionName;
                int currentVersionCode = (int) packageInfo.getLongVersionCode();

                String json = String.format(
                        "{\"platform\":\"android\",\"channel\":\"stable\"," +
                        "\"current\":{\"versionCode\":%d,\"versionName\":\"%s\"}}",
                        currentVersionCode, currentVersionName);

                URL url = new URL(API_BASE_URL + UPDATE_ENDPOINT);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(15000);
                conn.connect();

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                conn.disconnect();

                Log.d(TAG, "Update check response: " + response.toString());
                setLastCheckTime(now);

                // Parse response to check if update is needed
                String respStr = response.toString();
                if (respStr.contains("\"available\":true")) {
                    // Extract download URL from response JSON (simple string parse)
                    String apkUrl = extractField(respStr, "apkUrl");
                    String versionName = extractField(respStr, "versionName");
                    // Extract fields from response JSON (simple string parse)
                    String finalApkUrl = extractField(respStr, "apkUrl");
                    String finalVersionName = extractField(respStr, "versionName");
                    String releaseNotes = extractField(respStr, "notes");

                    if (finalApkUrl != null && !finalApkUrl.isEmpty()) {
                        // Make sure it's an absolute URL
                        if (finalApkUrl.startsWith("/")) {
                            finalApkUrl = API_BASE_URL + finalApkUrl;
                        } else if (!finalApkUrl.startsWith("http")) {
                            finalApkUrl = API_BASE_URL + "/" + finalApkUrl;
                        }

                        // Show update dialog on main thread
                        final String apkUrlForDialog = finalApkUrl;
                        final String versionForDialog = finalVersionName;
                        final String notesForDialog = releaseNotes;
                        ((android.app.Activity) context).runOnUiThread(() ->
                                showUpdateDialog(versionForDialog, notesForDialog, apkUrlForDialog)
                        );
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Update check failed", e);
                // Silently fail — will retry on next launch
            }
        }).start();
    }

    private void showUpdateDialog(String versionName, String notes, String apkUrl) {
        String message = "vAIb-X " + versionName + " is available!\n\n";
        if (notes != null && !notes.isEmpty()) {
            message += notes;
        } else {
            message += "New version of vAIb-X is ready to install.";
        }

        new AlertDialog.Builder(context)
                .setTitle("Update Available")
                .setMessage(message)
                .setPositiveButton("Download & Install", (dialog, which) -> {
                    // Check if install from unknown sources is allowed
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (!context.getPackageManager().canRequestPackageInstalls()) {
                            // Redirect to settings to enable
                            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                            intent.setData(Uri.parse("package:" + context.getPackageName()));
                            context.startActivity(intent);
                            // Retry after user enables the permission
                            new AlertDialog.Builder(context)
                                    .setTitle("Permission Required")
                                    .setMessage("Enable 'Allow from this source' for vAIb-X to install updates.")
                                    .setPositiveButton("Retry", (d, w) -> downloadAndInstall(apkUrl))
                                    .setNegativeButton("Cancel", null)
                                    .show();
                            return;
                        }
                    }
                    downloadAndInstall(apkUrl);
                })
                .setNegativeButton("Later", null)
                .show();
    }

    private void downloadAndInstall(String apkUrl) {
        try {
            String fileName = "vaibx-update.apk";
            File downloadsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS);
            File outputFile = new File(downloadsDir, fileName);

            // Use Android DownloadManager for reliable downloads
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("vAIb-X Update");
            request.setDescription("Downloading update...");
            request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS, fileName);
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("application/vnd.android.package-archive");

            long downloadId = downloadManager.enqueue(request);

            // Register broadcast receiver for download completion
            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context ctx, Intent intent) {
                    long receivedId = intent.getLongExtra(
                            DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (receivedId == downloadId) {
                        installApk(outputFile);
                        context.unregisterReceiver(this);
                    }
                }
            };

            IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
            context.registerReceiver(onComplete, filter);

            Log.d(TAG, "Download initiated, ID: " + downloadId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start download", e);
            ((android.app.Activity) context).runOnUiThread(() ->
                    new AlertDialog.Builder(context)
                            .setTitle("Download Failed")
                            .setMessage("Could not start the download. Please try again.")
                            .setPositiveButton("OK", null)
                            .show()
            );
        }
    }

    private void installApk(File apkFile) {
        try {
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        apkFile
                );
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            Intent installIntent = new Intent(Intent.ACTION_INSTALL_PACKAGE);
            installIntent.setData(apkUri);
            installIntent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                installIntent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
                installIntent.putExtra(Intent.EXTRA_RETURN_RESULT, true);
            }

            context.startActivity(installIntent);
            Log.d(TAG, "Install intent fired for: " + apkFile.getAbsolutePath());
        } catch (Exception e) {
            Log.e(TAG, "Failed to install APK", e);
            ((android.app.Activity) context).runOnUiThread(() ->
                    new AlertDialog.Builder(context)
                            .setTitle("Installation Failed")
                            .setMessage("Could not install the update. Please try installing it manually from your Downloads.")
                            .setPositiveButton("OK", null)
                            .show()
            );
        }
    }

    // Simple JSON field extractor (avoids JSON lib dependency)
    private String extractField(String json, String fieldName) {
        String search = "\"" + fieldName + "\":\"";
        int start = json.indexOf(search);
        if (start == -1) return null;
        start += search.length();
        int end = json.indexOf("\"", start);
        if (end == -1) return null;
        return json.substring(start, end);
    }

    // Also handle numeric fields like versionCode
    private String extractNumField(String json, String fieldName) {
        String search = "\"" + fieldName + "\":";
        int start = json.indexOf(search);
        if (start == -1) {
            // Try as string
            return extractField(json, fieldName);
        }
        start += search.length();
        int end = Math.min(json.indexOf(",", start), json.indexOf("}", start));
        if (end == -1) end = json.length();
        return json.substring(start, end).trim();
    }

    private void setLastCheckTime(long timeMs) {
        context.getSharedPreferences(SHARED_PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putLong(PREF_LAST_CHECKED, timeMs)
                .apply();
    }

    private long getLastCheckTime() {
        return context.getSharedPreferences(SHARED_PREFS_NAME, Context.MODE_PRIVATE)
                .getLong(PREF_LAST_CHECKED, 0);
    }
}
