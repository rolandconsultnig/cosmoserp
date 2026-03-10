package com.cosmoserp.pos;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.MenuItem;
import android.widget.EditText;
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
import com.google.android.material.tabs.TabLayout;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class MainActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener, ProductAdapter.OnProductClickListener {
    
    private RecyclerView recyclerView;
    private ProductAdapter adapter;
    private List<Product> fullProductList = new ArrayList<>();
    private List<Product> filteredProductList = new ArrayList<>();
    private List<Product> cartList = new ArrayList<>();
    private DrawerLayout drawer;
    private TextView totalAmountText, itemCountLabel;
    private ApiService apiService;
    private String token;
    private double currentTotal = 0;
    private TabLayout categoryTabLayout;

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

        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close);
        drawer.addDrawerListener(toggle);
        toggle.syncState();

        recyclerView = findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new GridLayoutManager(this, 3)); // Increased grid size

        totalAmountText = findViewById(R.id.totalAmount);
        itemCountLabel = findViewById(R.id.itemCountLabel);
        categoryTabLayout = findViewById(R.id.categoryTabLayout);

        adapter = new ProductAdapter(filteredProductList, this);
        recyclerView.setAdapter(adapter);

        setupSearch();
        setupNetwork();
        fetchProducts();

        findViewById(R.id.checkoutButton).setOnClickListener(v -> {
            if (!cartList.isEmpty()) {
                // Logic for payment method selection will go here
                Toast.makeText(this, "Proceeding to Payment...", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupSearch() {
        EditText searchEditText = findViewById(R.id.searchEditText);
        searchEditText.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { filterProducts(s.toString(), categoryTabLayout.getSelectedTabPosition()); }
            @Override public void afterTextChanged(Editable s) { }
        });
    }

    private void setupCategoryTabs() {
        categoryTabLayout.removeAllTabs();
        categoryTabLayout.addTab(categoryTabLayout.newTab().setText("All Products"));

        Set<Category> categories = new LinkedHashSet<>();
        for (Product p : fullProductList) {
            if (p.getCategory() != null) {
                categories.add(p.getCategory());
            }
        }

        for (Category c : categories) {
            categoryTabLayout.addTab(categoryTabLayout.newTab().setText(c.getName()));
        }

        categoryTabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override public void onTabSelected(TabLayout.Tab tab) { filterProducts(((EditText)findViewById(R.id.searchEditText)).getText().toString(), tab.getPosition()); }
            @Override public void onTabUnselected(TabLayout.Tab tab) { }
            @Override public void onTabReselected(TabLayout.Tab tab) { }
        });
    }

    private void filterProducts(String query, int tabPosition) {
        filteredProductList.clear();
        String selectedCategoryName = tabPosition == 0 ? null : categoryTabLayout.getTabAt(tabPosition).getText().toString();

        for (Product p : fullProductList) {
            boolean matchesCategory = selectedCategoryName == null || (p.getCategory() != null && p.getCategory().getName().equalsIgnoreCase(selectedCategoryName));
            boolean matchesQuery = p.getName().toLowerCase().contains(query.toLowerCase());

            if (matchesCategory && matchesQuery) {
                filteredProductList.add(p);
            }
        }
        adapter.notifyDataSetChanged();
    }

    private void setupNetwork() {
        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    Request newRequest = chain.request().newBuilder().addHeader("Authorization", "Bearer " + token).build();
                    return chain.proceed(newRequest);
                }).build();

        Retrofit retrofit = new Retrofit.Builder().baseUrl(NetworkConfig.BASE_URL).client(client).addConverterFactory(GsonConverterFactory.create()).build();
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
        itemCountLabel.setText("Items in Cart: " + cartList.size());
    }

    private String formatNaira(double amount) {
        return "₦" + String.format(Locale.getDefault(), "%,.2f", amount);
    }

    private void fetchProducts() {
        apiService.getProducts(1, 200, "").enqueue(new Callback<ProductListResponse>() {
            @Override
            public void onResponse(Call<ProductListResponse> call, Response<ProductListResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    fullProductList.clear();
                    fullProductList.addAll(response.body().getData());
                    setupCategoryTabs();
                    filterProducts("", 0);
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
        if (id == R.id.nav_logout) logout();
        else if (id == R.id.nav_orders) startActivity(new Intent(this, RecentOrdersActivity.class));
        else if (id == R.id.nav_inventory) startActivity(new Intent(this, InventoryAdjustmentActivity.class));
        else if (id == R.id.nav_customers) startActivity(new Intent(this, CustomerManagementActivity.class));
        else if (id == R.id.nav_end_of_day) startActivity(new Intent(this, EndOfDayActivity.class));
        drawer.closeDrawer(GravityCompat.START);
        return true;
    }
}
