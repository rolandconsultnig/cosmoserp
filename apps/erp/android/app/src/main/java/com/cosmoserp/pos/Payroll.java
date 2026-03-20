package com.cosmoserp.pos;

public class Payroll {
    private String id;
    private String period;
    private double totalGross;
    private double totalNet;
    private String status;

    public String getId() { return id; }
    public String getPeriod() { return period; }
    public double getTotalGross() { return totalGross; }
    public double getTotalNet() { return totalNet; }
    public String getStatus() { return status; }
}
