package com.cosmoserp.pos;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.getcapacitor.BridgeActivity;
import com.google.android.material.navigation.NavigationView;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity implements NavigationView.OnNavigationItemSelectedListener {
    
    private RecyclerView recyclerView;
    private ProductAdapter adapter;
    private List<Product> productList;
    private DrawerLayout drawer;
    private TextView totalAmountText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

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
        // Using GridLayout for a POS feel (2 columns)
        recyclerView.setLayoutManager(new GridLayoutManager(this, 2));

        totalAmountText = findViewById(R.id.totalAmount);

        // Mock data for POS interface
        productList = new ArrayList<>();
        productList.add(new Product("Burger Combo", "$12.00"));
        productList.add(new Product("Pizza Large", "$18.50"));
        productList.add(new Product("Soda 500ml", "$2.50"));
        productList.add(new Product("French Fries", "$4.00"));
        productList.add(new Product("Ice Cream", "$3.00"));
        productList.add(new Product("Coffee", "$2.75"));

        adapter = new ProductAdapter(productList);
        recyclerView.setAdapter(adapter);

        findViewById(R.id.checkoutButton).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Toast.makeText(MainActivity.this, "Proceeding to Payment...", Toast.LENGTH_SHORT).show();
            }
        });

        findViewById(R.id.scanButton).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Toast.makeText(MainActivity.this, "Opening Scanner...", Toast.LENGTH_SHORT).show();
            }
        });
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
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
            finish();
        } else {
            Toast.makeText(this, item.getTitle() + " selected", Toast.LENGTH_SHORT).show();
        }

        drawer.closeDrawer(GravityCompat.START);
        return true;
    }
}
