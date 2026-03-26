package com.cosmoserp.pos.plugins;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AuthBridge")
public class AuthBridgePlugin extends Plugin {
  @PluginMethod
  public void getAccessToken(PluginCall call) {
    SharedPreferences prefs = getContext().getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
    String token = prefs.getString("access_token", null);

    JSObject res = new JSObject();
    res.put("accessToken", token);
    call.resolve(res);
  }
}
