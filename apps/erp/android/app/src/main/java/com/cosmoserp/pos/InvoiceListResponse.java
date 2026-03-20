package com.cosmoserp.pos;

import java.util.List;

public class InvoiceListResponse {
    private List<Invoice> data;
    private int total;

    public List<Invoice> getData() { return data; }
    public int getTotal() { return total; }
}
