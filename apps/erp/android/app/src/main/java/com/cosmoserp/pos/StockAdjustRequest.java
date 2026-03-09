package com.cosmoserp.pos;

public class StockAdjustRequest {
    private String warehouseId;
    private int quantity;
    private String type; // "ADJUSTMENT", "ADDITION", "SUBTRACTION"
    private String notes;

    public StockAdjustRequest(String warehouseId, int quantity, String type, String notes) {
        this.warehouseId = warehouseId;
        this.quantity = quantity;
        this.type = type;
        this.notes = notes;
    }
}
