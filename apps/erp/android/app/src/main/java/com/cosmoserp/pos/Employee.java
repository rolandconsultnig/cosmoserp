package com.cosmoserp.pos;

public class Employee {
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private String department;

    public String getId() { return id; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getDepartment() { return department; }
    
    public String getFullName() { return firstName + " " + lastName; }
}
