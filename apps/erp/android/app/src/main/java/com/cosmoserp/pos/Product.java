package com.cosmoserp.pos;

import com.google.gson.annotations.SerializedName;
import java.util.Locale;

public class Product {
    private String id;
    private String name;
    private String sku;
    private String description;
    @SerializedName("sellingPrice")
    private double price;
    private String currency;

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

    public String getFormattedPrice() {
        String symbol = "₦";
        if ("USD".equals(currency)) symbol = "$";
        return symbol + String.format(Locale.getDefault(), "%,.2f", price);
    }
}
