package com.lawFirm.dao;

import java.sql.Connection;
import java.util.List;

import com.lawFirm.beans.Staff;
import com.lawFirm.beans.Admin;

public class AuthDAO {

    private StaffDAO staffDAO = new StaffDAO();
    private AdminDAO adminDAO = new AdminDAO();

    public AuthDAO(Connection conn) {
        this.staffDAO = new StaffDAO(conn);
        this.adminDAO = new AdminDAO(conn);
    }

    public Staff loginStaff(String email, String password) {
        String query= "SELECT * FROM Users WHERE email = '" + email + "' AND password = '" + password + "' AND role = 'staff'";
        List<Staff> staff = staffDAO.getStaffQuery(query);
        if(staff != null && staff.size() > 0) {
            return staff.get(0);
        } else {
            return null;
        }
    }

    public Admin loginAdmin(String email, String password) {
        String query = "SELECT * FROM Users WHERE email = '" + email + "' AND password = '" + password + "' AND role = 'admin'";
        List<Admin> admin = adminDAO.getAdminQuery(query);
        if(admin != null && admin.size() > 0) {
            return admin.get(0);
        } else {
            return null;
        }
    }

    public boolean register(String firstName, String lastName, String phone, String address, String email, String password, String role) {
        if(role == "Staff") {
            Staff staff = new Staff(1, firstName, lastName, email, password, phone, address);
            return staffDAO.addStaff(staff);
        } else{
            Admin admin = new Admin(1, firstName, lastName, email, password, phone, address);
            return adminDAO.addAdmin(admin);
        }
    }
}
