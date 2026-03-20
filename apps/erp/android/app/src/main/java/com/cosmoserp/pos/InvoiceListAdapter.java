package com.cosmoserp.pos;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;
import java.util.Locale;

public class InvoiceListAdapter extends RecyclerView.Adapter<InvoiceListAdapter.InvoiceViewHolder> {

    private List<Invoice> invoices;

    public InvoiceListAdapter(List<Invoice> invoices) {
        this.invoices = invoices;
    }

    @NonNull
    @Override
    public InvoiceViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_invoice, parent, false);
        return new InvoiceViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull InvoiceViewHolder holder, int position) {
        Invoice invoice = invoices.get(position);
        holder.invoiceNumber.setText(invoice.getInvoiceNumber());
        holder.customerName.setText(invoice.getCustomerName());
        holder.issueDate.setText(invoice.getIssueDate());
        holder.invoiceAmount.setText(String.format(Locale.getDefault(), "₦%,.2f", invoice.getTotalAmount()));
        holder.invoiceStatus.setText(invoice.getStatus());

        // Simple status color coding
        if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
            holder.invoiceStatus.setBackgroundColor(Color.parseColor("#DCFCE7"));
            holder.invoiceStatus.setTextColor(Color.parseColor("#16A34A"));
        } else if ("OVERDUE".equalsIgnoreCase(invoice.getStatus())) {
            holder.invoiceStatus.setBackgroundColor(Color.parseColor("#FEE2E2"));
            holder.invoiceStatus.setTextColor(Color.parseColor("#DC2626"));
        } else {
            holder.invoiceStatus.setBackgroundColor(Color.parseColor("#F3F4F6"));
            holder.invoiceStatus.setTextColor(Color.parseColor("#4B5563"));
        }
    }

    @Override
    public int getItemCount() {
        return invoices.size();
    }

    public static class InvoiceViewHolder extends RecyclerView.ViewHolder {
        TextView invoiceNumber, customerName, issueDate, invoiceAmount, invoiceStatus;

        public InvoiceViewHolder(@NonNull View itemView) {
            super(itemView);
            invoiceNumber = itemView.findViewById(R.id.invoiceNumber);
            customerName = itemView.findViewById(R.id.customerName);
            issueDate = itemView.findViewById(R.id.issueDate);
            invoiceAmount = itemView.findViewById(R.id.invoiceAmount);
            invoiceStatus = itemView.findViewById(R.id.invoiceStatus);
        }
    }
}
