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

public class QuoteListAdapter extends RecyclerView.Adapter<QuoteListAdapter.QuoteViewHolder> {

    private List<Quote> quotes;

    public QuoteListAdapter(List<Quote> quotes) {
        this.quotes = quotes;
    }

    @NonNull
    @Override
    public QuoteViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_invoice, parent, false);
        return new QuoteViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull QuoteViewHolder holder, int position) {
        Quote quote = quotes.get(position);
        holder.quoteNumber.setText(quote.getQuoteNumber());
        holder.customerName.setText(quote.getCustomerName());
        holder.issueDate.setText(quote.getIssueDate());
        holder.quoteAmount.setText(String.format(Locale.getDefault(), "₦%,.2f", quote.getTotalAmount()));
        holder.quoteStatus.setText(quote.getStatus());

        if ("ACCEPTED".equalsIgnoreCase(quote.getStatus())) {
            holder.quoteStatus.setBackgroundColor(Color.parseColor("#DCFCE7"));
            holder.quoteStatus.setTextColor(Color.parseColor("#16A34A"));
        } else if ("REJECTED".equalsIgnoreCase(quote.getStatus())) {
            holder.quoteStatus.setBackgroundColor(Color.parseColor("#FEE2E2"));
            holder.quoteStatus.setTextColor(Color.parseColor("#DC2626"));
        } else {
            holder.quoteStatus.setBackgroundColor(Color.parseColor("#F3F4F6"));
            holder.quoteStatus.setTextColor(Color.parseColor("#4B5563"));
        }
    }

    @Override
    public int getItemCount() {
        return quotes.size();
    }

    public static class QuoteViewHolder extends RecyclerView.ViewHolder {
        TextView quoteNumber, customerName, issueDate, quoteAmount, quoteStatus;

        public QuoteViewHolder(@NonNull View itemView) {
            super(itemView);
            quoteNumber = itemView.findViewById(R.id.invoiceNumber);
            customerName = itemView.findViewById(R.id.customerName);
            issueDate = itemView.findViewById(R.id.issueDate);
            quoteAmount = itemView.findViewById(R.id.invoiceAmount);
            quoteStatus = itemView.findViewById(R.id.invoiceStatus);
        }
    }
}
