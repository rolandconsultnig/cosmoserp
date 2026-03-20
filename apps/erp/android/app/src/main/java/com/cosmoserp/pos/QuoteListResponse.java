package com.cosmoserp.pos;

import java.util.List;

public class QuoteListResponse {
    private List<Quote> data;
    private int total;

    public List<Quote> getData() { return data; }
    public int getTotal() { return total; }
}
