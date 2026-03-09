package com.cosmoserp.pos;

import com.google.gson.annotations.SerializedName;

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
            this.price = Double.parseDouble(priceStr.replace("$", "").replace(",", ""));
        } catch (Exception e) {
            this.price = 0.0;
        }
        this.currency = "USD";
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getSku() { return sku; }
    public String getDescription() { return description; }
    public double getPrice() { return price; }
    public String getCurrency() { return currency; }

    public String getFormattedPrice() {
        return (currency != null ? currency : "$") + " " + String.format("%.2f", price);
    }
}
