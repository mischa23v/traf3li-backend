package com.lawFirm.manager;

import com.lawFirm.beans.Admin;
import com.lawFirm.beans.Staff;

public class UserManager {
    private static UserManager instance;
    private Staff staff;
    private Admin admin;
    private String role;

    private UserManager() {
    }
    
    public static synchronized UserManager get() {
        if (instance == null) {
            instance = new UserManager();
        }
        return instance;
    }

    public <T> void setUser(String role, T data) {
        this.role = role;
        if(role.equals("staff")) {
            this.staff = (Staff) data;
        }else{
            this.admin = (Admin) data;
        }
    }

    public String getRole() {
        return role;
    }

    public Object getData() {
        if ("staff".equals(role)) {
            return staff;
        } else if ("admin".equals(role)) {
            return admin;
        }
        return null; // Handle unsupported userType
    }
    
    public int getID() {
        if ("staff".equals(role)) {
            return staff.getID();
        } else if ("admin".equals(role)) {
            return admin.getID();
        }
        return -99; // Handle unsupported userType
    }
}
