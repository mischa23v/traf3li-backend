package com.lawFirm.beans;

import java.util.ArrayList;

public class Client {
    private int id; 
    private String firstName;
    private String lastName;
    private String phone;
    private String email;
    private int createdBy;

    public Client() {
    }

    public Client(int id, String firstName, String lastName, String phone, String email, String creatorRole, int createdBy) {
        this.id = id; 
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.email = email;
        this.createdBy = createdBy;
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

    public String getPhone(){
        return phone;
    }

    public String getEmail() {
        return email;
    }


    public int getCreatedBy() {
        return createdBy;
    }

    // Setters

    public void setID(int id) {
        this.id = id; 
    }

    public void setFirstName(String firstName){
        this.firstName = firstName;
    }

    public void setLastName(String lastName){
        this.lastName = lastName;
    }

    public void setPhone(String phone){
        this.phone = phone;
    }

    public void setEmail(String email){
        this.email = email;
    }


    public void setCreatedBy(int createdBy){
        this.createdBy = createdBy;
    }

    @Override   
    public String toString() {
        return "Client [id=" + id + ", firstName=" + firstName + ", lastName=" + lastName + ", phone=" + phone + ", email=" + email + ", createdBy=" + createdBy + "]";
    }

    public ArrayList<String> getColumnNames() {
        ArrayList<String> colNames = new ArrayList<>();
        colNames.add("ID");
        colNames.add("First Name");
        colNames.add("Last Name");
        colNames.add("Phone");
        colNames.add("Email");
        return colNames;
    }

    public ArrayList<String> getCellData() {
        ArrayList<String> cellData = new ArrayList<>();
        cellData.add("ID");
        cellData.add("firstName");
        cellData.add("lastName");
        cellData.add("phone");
        cellData.add("email");
        return cellData;
    }
}
