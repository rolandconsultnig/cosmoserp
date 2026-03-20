package com.cosmoserp.pos;

public class Invoice {
    private String id;
    private String invoiceNumber;
    private String customerName;
    private double totalAmount;
    private String status;
    private String issueDate;

    public String getId() { return id; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public String getCustomerName() { return customerName; }
    public double getTotalAmount() { return totalAmount; }
    public String getStatus() { return status; }
    public String getIssueDate() { return issueDate; }
}
