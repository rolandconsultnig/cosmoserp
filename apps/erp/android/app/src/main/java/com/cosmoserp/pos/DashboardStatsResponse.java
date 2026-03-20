package com.cosmoserp.pos;

public class DashboardStatsResponse {
    private Data data;

    public Data getData() { return data; }

    public static class Data {
        private PeriodStats today;
        private PeriodStats month;

        public PeriodStats getToday() { return today; }
        public PeriodStats getMonth() { return month; }
    }

    public static class PeriodStats {
        private int sales;
        private double revenue;

        public int getSales() { return sales; }
        public double getRevenue() { return revenue; }
    }
}
