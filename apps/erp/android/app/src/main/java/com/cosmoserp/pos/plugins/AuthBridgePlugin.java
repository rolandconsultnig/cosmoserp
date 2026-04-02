package com.cosmoserp.pos.plugins;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.util.concurrent.Executor;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AuthBridge")
public class AuthBridgePlugin extends Plugin {

  private SharedPreferences getSecurePrefs() throws Exception {
    Context ctx = getContext();
    MasterKey masterKey = new MasterKey.Builder(ctx)
      .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
      .build();

    return EncryptedSharedPreferences.create(
      ctx,
      "CosmosERP.AuthBridge",
      masterKey,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    );
  }

  private JSObject getStoredTokensUnsafe() {
    JSObject res = new JSObject();
    try {
      SharedPreferences prefs = getSecurePrefs();
      res.put("accessToken", prefs.getString("access_token", null));
      res.put("refreshToken", prefs.getString("refresh_token", null));
    } catch (Exception e) {
      res.put("accessToken", null);
      res.put("refreshToken", null);
    }
    return res;
  }

  @PluginMethod
  public void getAccessToken(PluginCall call) {
    JSObject res = getStoredTokensUnsafe();
    call.resolve(res);
  }

  @PluginMethod
  public void storeTokens(PluginCall call) {
    String accessToken = call.getString("accessToken");
    String refreshToken = call.getString("refreshToken");

    if (accessToken == null && refreshToken == null) {
      call.reject("accessToken or refreshToken is required");
      return;
    }

    try {
      SharedPreferences prefs = getSecurePrefs();
      SharedPreferences.Editor editor = prefs.edit();
      if (accessToken != null) editor.putString("access_token", accessToken);
      if (refreshToken != null) editor.putString("refresh_token", refreshToken);
      editor.apply();
      call.resolve(new JSObject().put("ok", true));
    } catch (Exception e) {
      call.reject("Failed to store tokens", e);
    }
  }

  @PluginMethod
  public void clearTokens(PluginCall call) {
    try {
      SharedPreferences prefs = getSecurePrefs();
      prefs.edit().remove("access_token").remove("refresh_token").apply();
      call.resolve(new JSObject().put("ok", true));
    } catch (Exception e) {
      call.reject("Failed to clear tokens", e);
    }
  }

  @PluginMethod
  public void unlockAndGetTokens(PluginCall call) {
    Context ctx = getContext();
    if (getActivity() == null) {
      call.reject("No active activity");
      return;
    }

    JSObject existing = getStoredTokensUnsafe();
    String refresh = existing.getString("refreshToken");
    if (refresh == null || refresh.isEmpty()) {
      call.reject("No stored refresh token");
      return;
    }

    BiometricManager bm = BiometricManager.from(ctx);
    int canAuth = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
    if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
      call.reject("Biometric authentication not available");
      return;
    }

    Executor executor = ContextCompat.getMainExecutor(ctx);
    BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
      @Override
      public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
        JSObject res = getStoredTokensUnsafe();
        call.resolve(res);
      }

      @Override
      public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
        call.reject(String.valueOf(errString));
      }

      @Override
      public void onAuthenticationFailed() {
        call.reject("Authentication failed");
      }
    };

    BiometricPrompt prompt = new BiometricPrompt(getActivity(), executor, callback);
    BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
      .setTitle("Unlock CosmosERP")
      .setSubtitle("Confirm your biometric to continue")
      .setNegativeButtonText("Cancel")
      .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
      .build();

    prompt.authenticate(promptInfo);
  }
}
