package com.calendarpulse.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.calendarpulse.app.plugins.NotificationListenerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the custom plugin
        registerPlugin(NotificationListenerPlugin.class);

        super.onCreate(savedInstanceState);
    }
}
