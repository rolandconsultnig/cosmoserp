package com.cosmoserp.pos;

import java.util.List;

public class ProductListResponse {
    private List<Product> data;
    private Pagination pagination;

    public List<Product> getData() {
        return data;
    }

    public Pagination getPagination() {
        return pagination;
    }

    public static class Pagination {
        private int total;
        private int page;
        private int limit;
        private int totalPages;
        private boolean hasMore;

        public int getTotal() { return total; }
        public int getPage() { return page; }
        public int getLimit() { return limit; }
        public int getTotalPages() { return totalPages; }
        public boolean isHasMore() { return hasMore; }
    }
}
