package com.lawFirm.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import com.lawFirm.beans.Admin;

public class AdminDAO {

    Connection conn;

    public AdminDAO() {
    }
    
    public AdminDAO(Connection conn) {
        this.conn = conn;
        
        String stmt = "CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT,firstName TEXT,lastName TEXT,phone TEXT,address TEXT,email TEXT UNIQUE,password TEXT, role TEXT)";
        try {
            PreparedStatement pstmt = conn.prepareStatement(stmt);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public Admin setRsToAdmin(ResultSet rs) {
        Admin admin = new Admin();
        try {
            admin.setID(rs.getInt("id"));
            admin.setFirstName(rs.getString("firstName"));
            admin.setLastName(rs.getString("lastName"));
            admin.setPhone(rs.getString("phone"));
            admin.setAddress(rs.getString("address"));
            admin.setEmail(rs.getString("email"));
            admin.setPassword(rs.getString("password"));
            admin.setRole(rs.getString("role"));
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return admin;
    }

    public Admin getAdmin(int id) {
        String stmt = "SELECT * FROM Users WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, id);
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create a Admin object
            if (rs.next()) {
                Admin admin = new Admin();
                admin = this.setRsToAdmin(rs);
                return admin;
            }
        } catch (SQLException e) {
            e.printStackTrace();

        }
        return null;
    }

    public List<Admin> getAdminQuery(String stmt) {
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            List<Admin> adminList = new ArrayList<>();
            if (rs.next()) {
                Admin admin = new Admin();
                admin = this.setRsToAdmin(rs);
                adminList.add(admin);
            }
            return adminList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Admin> getAdmins() {
        String stmt = "SELECT * FROM Users";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create an array of Admin objects
            List<Admin> AdminList = new ArrayList<>();
            while (rs.next()) {
                Admin Admin = new Admin();
                Admin = this.setRsToAdmin(rs);
                AdminList.add(Admin);
            }

            // Convert the list to an array
            return AdminList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean addAdmin(Admin admin) {
        String stmt = "INSERT INTO Users (firstName, lastName, phone, address, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, admin.getFirstName());
            pstmt.setString(2, admin.getLastName());
            pstmt.setString(3, admin.getPhone());
            pstmt.setString(4, admin.getAddress());
            pstmt.setString(5, admin.getEmail());
            pstmt.setString(6, admin.getPassword());
            pstmt.setString(7, "admin");
            pstmt.executeUpdate();
            return true;
        }
        catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateAdmin(Admin Admin) {
        String stmt = "UPDATE Users SET firstName = ?, lastName = ?, phone = ?, address = ?, email = ?, password = ? WHERE id = ?";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, Admin.getFirstName());
            pstmt.setString(2, Admin.getLastName());
            pstmt.setString(3, Admin.getPhone());
            pstmt.setString(4, Admin.getAddress());
            pstmt.setString(5, Admin.getEmail());
            pstmt.setString(6, Admin.getPassword());
            pstmt.setInt(7, Admin.getID());
            pstmt.executeUpdate();
            return true;
        }
        catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteAdmin(int id) {
        String stmt = "DELETE FROM Users WHERE id = ?";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, id);
            pstmt.executeUpdate();
            return true;
        }
        catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
}
