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
import androidx.recyclerview.widget.GridLayoutManager;
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

public class MainActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener, ProductAdapter.OnProductClickListener {
    
    private RecyclerView recyclerView;
    private ProductAdapter adapter;
    private List<Product> productList;
    private List<Product> cartList = new ArrayList<>();
    private DrawerLayout drawer;
    private TextView totalAmountText;
    private TextView cartItemsCountText;
    private ApiService apiService;
    private String token;
    private double currentTotal = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
        token = prefs.getString("access_token", null);

        if (token == null) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        drawer = findViewById(R.id.drawer_layout);
        NavigationView navigationView = findViewById(R.id.nav_view);
        navigationView.setNavigationItemSelectedListener(this);

        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.addDrawerListener(toggle);
        toggle.syncState();

        recyclerView = findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new GridLayoutManager(this, 2));

        totalAmountText = findViewById(R.id.totalAmount);
        cartItemsCountText = findViewById(R.id.cartSummary).findViewById(android.R.id.text1); // Adjusted based on generic layout
        // In actual layout activity_main.xml, finding the text in cartSummary card
        // Need to update the cart summary section in activity_main.xml to have proper IDs

        productList = new ArrayList<>();
        adapter = new ProductAdapter(productList, this);
        recyclerView.setAdapter(adapter);

        setupNetwork();
        fetchProducts();

        findViewById(R.id.checkoutButton).setOnClickListener(v -> {
            if (cartList.isEmpty()) {
                Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Processing payment of " + formatNaira(currentTotal), Toast.LENGTH_LONG).show();
                clearCart();
            }
        });

        findViewById(R.id.scanButton).setOnClickListener(v -> 
                Toast.makeText(MainActivity.this, "Opening Barcode Scanner...", Toast.LENGTH_SHORT).show());
    }

    private void setupNetwork() {
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

    @Override
    public void onProductClick(Product product) {
        cartList.add(product);
        currentTotal += product.getPrice();
        updateCartSummary();
        Toast.makeText(this, product.getName() + " added to cart", Toast.LENGTH_SHORT).show();
    }

    private void updateCartSummary() {
        totalAmountText.setText("Total: " + formatNaira(currentTotal));
        // Note: In activity_main.xml, we'll ensure IDs are set for the items count text
        TextView countText = findViewById(R.id.cartSummary).findViewWithTag("item_count_text");
        if (countText != null) {
            countText.setText("Items in Cart: " + cartList.size());
        }
    }

    private void clearCart() {
        cartList.clear();
        currentTotal = 0;
        updateCartSummary();
    }

    private String formatNaira(double amount) {
        return "₦" + String.format(Locale.getDefault(), "%,.2f", amount);
    }

    private void fetchProducts() {
        apiService.getProducts(1, 50, "").enqueue(new Callback<ProductListResponse>() {
            @Override
            public void onResponse(Call<ProductListResponse> call, Response<ProductListResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    productList.clear();
                    productList.addAll(response.body().getData());
                    adapter.notifyDataSetChanged();
                } else if (response.code() == 401) {
                    logout();
                }
            }

            @Override
            public void onFailure(Call<ProductListResponse> call, Throwable t) {
                showError("Network Error: " + t.getMessage());
            }
        });
    }

    private void logout() {
        SharedPreferences prefs = getSharedPreferences("CosmosPOS", Context.MODE_PRIVATE);
        prefs.edit().remove("access_token").apply();
        startActivity(new Intent(this, LoginActivity.class));
        finish();
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        Log.e("POS_MAIN", message);
    }

    @Override
    public void onBackPressed() {
        if (drawer.isDrawerOpen(GravityCompat.START)) {
            drawer.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.nav_logout) {
            logout();
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
}
