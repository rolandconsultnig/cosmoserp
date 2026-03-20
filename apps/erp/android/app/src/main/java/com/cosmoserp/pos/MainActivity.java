package com.cosmoserp.pos;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.navigation.NavigationView;
import com.google.android.material.tabs.TabLayout;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
    
    private TextView totalAmountText, itemCountLabel, subtotalText, vatText, discountDisplay;
    private AutoCompleteTextView customerAutoComplete;
    private MaterialButtonToggleGroup discountToggleGroup;
    private EditText discountInput;
    
    private ApiService apiService;
    private String token;
    private double currentSubtotal = 0;
    private double currentVat = 0;
    private double currentDiscount = 0;
    private double currentTotal = 0;
    
    private TabLayout categoryTabLayout;
    private List<Customer> allCustomers = new ArrayList<>();
    private Customer selectedCustomer;

    private final ActivityResultLauncher<ScanOptions> barcodeLauncher = registerForActivityResult(
            new ScanContract(),
            result -> {
                if (result.getContents() != null) {
                    String scannedCode = result.getContents();
                    boolean found = false;
                    for (Product p : fullProductList) {
                        if ((p.getSku() != null && p.getSku().equals(scannedCode)) ||
                            (p.getId() != null && p.getId().equals(scannedCode))) {
                            onProductClick(p);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        Toast.makeText(this, "Product not found: " + scannedCode, Toast.LENGTH_LONG).show();
                    }
                }
            }
    );

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
        recyclerView.setLayoutManager(new GridLayoutManager(this, 3));

        totalAmountText = findViewById(R.id.totalAmount);
        itemCountLabel = findViewById(R.id.itemCountLabel);
        subtotalText = findViewById(R.id.subtotalText);
        vatText = findViewById(R.id.vatText);
        discountDisplay = findViewById(R.id.discountDisplay);
        categoryTabLayout = findViewById(R.id.categoryTabLayout);
        customerAutoComplete = findViewById(R.id.customerAutoComplete);
        discountToggleGroup = findViewById(R.id.discountToggleGroup);
        discountInput = findViewById(R.id.discountInput);

        adapter = new ProductAdapter(filteredProductList, this);
        recyclerView.setAdapter(adapter);

        setupSearch();
        setupScanner();
        setupDiscountLogic();
        setupNetwork();
        fetchProducts();
        fetchCustomers();

        findViewById(R.id.checkoutButton).setOnClickListener(v -> {
            if (!cartList.isEmpty()) {
                handleCharge();
            } else {
                Toast.makeText(this, "Cart is empty", Toast.LENGTH_SHORT).show();
            }
        });

        View fab = findViewById(R.id.fab);
        if (fab != null) {
            fab.setOnClickListener(v -> showAddCustomProductDialog());
        }
    }

    private void showAddCustomProductDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Add Custom Product");

        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(50, 40, 50, 10);

        final EditText nameInput = new EditText(this);
        nameInput.setHint("Product Name");
        layout.addView(nameInput);

        final EditText priceInput = new EditText(this);
        priceInput.setHint("Price (₦)");
        priceInput.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
        layout.addView(priceInput);

        builder.setView(layout);

        builder.setPositiveButton("Add to Cart", (dialog, which) -> {
            String name = nameInput.getText().toString().trim();
            String priceStr = priceInput.getText().toString().trim();
            if (!name.isEmpty() && !priceStr.isEmpty()) {
                Product newProduct = new Product(name, priceStr);
                // Assign a temporary ID
                try {
                    java.lang.reflect.Field idField = Product.class.getDeclaredField("id");
                    idField.setAccessible(true);
                    idField.set(newProduct, "custom_" + System.currentTimeMillis());
                } catch (Exception e) {}
                
                onProductClick(newProduct);
            } else {
                Toast.makeText(MainActivity.this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
        builder.show();
    }

    private void setupScanner() {
        View scanButton = findViewById(R.id.scanButton);
        if (scanButton != null) {
            scanButton.setOnClickListener(v -> {
                ScanOptions options = new ScanOptions();
                options.setDesiredBarcodeFormats(ScanOptions.ALL_CODE_TYPES);
                options.setPrompt("Scan a barcode or QR code");
                options.setCameraId(0);  // Use a specific camera of the device
                options.setBeepEnabled(true);
                options.setBarcodeImageEnabled(true);
                barcodeLauncher.launch(options);
            });
        }
    }

    private void setupSearch() {
        EditText searchEditText = findViewById(R.id.searchEditText);
        searchEditText.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { filterProducts(s.toString(), categoryTabLayout.getSelectedTabPosition()); }
            @Override public void afterTextChanged(Editable s) { }
        });
    }

    private void setupDiscountLogic() {
        discountToggleGroup.check(R.id.btnPercent);
        discountToggleGroup.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (isChecked) updateCartSummary();
        });

        discountInput.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { updateCartSummary(); }
            @Override public void afterTextChanged(Editable s) {}
        });
    }

    private void setupCategoryTabs() {
        categoryTabLayout.removeAllTabs();
        categoryTabLayout.addTab(categoryTabLayout.newTab().setText("All Products"));

        Set<String> categoryNames = new LinkedHashSet<>();
        for (Product p : fullProductList) {
            if (p.getCategory() != null && p.getCategory().getName() != null) {
                categoryNames.add(p.getCategory().getName());
            }
        }

        for (String name : categoryNames) {
            categoryTabLayout.addTab(categoryTabLayout.newTab().setText(name));
        }

        categoryTabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override public void onTabSelected(TabLayout.Tab tab) { 
                EditText searchEditText = findViewById(R.id.searchEditText);
                filterProducts(searchEditText.getText().toString(), tab.getPosition()); 
            }
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
        updateCartSummary();
        Toast.makeText(this, product.getName() + " added", Toast.LENGTH_SHORT).show();
    }

    private void updateCartSummary() {
        currentSubtotal = 0;
        for (Product p : cartList) {
            currentSubtotal += p.getPrice();
        }

        String discountStr = discountInput.getText().toString();
        double dVal = discountStr.isEmpty() ? 0 : Double.parseDouble(discountStr);
        
        if (discountToggleGroup.getCheckedButtonId() == R.id.btnPercent) {
            currentDiscount = currentSubtotal * (dVal / 100.0);
        } else {
            currentDiscount = dVal;
        }

        double afterDiscount = Math.max(0, currentSubtotal - currentDiscount);
        currentVat = afterDiscount * 0.075;
        currentTotal = afterDiscount + currentVat;

        subtotalText.setText("Subtotal: " + formatNaira(currentSubtotal));
        vatText.setText("VAT (7.5%): " + formatNaira(currentVat));
        discountDisplay.setText("Discount: " + formatNaira(currentDiscount));
        totalAmountText.setText("Total: " + formatNaira(currentTotal));
        itemCountLabel.setText("Items: " + cartList.size());
    }

    private String formatNaira(double amount) {
        return String.format(Locale.getDefault(), "₦%,.2f", amount);
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
            @Override public void onFailure(Call<ProductListResponse> call, Throwable t) { showError("Network Error (Products)"); }
        });
    }

    private void fetchCustomers() {
        apiService.getCustomers(1, 100, "").enqueue(new Callback<CustomerListResponse>() {
            @Override
            public void onResponse(Call<CustomerListResponse> call, Response<CustomerListResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    allCustomers = response.body().getData();
                    List<String> customerNames = new ArrayList<>();
                    for (Customer c : allCustomers) customerNames.add(c.getName());
                    
                    ArrayAdapter<String> custAdapter = new ArrayAdapter<>(MainActivity.this, android.R.layout.simple_dropdown_item_1line, customerNames);
                    customerAutoComplete.setAdapter(custAdapter);
                    customerAutoComplete.setOnItemClickListener((parent, view, position, id) -> {
                        String name = (String) parent.getItemAtPosition(position);
                        for (Customer c : allCustomers) {
                            if (c.getName().equals(name)) {
                                selectedCustomer = c;
                                break;
                            }
                        }
                    });
                }
            }
            @Override public void onFailure(Call<CustomerListResponse> call, Throwable t) { Log.e("POS_MAIN", "Cust Fetch Failed"); }
        });
    }

    private void handleCharge() {
        List<SaleRequest.SaleItem> items = new ArrayList<>();
        for (Product p : cartList) {
            items.add(new SaleRequest.SaleItem(p.getId(), p.getName(), 1, p.getPrice()));
        }

        String receiptNo = "POS-" + new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.getDefault()).format(new Date());
        String discountType = discountToggleGroup.getCheckedButtonId() == R.id.btnPercent ? "percent" : "fixed";

        SaleRequest request = new SaleRequest(
                selectedCustomer != null ? selectedCustomer.getId() : null,
                selectedCustomer != null ? selectedCustomer.getName() : "Walk-in Customer",
                items, "CASH", currentDiscount, discountType, currentSubtotal, currentVat, currentTotal, receiptNo, "POS Sale from Android"
        );

        apiService.createSale(request).enqueue(new Callback<SaleCreateResponse>() {
            @Override
            public void onResponse(Call<SaleCreateResponse> call, Response<SaleCreateResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    showReceiptDialog(response.body().getData().getId(), receiptNo);
                } else {
                    Toast.makeText(MainActivity.this, "Sale failed: " + response.code(), Toast.LENGTH_SHORT).show();
                }
            }
            @Override public void onFailure(Call<SaleCreateResponse> call, Throwable t) { Toast.makeText(MainActivity.this, "Network Error (Sale)", Toast.LENGTH_SHORT).show(); }
        });
    }

    private void showReceiptDialog(String saleId, String receiptNo) {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_receipt_success, null);
        TextView receiptText = view.findViewById(R.id.receiptNumberText);
        receiptText.setText("Receipt #" + receiptNo);

        AlertDialog dialog = new AlertDialog.Builder(this).setView(view).setCancelable(false).create();

        view.findViewById(R.id.btnEmailReceipt).setOnClickListener(v -> sendDigitalReceipt(saleId, true, false));
        view.findViewById(R.id.btnWhatsappReceipt).setOnClickListener(v -> sendDigitalReceipt(saleId, false, true));
        view.findViewById(R.id.btnPrintReceipt).setOnClickListener(v -> Toast.makeText(this, "Printing...", Toast.LENGTH_SHORT).show());
        view.findViewById(R.id.btnNewSale).setOnClickListener(v -> {
            clearCart();
            dialog.dismiss();
        });

        dialog.show();
    }

    private void sendDigitalReceipt(String saleId, boolean email, boolean whatsapp) {
        apiService.sendReceipt(saleId, new ReceiptActionRequest(email, whatsapp)).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) Toast.makeText(MainActivity.this, "Receipt Sent!", Toast.LENGTH_SHORT).show();
            }
            @Override public void onFailure(Call<Void> call, Throwable t) {}
        });
    }

    private void clearCart() {
        cartList.clear();
        discountInput.setText("");
        customerAutoComplete.setText("");
        selectedCustomer = null;
        updateCartSummary();
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

    @Override public void onBackPressed() {
        if (drawer.isDrawerOpen(GravityCompat.START)) drawer.closeDrawer(GravityCompat.START);
        else super.onBackPressed();
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
