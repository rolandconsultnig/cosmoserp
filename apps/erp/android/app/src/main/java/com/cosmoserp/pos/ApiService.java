package com.cosmoserp.pos;

import java.util.List;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {
    @POST("api/auth/login")
    Call<LoginResponse> login(@Body LoginRequest request);

    @GET("api/products")
    Call<ProductListResponse> getProducts(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("search") String search
    );

    @POST("api/products")
    Call<Product> createProduct(@Body Product product);

    @POST("api/products/{id}/stock-adjust")
    Call<Void> adjustStock(
            @Path("id") String productId,
            @Body StockAdjustRequest request
    );

    @GET("api/pos/sales")
    Call<SalesResponse> getRecentSales(
            @Query("page") int page,
            @Query("limit") int limit
    );

    @GET("api/customers")
    Call<CustomerListResponse> getCustomers(
            @Query("page") int page,
            @Query("limit") int limit,
            @Query("search") String search
    );

    @POST("api/customers")
    Call<CustomerResponse> createCustomer(@Body Customer customer);

    @GET("api/pos/end-of-day")
    Call<EndOfDayResponse> getEndOfDay(
            @Query("date") String date
    );

    @POST("api/pos/sale")
    Call<SaleCreateResponse> createSale(@Body SaleRequest request);

    @POST("api/pos/sales/{id}/send-receipt")
    Call<Void> sendReceipt(@Path("id") String saleId, @Body ReceiptActionRequest request);

    @POST("api/pos/sales/{id}/create-invoice")
    Call<Void> createInvoice(@Path("id") String saleId, @Body ReceiptActionRequest request);

    @GET("api/pos/stats")
    Call<DashboardStatsResponse> getStats();

    // New Endpoints for Parity
    @GET("api/invoices")
    Call<InvoiceListResponse> getInvoices(
            @Query("page") int page,
            @Query("limit") int limit
    );

    @GET("api/quotes")
    Call<QuoteListResponse> getQuotes(
            @Query("page") int page,
            @Query("limit") int limit
    );

    @GET("api/employees")
    Call<EmployeeListResponse> getEmployees();

    @GET("api/payroll")
    Call<PayrollListResponse> getPayroll();

    @GET("api/tenants/me")
    Call<TenantResponse> getTenantProfile();
}
