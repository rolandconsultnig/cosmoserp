package com.cosmoserp.pos;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class EmployeeListAdapter extends RecyclerView.Adapter<EmployeeListAdapter.EmployeeViewHolder> {

    private List<Employee> employees;

    public EmployeeListAdapter(List<Employee> employees) {
        this.employees = employees;
    }

    @NonNull
    @Override
    public EmployeeViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_employee, parent, false);
        return new EmployeeViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull EmployeeViewHolder holder, int position) {
        Employee employee = employees.get(position);
        holder.employeeName.setText(employee.getFullName());
        holder.employeeRole.setText(employee.getRole());
        holder.employeeDepartment.setText(employee.getDepartment());
        
        String initials = "";
        if (employee.getFirstName() != null && !employee.getFirstName().isEmpty()) initials += employee.getFirstName().charAt(0);
        if (employee.getLastName() != null && !employee.getLastName().isEmpty()) initials += employee.getLastName().charAt(0);
        holder.employeeInitials.setText(initials.toUpperCase());
    }

    @Override
    public int getItemCount() {
        return employees.size();
    }

    public static class EmployeeViewHolder extends RecyclerView.ViewHolder {
        TextView employeeName, employeeRole, employeeDepartment, employeeInitials;

        public EmployeeViewHolder(@NonNull View itemView) {
            super(itemView);
            employeeName = itemView.findViewById(R.id.employeeName);
            employeeRole = itemView.findViewById(R.id.employeeRole);
            employeeDepartment = itemView.findViewById(R.id.employeeDepartment);
            employeeInitials = itemView.findViewById(R.id.employeeInitials);
        }
    }
}
