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

public class PayrollListAdapter extends RecyclerView.Adapter<PayrollListAdapter.PayrollViewHolder> {

    private List<Payroll> payrolls;

    public PayrollListAdapter(List<Payroll> payrolls) {
        this.payrolls = payrolls;
    }

    @NonNull
    @Override
    public PayrollViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_payroll, parent, false);
        return new PayrollViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull PayrollViewHolder holder, int position) {
        Payroll payroll = payrolls.get(position);
        holder.payrollPeriod.setText(payroll.getPeriod());
        holder.payrollStatus.setText(payroll.getStatus());
        holder.grossAmount.setText(String.format(Locale.getDefault(), "₦%,.2f", payroll.getTotalGross()));
        holder.netAmount.setText(String.format(Locale.getDefault(), "₦%,.2f", payroll.getTotalNet()));

        if ("PAID".equalsIgnoreCase(payroll.getStatus())) {
            holder.payrollStatus.setBackgroundColor(Color.parseColor("#DCFCE7"));
            holder.payrollStatus.setTextColor(Color.parseColor("#16A34A"));
        } else {
            holder.payrollStatus.setBackgroundColor(Color.parseColor("#F3F4F6"));
            holder.payrollStatus.setTextColor(Color.parseColor("#4B5563"));
        }
    }

    @Override
    public int getItemCount() {
        return payrolls.size();
    }

    public static class PayrollViewHolder extends RecyclerView.ViewHolder {
        TextView payrollPeriod, payrollStatus, grossAmount, netAmount;

        public PayrollViewHolder(@NonNull View itemView) {
            super(itemView);
            payrollPeriod = itemView.findViewById(R.id.payrollPeriod);
            payrollStatus = itemView.findViewById(R.id.payrollStatus);
            grossAmount = itemView.findViewById(R.id.grossAmount);
            netAmount = itemView.findViewById(R.id.netAmount);
        }
    }
}
