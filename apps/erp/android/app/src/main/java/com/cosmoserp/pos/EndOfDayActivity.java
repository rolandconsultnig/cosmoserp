package com.cosmoserp.pos;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class EndOfDayActivity extends AppCompatActivity {

    private TextView summaryDate, salesCount, grossRevenue, totalDiscounts;
    private LinearLayout paymentBreakdownContainer;
    private ProgressBar progressBar;
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_end_of_day);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle("End of Day Summary");
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);

        summaryDate = findViewById(R.id.summaryDate);
        salesCount = findViewById(R.id.salesCount);
        grossRevenue = findViewById(R.id.grossRevenue);
        totalDiscounts = findViewById(R.id.totalDiscounts);
        paymentBreakdownContainer = findViewById(R.id.paymentBreakdownContainer);
        progressBar = findViewById(R.id.progressBar);

        setupNetwork();
        fetchEndOfDayData();
        
        findViewById(R.id.printZReport).setOnClickListener(v -> 
            Toast.makeText(this, "Generating Z-Report PDF...", Toast.LENGTH_SHORT).show());
    }

    private void setupNetwork() {
        SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
        String token = prefs.getString("access_token", null);

        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    Request newRequest = chain.request().newBuilder()
                            .addHeader("Authorization", "Bearer " + token)
                            .build();
                    return chain.proceed(newRequest);
                })
                .build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(NetworkConfig.BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        apiService = retrofit.create(ApiService.class);
    }

    private void fetchEndOfDayData() {
        progressBar.setVisibility(View.VISIBLE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
        
        apiService.getEndOfDay(today).enqueue(new Callback<EndOfDayResponse>() {
            @Override
            public void onResponse(Call<EndOfDayResponse> call, Response<EndOfDayResponse> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    updateUI(response.body().getData());
                } else {
                    Toast.makeText(EndOfDayActivity.this, "Failed to load summary", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<EndOfDayResponse> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                Toast.makeText(EndOfDayActivity.this, "Network Error", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void updateUI(EndOfDayResponse.Data data) {
        summaryDate.setText("Date: " + data.getDate());
        salesCount.setText(String.valueOf(data.getCompleted().getCount()));
        grossRevenue.setText(String.format("$%.2f", data.getCompleted().getTotal()));
        totalDiscounts.setText(String.format("$%.2f", data.getCompleted().getDiscounts()));

        paymentBreakdownContainer.removeAllViews();
        for (EndOfDayResponse.PaymentBreakdown item : data.getPaymentBreakdown()) {
            TextView row = new TextView(this);
            row.setText(item.getMethod() + ": " + String.format("$%.2f", item.getTotal()) + " (" + item.getCount() + " sales)");
            row.setPadding(0, 8, 0, 8);
            paymentBreakdownContainer.addView(row);
        }
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}
