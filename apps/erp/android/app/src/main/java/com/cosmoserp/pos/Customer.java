package com.cosmoserp.pos;

public class Customer {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String address;

    public Customer(String name, String email, String phone) {
        this.name = name;
        this.email = email;
        this.phone = phone;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
}
