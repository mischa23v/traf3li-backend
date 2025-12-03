package com.lawFirm.beans;

public class User {
    private int id;
    private String firstName;
    private String lastName;

    private String phone;
    private String address;

    private String email;
    private String password;

    private String role;

    public User() {
    }

    public User(int id, String firstName, String lastName, String phone, String address, String email, String password, String role) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.address = address;
        this.email = email;
        this.password = password;
        this.role = role;
    }

    // Getters
    public int getID() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }


    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public String getRole() { return role; }

    // Setters
    public void setID(int id) {
        this.id = id;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setAddress(String address) {
        this.address = address;
    }


    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setRole(String role) { this.role = role; }

    @Override
    public String toString(){
        String str = "User: " + this.id + " " + this.firstName + " " + this.lastName + " " + this.phone + " " + this.address + " " + this.email + " " + this.password + " " + this.role;
        return str;
    }
}