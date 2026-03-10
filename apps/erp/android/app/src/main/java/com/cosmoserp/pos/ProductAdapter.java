package com.cosmoserp.pos;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class ProductAdapter extends RecyclerView.Adapter<ProductAdapter.ProductViewHolder> {

    private List<Product> products;
    private OnProductClickListener listener;

    public interface OnProductClickListener {
        void onProductClick(Product product);
    }

    public ProductAdapter(List<Product> products, OnProductClickListener listener) {
        this.products = products;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ProductViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_product, parent, false);
        return new ProductViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ProductViewHolder holder, int position) {
        Product product = products.get(position);
        holder.productName.setText(product.getName());
        holder.productPrice.setText(product.getFormattedPrice());

        // Dynamic Color Strip based on Name (Web feature)
        int color = getPaletteColor(product.getName());
        holder.colorStrip.setBackgroundColor(color);

        // Stock Badge Logic
        int stock = product.getTotalStock();
        int reorderPoint = product.getReorderPoint() > 0 ? product.getReorderPoint() : 10;

        if (stock <= 0) {
            holder.stockBadge.setText("Out of Stock");
            holder.stockBadge.setTextColor(Color.RED);
            holder.itemView.setAlpha(0.6f);
            holder.itemView.setEnabled(false);
        } else if (stock <= reorderPoint) {
            holder.stockBadge.setText("Low: " + stock);
            holder.stockBadge.setTextColor(Color.parseColor("#D97706")); // Amber
            holder.itemView.setAlpha(1.0f);
            holder.itemView.setEnabled(true);
        } else {
            holder.stockBadge.setText(stock + " in Stock");
            holder.stockBadge.setTextColor(Color.parseColor("#059669")); // Emerald
            holder.itemView.setAlpha(1.0f);
            holder.itemView.setEnabled(true);
        }

        holder.itemView.setOnClickListener(v -> listener.onProductClick(product));
    }

    private int getPaletteColor(String name) {
        String[] colors = {"#DBEAFE", "#DCFCE7", "#FFEDD5", "#F3E8FF", "#FFE4E6", "#CCFBF1", "#FEF3C7", "#EDE9FE"};
        int hash = 0;
        for (char c : name.toCharArray()) hash = 31 * hash + c;
        return Color.parseColor(colors[Math.abs(hash) % colors.length]);
    }

    @Override
    public int getItemCount() {
        return products.size();
    }

    public static class ProductViewHolder extends RecyclerView.ViewHolder {
        TextView productName, productPrice, stockBadge;
        View colorStrip;

        public ProductViewHolder(@NonNull View itemView) {
            super(itemView);
            productName = itemView.findViewById(R.id.productName);
            productPrice = itemView.findViewById(R.id.productPrice);
            stockBadge = itemView.findViewById(R.id.stockBadge);
            colorStrip = itemView.findViewById(R.id.productColorStrip);
        }
    }
}
