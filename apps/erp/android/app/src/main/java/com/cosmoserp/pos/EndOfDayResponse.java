package com.cosmoserp.pos;

import java.util.List;

public class EndOfDayResponse {
    private Data data;

    public Data getData() { return data; }

    public static class Data {
        private String date;
        private Summary completed;
        private Summary voided;
        private List<PaymentBreakdown> paymentBreakdown;

        public String getDate() { return date; }
        public Summary getCompleted() { return completed; }
        public Summary getVoided() { return voided; }
        public List<PaymentBreakdown> getPaymentBreakdown() { return paymentBreakdown; }
    }

    public static class Summary {
        private int count;
        private double total;
        private double discounts;
        private double vat;

        public int getCount() { return count; }
        public double getTotal() { return total; }
        public double getDiscounts() { return discounts; }
        public double getVat() { return vat; }
    }

    public static class PaymentBreakdown {
        private String method;
        private int count;
        private double total;

        public String getMethod() { return method; }
        public int getCount() { return count; }
        public double getTotal() { return total; }
    }
}
