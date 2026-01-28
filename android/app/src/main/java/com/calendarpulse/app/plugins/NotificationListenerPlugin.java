package com.calendarpulse.app.plugins;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "NotificationListener")
public class NotificationListenerPlugin extends Plugin {

    private static final String TAG = "NotificationPlugin";
    private static NotificationListenerPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "NotificationListenerPlugin loaded");

        // Set up the callback from NotificationService
        NotificationService.setCallback((packageName, title, text, timestamp) -> {
            Log.d(TAG, "Callback received: " + title + " - " + text);
            if (instance != null) {
                instance.notifyNotificationReceived(packageName, title, text, timestamp);
            }
        });
    }

    public static NotificationListenerPlugin getInstance() {
        return instance;
    }

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        boolean granted = isNotificationServiceEnabled();
        Log.d(TAG, "isPermissionGranted: " + granted);
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Log.d(TAG, "requestPermission called");
        if (!isNotificationServiceEnabled()) {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        JSObject ret = new JSObject();
        ret.put("opened", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        boolean granted = isNotificationServiceEnabled();
        Log.d(TAG, "startListening called, permission granted: " + granted);
        JSObject ret = new JSObject();
        ret.put("started", granted);
        if (!granted) {
            ret.put("error", "Notification access not granted. Please enable it in settings.");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        Log.d(TAG, "stopListening called");
        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    /**
     * Get queued notifications that arrived while app was closed
     * Returns array of notifications and clears the queue
     */
    @PluginMethod
    public void getQueuedNotifications(PluginCall call) {
        Log.d(TAG, "getQueuedNotifications called");
        try {
            String queueJson = NotificationService.getAndClearQueue(getContext());
            JSONArray queue = new JSONArray(queueJson);

            JSArray notifications = new JSArray();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject notif = queue.getJSONObject(i);
                JSObject jsNotif = new JSObject();
                jsNotif.put("packageName", notif.getString("packageName"));
                jsNotif.put("title", notif.getString("title"));
                jsNotif.put("text", notif.getString("text"));
                jsNotif.put("timestamp", notif.getLong("timestamp"));
                notifications.put(jsNotif);
            }

            JSObject ret = new JSObject();
            ret.put("notifications", notifications);
            ret.put("count", queue.length());
            Log.d(TAG, "Returning " + queue.length() + " queued notifications");
            call.resolve(ret);

        } catch (JSONException e) {
            Log.e(TAG, "Error getting queued notifications: " + e.getMessage());
            JSObject ret = new JSObject();
            ret.put("notifications", new JSArray());
            ret.put("count", 0);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    /**
     * Get the number of queued notifications without clearing
     */
    @PluginMethod
    public void getQueueSize(PluginCall call) {
        int size = NotificationService.getQueueSize(getContext());
        Log.d(TAG, "Queue size: " + size);
        JSObject ret = new JSObject();
        ret.put("size", size);
        call.resolve(ret);
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getContext().getPackageName();
        final String flat = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        if (!TextUtils.isEmpty(flat)) {
            final String[] names = flat.split(":");
            for (String name : names) {
                final ComponentName cn = ComponentName.unflattenFromString(name);
                if (cn != null && TextUtils.equals(pkgName, cn.getPackageName())) {
                    return true;
                }
            }
        }
        return false;
    }

    // Method to send captured notification to WebView
    public void notifyNotificationReceived(String packageName, String title, String text, long timestamp) {
        Log.d(TAG, "Notifying JS: " + title + " - " + text);
        JSObject data = new JSObject();
        data.put("packageName", packageName);
        data.put("title", title);
        data.put("text", text);
        data.put("timestamp", timestamp);
        notifyListeners("notificationReceived", data);
    }
}
