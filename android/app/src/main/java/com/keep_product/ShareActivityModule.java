package com.keep_product;

import android.app.Activity;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class ShareActivityModule extends ReactContextBaseJavaModule {

    ShareActivityModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "ShareActivityModule";
    }

    @ReactMethod
    public void close() {
        Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.finish();
        }
    }
}
