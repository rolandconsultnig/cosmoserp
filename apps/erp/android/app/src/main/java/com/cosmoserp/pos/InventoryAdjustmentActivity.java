package com.cosmoserp.pos;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import com.google.android.material.textfield.TextInputEditText;
import java.util.ArrayList;
import java.util.List;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class InventoryAdjustmentActivity extends AppCompatActivity {

    private AutoCompleteTextView productSelector;
    private TextInputEditText quantityEditText;
    private TextInputEditText notesEditText;
    private Button submitButton;
    private ApiService apiService;
    private List<Product> productList = new ArrayList<>();
    private Product selectedProduct;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_inventory_adjustment);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle("Inventory Adjustment");
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);

        productSelector = findViewById(R.id.productSelector);
        quantityEditText = findViewById(R.id.quantityEditText);
        notesEditText = findViewById(R.id.notesEditText);
        submitButton = findViewById(R.id.submitAdjustmentButton);

        setupNetwork();
        fetchProducts();

        submitButton.setOnClickListener(v -> performAdjustment());
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

    private void fetchProducts() {
        apiService.getProducts(1, 100, "").enqueue(new Callback<ProductListResponse>() {
            @Override
            public void onResponse(Call<ProductListResponse> call, Response<ProductListResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    productList = response.body().getData();
                    List<String> names = new ArrayList<>();
                    for (Product p : productList) names.add(p.getName());
                    
                    ArrayAdapter<String> adapter = new ArrayAdapter<>(InventoryAdjustmentActivity.this,
                            android.R.layout.simple_dropdown_item_1line, names);
                    productSelector.setAdapter(adapter);
                    productSelector.setOnItemClickListener((parent, view, position, id) -> {
                        selectedProduct = productList.get(position);
                    });
                }
            }

            @Override
            public void onFailure(Call<ProductListResponse> call, Throwable t) {
                Toast.makeText(InventoryAdjustmentActivity.this, "Failed to load products", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void performAdjustment() {
        if (selectedProduct == null) {
            Toast.makeText(this, "Please select a product", Toast.LENGTH_SHORT).show();
            return;
        }

        String qtyStr = quantityEditText.getText().toString();
        if (qtyStr.isEmpty()) {
            Toast.makeText(this, "Please enter quantity", Toast.LENGTH_SHORT).show();
            return;
        }

        int quantity = Integer.parseInt(qtyStr);
        String notes = notesEditText.getText().toString();

        // Note: You might need a valid warehouseId from your backend.
        // For now, we'll use a placeholder or let the backend use the default.
        StockAdjustRequest request = new StockAdjustRequest(null, quantity, "ADJUSTMENT", notes);

        submitButton.setEnabled(false);
        apiService.adjustStock(selectedProduct.getId(), request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                submitButton.setEnabled(true);
                if (response.isSuccessful()) {
                    Toast.makeText(InventoryAdjustmentActivity.this, "Stock Adjusted Successfully!", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    Toast.makeText(InventoryAdjustmentActivity.this, "Adjustment failed: " + response.code(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                submitButton.setEnabled(true);
                Toast.makeText(InventoryAdjustmentActivity.this, "Network Error", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}
