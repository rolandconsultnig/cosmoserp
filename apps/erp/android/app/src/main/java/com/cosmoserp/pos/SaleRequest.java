package com.cosmoserp.pos;

import java.util.List;

public class SaleRequest {
    private String customerId;
    private String customerName;
    private List<SaleItem> items;
    private String paymentMethod;
    private double discountAmount;
    private String discountType;
    private double subtotal;
    private double vatAmount;
    private double totalAmount;
    private String receiptNo;
    private String notes;

    public SaleRequest(String customerId, String customerName, List<SaleItem> items, String paymentMethod, 
                       double discountAmount, String discountType, double subtotal, double vatAmount, 
                       double totalAmount, String receiptNo, String notes) {
        this.customerId = customerId;
        this.customerName = customerName;
        this.items = items;
        this.paymentMethod = paymentMethod;
        this.discountAmount = discountAmount;
        this.discountType = discountType;
        this.subtotal = subtotal;
        this.vatAmount = vatAmount;
        this.totalAmount = totalAmount;
        this.receiptNo = receiptNo;
        this.notes = notes;
    }

    public static class SaleItem {
        private String productId;
        private String name;
        private int qty;
        private double unitPrice;

        public SaleItem(String productId, String name, int qty, double unitPrice) {
            this.productId = productId;
            this.name = name;
            this.qty = qty;
            this.unitPrice = unitPrice;
        }
    }
}
