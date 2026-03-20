package com.cosmoserp.pos;

public class SaleCreateResponse {
    private Data data;

    public Data getData() { return data; }

    public static class Data {
        private String id;
        public String getId() { return id; }
    }
}
