package com.lawFirm.beans;

public class Admin extends User {

    public Admin() {
        super();
    }

    public Admin(int id, String firstName, String lastName, String email, String password, String phone,
            String address) {
        super(id, firstName, lastName, phone, address, email, password, "admin");
    }

}
