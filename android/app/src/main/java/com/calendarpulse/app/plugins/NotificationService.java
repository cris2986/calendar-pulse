package com.calendarpulse.app.plugins;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class NotificationService extends NotificationListenerService {
    private static final String TAG = "CalendarPulseNLS";
    private static final String PREFS_NAME = "CalendarPulseNotificationQueue";
    private static final String QUEUE_KEY = "notification_queue";
    private static final int MAX_QUEUE_SIZE = 100; // Prevent unlimited growth

    // Packages to listen to for calendar events
    private static final Set<String> ALLOWED_PACKAGES = new HashSet<>(Arrays.asList(
        // WhatsApp
        "com.whatsapp",
        "com.whatsapp.w4b",  // WhatsApp Business
        // Gmail
        "com.google.android.gm",
        // SMS/Messages apps
        "com.google.android.apps.messaging",  // Google Messages
        "com.samsung.android.messaging",       // Samsung Messages
        "com.android.mms"                      // Stock Android SMS
    ));

    private static NotificationService instance;
    private static NotificationCallback callback;

    public interface NotificationCallback {
        void onNotificationReceived(String packageName, String title, String text, long timestamp);
    }

    public static void setCallback(NotificationCallback cb) {
        callback = cb;
        Log.d(TAG, "Callback set: " + (cb != null ? "yes" : "no"));
    }

    public static NotificationService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        Log.d(TAG, "NotificationService created");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
        Log.d(TAG, "NotificationService destroyed");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();

        // Only process notifications from allowed apps
        if (!ALLOWED_PACKAGES.contains(packageName)) {
            return;
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;

        String title = "";
        String text = "";

        // Extract title (contact/group name)
        if (extras.containsKey(Notification.EXTRA_TITLE)) {
            CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
            if (titleCs != null) {
                title = titleCs.toString();
            }
        }

        // Extract message text
        if (extras.containsKey(Notification.EXTRA_TEXT)) {
            CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
            if (textCs != null) {
                text = textCs.toString();
            }
        }

        // Also try to get expanded text (long messages)
        if (extras.containsKey(Notification.EXTRA_BIG_TEXT)) {
            CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
            if (bigText != null && bigText.length() > text.length()) {
                text = bigText.toString();
            }
        }

        // Skip empty messages
        if (text.isEmpty()) {
            return;
        }

        long timestamp = sbn.getPostTime();

        Log.d(TAG, "Notification from " + packageName + ": " + title + " - " + text);

        // Try to send to callback (app is active)
        boolean sentToCallback = false;
        if (callback != null) {
            try {
                callback.onNotificationReceived(packageName, title, text, timestamp);
                sentToCallback = true;
                Log.d(TAG, "Sent to callback successfully");
            } catch (Exception e) {
                Log.e(TAG, "Failed to send to callback: " + e.getMessage());
            }
        }

        // Always save to queue as backup (in case app wasn't ready)
        if (!sentToCallback) {
            saveToQueue(packageName, title, text, timestamp);
        }
    }

    /**
     * Save notification to persistent queue
     */
    private void saveToQueue(String packageName, String title, String text, long timestamp) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String queueJson = prefs.getString(QUEUE_KEY, "[]");
            JSONArray queue = new JSONArray(queueJson);

            // Create notification object
            JSONObject notif = new JSONObject();
            notif.put("packageName", packageName);
            notif.put("title", title);
            notif.put("text", text);
            notif.put("timestamp", timestamp);

            // Add to queue
            queue.put(notif);

            // Trim queue if too large (keep newest)
            while (queue.length() > MAX_QUEUE_SIZE) {
                queue.remove(0);
            }

            // Save back
            prefs.edit().putString(QUEUE_KEY, queue.toString()).apply();
            Log.d(TAG, "Saved to queue. Queue size: " + queue.length());

        } catch (JSONException e) {
            Log.e(TAG, "Failed to save to queue: " + e.getMessage());
        }
    }

    /**
     * Get all queued notifications and clear the queue
     */
    public static String getAndClearQueue(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String queueJson = prefs.getString(QUEUE_KEY, "[]");

        // Clear the queue
        prefs.edit().putString(QUEUE_KEY, "[]").apply();

        Log.d(TAG, "Retrieved and cleared queue: " + queueJson);
        return queueJson;
    }

    /**
     * Get queue size without clearing
     */
    public static int getQueueSize(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String queueJson = prefs.getString(QUEUE_KEY, "[]");
            JSONArray queue = new JSONArray(queueJson);
            return queue.length();
        } catch (JSONException e) {
            return 0;
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Optional: handle notification removal
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.d(TAG, "Notification Listener connected");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.d(TAG, "Notification Listener disconnected");
    }
}
