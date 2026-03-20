package com.cosmoserp.pos;

public class Quote {
    private String id;
    private String quoteNumber;
    private String customerName;
    private double totalAmount;
    private String status;
    private String issueDate;

    public String getId() { return id; }
    public String getQuoteNumber() { return quoteNumber; }
    public String getCustomerName() { return customerName; }
    public double getTotalAmount() { return totalAmount; }
    public String getStatus() { return status; }
    public String getIssueDate() { return issueDate; }
}
