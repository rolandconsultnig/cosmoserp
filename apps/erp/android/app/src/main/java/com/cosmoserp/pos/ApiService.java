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
}
