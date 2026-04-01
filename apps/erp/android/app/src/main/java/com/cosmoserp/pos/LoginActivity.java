package com.cosmoserp.pos;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.content.ContextCompat;
import com.google.android.material.textfield.TextInputEditText;
import java.util.concurrent.Executor;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class LoginActivity extends AppCompatActivity {

    private TextInputEditText emailEditText;
    private TextInputEditText passwordEditText;
    private Button loginButton;
    private Button biometricLoginButton;
    private TextView forgotPasswordLink;
    private TextView createAccountLink;
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Handle the splash screen transition.
        SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        emailEditText = findViewById(R.id.emailEditText);
        passwordEditText = findViewById(R.id.passwordEditText);
        loginButton = findViewById(R.id.loginButton);
        biometricLoginButton = findViewById(R.id.biometricLoginButton);
        forgotPasswordLink = findViewById(R.id.forgotPasswordLink);
        createAccountLink = findViewById(R.id.createAccountLink);

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(NetworkConfig.BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);

        loginButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                performLogin();
            }
        });

        biometricLoginButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                performBiometricLogin();
            }
        });

        forgotPasswordLink.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openUrl(NetworkConfig.ERP_WEB_URL + "/forgot-password");
            }
        });

        createAccountLink.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openUrl(NetworkConfig.ERP_WEB_URL + "/register");
            }
        });
        
        // Auto-login check
        SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
        if (prefs.getString("access_token", null) != null) {
            startActivity(new Intent(this, DashboardActivity.class));
            finish();
            return;
        }

        biometricLoginButton.setEnabled(prefs.getString("refresh_token", null) != null);
    }

    private void openUrl(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Could not open link", Toast.LENGTH_LONG).show();
        }
    }

    private void performLogin() {
        String email = emailEditText.getText().toString();
        String password = passwordEditText.getText().toString();

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please enter credentials", Toast.LENGTH_SHORT).show();
            return;
        }

        loginButton.setEnabled(false);
        
        LoginRequest loginRequest = new LoginRequest(email, password);
        apiService.login(loginRequest).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                loginButton.setEnabled(true);
                if (response.isSuccessful() && response.body() != null) {
                    // Save Token
                    SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
                    prefs.edit().putString("access_token", response.body().getAccessToken()).apply();
                    if (response.body().getRefreshToken() != null) {
                        prefs.edit().putString("refresh_token", response.body().getRefreshToken()).apply();
                    }

                    Intent intent = new Intent(LoginActivity.this, DashboardActivity.class);
                    startActivity(intent);
                    finish();
                } else {
                    String errorMsg = "Login Failed";
                    try {
                        if (response.errorBody() != null) {
                            errorMsg = response.errorBody().string();
                        }
                    } catch (Exception e) { /* ignore */ }
                    Toast.makeText(LoginActivity.this, errorMsg, Toast.LENGTH_LONG).show();
                    Log.e("POS_LOGIN", "Error: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<LoginResponse> call, Throwable t) {
                loginButton.setEnabled(true);
                Toast.makeText(LoginActivity.this, "Network Error: " + t.getMessage(), Toast.LENGTH_LONG).show();
                Log.e("POS_LOGIN", "Failure", t);
            }
        });
    }

    private void performBiometricLogin() {
        SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
        String refreshToken = prefs.getString("refresh_token", null);
        if (refreshToken == null) {
            Toast.makeText(this, "No saved session. Please login once with password.", Toast.LENGTH_LONG).show();
            return;
        }

        BiometricManager bm = BiometricManager.from(this);
        int canAuth = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            Toast.makeText(this, "Biometric authentication not available", Toast.LENGTH_LONG).show();
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                refreshAccessToken(refreshToken);
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                Toast.makeText(LoginActivity.this, String.valueOf(errString), Toast.LENGTH_LONG).show();
            }

            @Override
            public void onAuthenticationFailed() {
                Toast.makeText(LoginActivity.this, "Authentication failed", Toast.LENGTH_LONG).show();
            }
        };

        BiometricPrompt prompt = new BiometricPrompt(this, executor, callback);
        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock CosmosERP POS")
                .setSubtitle("Confirm your fingerprint to continue")
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build();

        prompt.authenticate(promptInfo);
    }

    private void refreshAccessToken(String refreshToken) {
        biometricLoginButton.setEnabled(false);
        apiService.refresh(new RefreshRequest(refreshToken)).enqueue(new Callback<RefreshResponse>() {
            @Override
            public void onResponse(Call<RefreshResponse> call, Response<RefreshResponse> response) {
                biometricLoginButton.setEnabled(true);
                if (response.isSuccessful() && response.body() != null && response.body().getAccessToken() != null) {
                    SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
                    prefs.edit().putString("access_token", response.body().getAccessToken()).apply();

                    Intent intent = new Intent(LoginActivity.this, DashboardActivity.class);
                    startActivity(intent);
                    finish();
                } else {
                    Toast.makeText(LoginActivity.this, "Session expired. Please login again.", Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<RefreshResponse> call, Throwable t) {
                biometricLoginButton.setEnabled(true);
                Toast.makeText(LoginActivity.this, "Network Error: " + t.getMessage(), Toast.LENGTH_LONG).show();
                Log.e("POS_LOGIN", "Refresh Failure", t);
            }
        });
    }
}
