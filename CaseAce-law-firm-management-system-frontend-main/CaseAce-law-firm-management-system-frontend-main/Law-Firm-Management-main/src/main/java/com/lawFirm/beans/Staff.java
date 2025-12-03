package com.lawFirm.beans;

import java.util.ArrayList;

public class Staff extends User {

    public Staff() {
        super();
    }

    public Staff(int id, String firstName, String lastName, String email, String password, String phone,
            String address) {
        super(id, firstName, lastName, phone, address, email, password, "staff");
    }

    public ArrayList<String> getColumnNames() {
        ArrayList<String> columnNames = new ArrayList<String>();
        columnNames.add("ID");
        columnNames.add("First Name");
        columnNames.add("Last Name");
        columnNames.add("Phone");
        columnNames.add("Address");
        columnNames.add("Email");
        columnNames.add("Password");
        return columnNames;
    }

    public ArrayList<String> getCellData() {
        ArrayList<String> cellData = new ArrayList<String>();
        cellData.add("ID");
        cellData.add("firstName");
        cellData.add("lastName");
        cellData.add("phone");
        cellData.add("address");
        cellData.add("email");
        cellData.add("password");
        return cellData;
    }
}
