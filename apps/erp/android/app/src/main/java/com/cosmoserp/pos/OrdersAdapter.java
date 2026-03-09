package com.cosmoserp.pos;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class OrdersAdapter extends RecyclerView.Adapter<OrdersAdapter.OrderViewHolder> {

    private List<SalesResponse.Sale> sales;

    public OrdersAdapter(List<SalesResponse.Sale> sales) {
        this.sales = sales;
    }

    @NonNull
    @Override
    public OrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_order, parent, false);
        return new OrderViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull OrderViewHolder holder, int position) {
        SalesResponse.Sale sale = sales.get(position);
        holder.receiptNumber.setText(sale.getReceiptNumber());
        holder.customerName.setText(sale.getCustomerName() != null ? sale.getCustomerName() : "Guest Customer");
        holder.orderStatus.setText(sale.getStatus());
        holder.orderTotal.setText(String.format("$%.2f", sale.getTotalAmount()));
        holder.orderDate.setText(sale.getCreatedAt().substring(0, 10)); // Simple date format

        if ("VOIDED".equals(sale.getStatus())) {
            holder.orderStatus.setTextColor(Color.RED);
        } else {
            holder.orderStatus.setTextColor(Color.parseColor("#4CAF50")); // Green
        }
    }

    @Override
    public int getItemCount() {
        return sales.size();
    }

    public static class OrderViewHolder extends RecyclerView.ViewHolder {
        TextView receiptNumber, customerName, orderStatus, orderDate, orderTotal;

        public OrderViewHolder(@NonNull View itemView) {
            super(itemView);
            receiptNumber = itemView.findViewById(R.id.receiptNumber);
            customerName = itemView.findViewById(R.id.customerName);
            orderStatus = itemView.findViewById(R.id.orderStatus);
            orderDate = itemView.findViewById(R.id.orderDate);
            orderTotal = itemView.findViewById(R.id.orderTotal);
        }
    }
}
