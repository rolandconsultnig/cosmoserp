package com.cosmoserp.pos;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.MenuItem;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.navigation.NavigationView;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class DashboardActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener {

    private DrawerLayout drawer;
    private TextView todayRevenueText, monthRevenueText;
    private RecyclerView recentSalesRecyclerView;
    private OrdersAdapter adapter;
    private List<SalesResponse.Sale> salesList = new ArrayList<>();
    private ApiService apiService;
    private String token;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
        token = prefs.getString("access_token", null);

        if (token == null) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle("Cosmos ERP");

        drawer = findViewById(R.id.drawer_layout);
        NavigationView navigationView = findViewById(R.id.nav_view);
        navigationView.setNavigationItemSelectedListener(this);

        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.addDrawerListener(toggle);
        toggle.syncState();

        todayRevenueText = findViewById(R.id.todayRevenueText);
        monthRevenueText = findViewById(R.id.monthRevenueText);
        recentSalesRecyclerView = findViewById(R.id.recentSalesRecyclerView);

        recentSalesRecyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new OrdersAdapter(salesList);
        recentSalesRecyclerView.setAdapter(adapter);

        setupNetwork();
        setupQuickActions();
        fetchDashboardData();
    }

    private void setupNetwork() {
        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    Request newRequest = chain.request().newBuilder().addHeader("Authorization", "Bearer " + token).build();
                    return chain.proceed(newRequest);
                }).build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(NetworkConfig.BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        apiService = retrofit.create(ApiService.class);
    }

    private void setupQuickActions() {
        findViewById(R.id.btnNewSale).setOnClickListener(v -> startActivity(new Intent(this, PosWebActivity.class)));
        findViewById(R.id.btnAddCustomer).setOnClickListener(v -> startActivity(new Intent(this, CustomerManagementActivity.class)));
        findViewById(R.id.btnInventory).setOnClickListener(v -> startActivity(new Intent(this, InventoryAdjustmentActivity.class)));
        findViewById(R.id.btnReports).setOnClickListener(v -> startActivity(new Intent(this, EndOfDayActivity.class)));
    }

    private void fetchDashboardData() {
        // Fetch Stats
        apiService.getStats().enqueue(new Callback<DashboardStatsResponse>() {
            @Override
            public void onResponse(Call<DashboardStatsResponse> call, Response<DashboardStatsResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    DashboardStatsResponse.Data data = response.body().getData();
                    todayRevenueText.setText(formatNaira(data.getToday().getRevenue()));
                    monthRevenueText.setText(formatNaira(data.getMonth().getRevenue()));
                }
            }
            @Override public void onFailure(Call<DashboardStatsResponse> call, Throwable t) { Log.e("Dashboard", "Stats fail", t); }
        });

        // Fetch Recent Sales
        apiService.getRecentSales(1, 5).enqueue(new Callback<SalesResponse>() {
            @Override
            public void onResponse(Call<SalesResponse> call, Response<SalesResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    salesList.clear();
                    salesList.addAll(response.body().getData());
                    adapter.notifyDataSetChanged();
                }
            }
            @Override public void onFailure(Call<SalesResponse> call, Throwable t) { Log.e("Dashboard", "Sales fail", t); }
        });
    }

    private String formatNaira(double amount) {
        return String.format(Locale.getDefault(), "₦%,.2f", amount);
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.nav_logout) {
            SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
            prefs.edit().remove("access_token").apply();
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        } else if (id == R.id.nav_pos) {
            startActivity(new Intent(this, PosWebActivity.class));
        } else if (id == R.id.nav_orders) {
            startActivity(new Intent(this, RecentOrdersActivity.class));
        } else if (id == R.id.nav_inventory) {
            startActivity(new Intent(this, InventoryAdjustmentActivity.class));
        } else if (id == R.id.nav_customers) {
            startActivity(new Intent(this, CustomerManagementActivity.class));
        } else if (id == R.id.nav_end_of_day) {
            startActivity(new Intent(this, EndOfDayActivity.class));
        }
        drawer.closeDrawer(GravityCompat.START);
        return true;
    }

    @Override
    public void onBackPressed() {
        if (drawer.isDrawerOpen(GravityCompat.START)) drawer.closeDrawer(GravityCompat.START);
        else super.onBackPressed();
    }
}
