package com.cosmoserp.pos;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import java.util.ArrayList;
import java.util.List;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class CustomerManagementActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private CustomersAdapter adapter;
    private List<Customer> customerList = new ArrayList<>();
    private ApiService apiService;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_customer_management);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle("Customer Management");
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);

        recyclerView = findViewById(R.id.customersRecyclerView);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new CustomersAdapter(customerList);
        recyclerView.setAdapter(adapter);

        setupNetwork();
        fetchCustomers();

        FloatingActionButton fab = findViewById(R.id.addCustomerFab);
        fab.setOnClickListener(v -> showAddCustomerDialog());
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

    private void fetchCustomers() {
        apiService.getCustomers(1, 100, "").enqueue(new Callback<CustomerListResponse>() {
            @Override
            public void onResponse(Call<CustomerListResponse> call, Response<CustomerListResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    customerList.clear();
                    customerList.addAll(response.body().getData());
                    adapter.notifyDataSetChanged();
                }
            }

            @Override
            public void onFailure(Call<CustomerListResponse> call, Throwable t) {
                Toast.makeText(CustomerManagementActivity.this, "Network Error", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showAddCustomerDialog() {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_add_customer, null);
        EditText nameInput = view.findViewById(R.id.edit_customer_name);
        EditText emailInput = view.findViewById(R.id.edit_customer_email);
        EditText phoneInput = view.findViewById(R.id.edit_customer_phone);

        new AlertDialog.Builder(this)
                .setTitle("Add New Customer")
                .setView(view)
                .setPositiveButton("Add", (dialog, which) -> {
                    String name = nameInput.getText().toString();
                    String email = emailInput.getText().toString();
                    String phone = phoneInput.getText().toString();
                    if (!name.isEmpty()) {
                        createCustomer(new Customer(name, email, phone));
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void createCustomer(Customer customer) {
        apiService.createCustomer(customer).enqueue(new Callback<CustomerResponse>() {
            @Override
            public void onResponse(Call<CustomerResponse> call, Response<CustomerResponse> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(CustomerManagementActivity.this, "Customer Added", Toast.LENGTH_SHORT).show();
                    fetchCustomers();
                }
            }

            @Override
            public void onFailure(Call<CustomerResponse> call, Throwable t) {
                Toast.makeText(CustomerManagementActivity.this, "Error adding customer", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}
