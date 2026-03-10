package com.cosmoserp.pos;

import com.google.gson.annotations.SerializedName;
import java.util.List;
import java.util.Locale;

public class Product {
    private String id;
    private String name;
    private String sku;
    private String description;
    @SerializedName("sellingPrice")
    private double price;
    private String currency;
    private Category category;
    private int reorderPoint;

    // This will be calculated from stockLevels
    private transient int totalStock;

    @SerializedName("stockLevels")
    private List<StockLevel> stockLevels;

    // Constructor for mock data
    public Product(String name, String priceStr) {
        this.name = name;
        try {
            this.price = Double.parseDouble(priceStr.replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            this.price = 0.0;
        }
        this.currency = "NGN";
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getSku() { return sku; }
    public String getDescription() { return description; }
    public double getPrice() { return price; }
    public String getCurrency() { return currency; }
    public Category getCategory() { return category; }
    public int getReorderPoint() { return reorderPoint; }

    public int getTotalStock() {
        if (stockLevels == null) return 0;
        int sum = 0;
        for (StockLevel level : stockLevels) {
            sum += level.getQuantity();
        }
        return sum;
    }

    public String getFormattedPrice() {
        String symbol = "₦";
        if ("USD".equals(currency)) symbol = "$";
        return symbol + String.format(Locale.getDefault(), "%,.2f", price);
    }

    // Inner class for stock levels from API
    public static class StockLevel {
        private int quantity;
        private String warehouseId;

        public int getQuantity() {
            return quantity;
        }
    }
}
