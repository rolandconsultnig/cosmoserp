package com.cosmoserp.pos;

import java.util.List;

public class SalesResponse {
    private List<Sale> data;
    private int total;
    private int page;
    private int limit;

    public List<Sale> getData() { return data; }
    public int getTotal() { return total; }

    public static class Sale {
        private String id;
        private String receiptNumber;
        private double totalAmount;
        private String status;
        private String createdAt;
        private String customerName;

        public String getId() { return id; }
        public String getReceiptNumber() { return receiptNumber; }
        public double getTotalAmount() { return totalAmount; }
        public String getStatus() { return status; }
        public String getCreatedAt() { return createdAt; }
        public String getCustomerName() { return customerName; }
    }
}
