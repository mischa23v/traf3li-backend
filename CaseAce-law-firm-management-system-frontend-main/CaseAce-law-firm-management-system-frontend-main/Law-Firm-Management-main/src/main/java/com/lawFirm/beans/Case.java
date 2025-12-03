package com.lawFirm.beans;

import java.util.ArrayList;

public class Case {
    private int id;
    private String title;
    private String description;
    private String status;
    private String clientId;
    private String staffId;

    public Case() {
    }

    public Case(int id, String title, String description, String status, String clientId, String staffId) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status;
        this.clientId = clientId;
        this.staffId = staffId;
    }

    // Getters
    public int getID() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getStatus(){
        return status;
    }

    public String getClientId() {
        return clientId;
    }

    public String getStaffId() {
        return staffId;
    }

    // Setters
    public void setID(int id) {
        this.id = id;
    }

    public void setTitle(String title){
        this.title = title;
    }

    public void setDescription(String description){
        this.description = description;
    }

    public void setStatus(String status){
        this.status = status;
    }

    public void setClientId(String clientId){
        this.clientId = clientId;
    }

    public void setStaffId(String staffId){
        this.staffId = staffId;
    }

    @Override
    public String toString() {
        String str = "Case [id=" + id + ", title=" + title + ", description=" + description + ", status=" + status + ", clientId=" + clientId + ", staffId=" + staffId + "]";
        return str;
    }

    public ArrayList<String> getColumnNames() {
        ArrayList<String> columnNames = new ArrayList<String>();
        columnNames.add("ID");
        columnNames.add("Title");
        columnNames.add("Description");
        columnNames.add("Status");
        columnNames.add("Client ID");
        columnNames.add("Staff ID");
        return columnNames;
    }

    public ArrayList<String> getCellData() {
        ArrayList<String> cellData = new ArrayList<String>();
        cellData.add("ID");
        cellData.add("title");
        cellData.add("description");
        cellData.add("status");
        cellData.add("clientId");
        cellData.add("staffId");
        return cellData;
    }
}
