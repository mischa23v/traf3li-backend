package com.lawFirm.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import com.lawFirm.beans.Staff;

public class StaffDAO {

    Connection conn;

    public StaffDAO() {
    }
    
    public StaffDAO(Connection conn) {
        this.conn = conn;
        
        String stmt = "CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT,firstName TEXT,lastName TEXT,phone TEXT,address TEXT,email TEXT UNIQUE,password TEXT, role TEXT)";
        try {
            PreparedStatement pstmt = conn.prepareStatement(stmt);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public Staff setRsToStaff(ResultSet rs) {
        Staff staff = new Staff();
        try {
            staff.setID(rs.getInt("id"));
            staff.setFirstName(rs.getString("firstName"));
            staff.setLastName(rs.getString("lastName"));
            staff.setPhone(rs.getString("phone"));
            staff.setAddress(rs.getString("address"));
            staff.setEmail(rs.getString("email"));
            staff.setPassword(rs.getString("password"));
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return staff;
    }

    public Staff getStaff(int id) {
        String stmt = "SELECT * FROM Users WHERE id = ? AND role = 'staff'";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, id);
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create a Staff object
            if (rs.next()) {
                Staff staff = new Staff();
                staff = this.setRsToStaff(rs);
                return staff;
            }
        } catch (SQLException e) {
            e.printStackTrace();

        }
        return null;
    }

    public List<Staff> getStaffQuery(String stmt) {
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            List<Staff> staffList = new ArrayList<>();
            while (rs.next()) {
                Staff staff = new Staff();
                staff = this.setRsToStaff(rs);
                staffList.add(staff);
            }
            return staffList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Staff> getStaffs() {
        String stmt = "SELECT * FROM Users WHERE role = 'staff'";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create an array of Staff objects
            List<Staff> staffList = new ArrayList<>();
            while (rs.next()) {
                Staff staff = new Staff();
                staff = this.setRsToStaff(rs);
                staffList.add(staff);
            }

            // Convert the list to an array
            return staffList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean addStaff(Staff staff) {
        String stmt = "INSERT INTO Users (firstName, lastName, phone, address, email, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, staff.getFirstName());
            pstmt.setString(2, staff.getLastName());
            pstmt.setString(3, staff.getPhone());
            pstmt.setString(4, staff.getAddress());
            pstmt.setString(5, staff.getEmail());
            pstmt.setString(6, staff.getPassword());
            pstmt.setString(7, "staff");
            pstmt.executeUpdate();
            return true;
        }
        catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateStaff(Staff Staff) {
        String stmt = "UPDATE Users SET firstName = ?, lastName = ?, phone = ?, address = ?, email = ?, password = ?, role = ? WHERE id = ?";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, Staff.getFirstName());
            pstmt.setString(2, Staff.getLastName());
            pstmt.setString(3, Staff.getPhone());
            pstmt.setString(4, Staff.getAddress());
            pstmt.setString(5, Staff.getEmail());
            pstmt.setString(6, Staff.getPassword());
            pstmt.setString(7, "staff");
            pstmt.setInt(8, Staff.getID());
            pstmt.executeUpdate();
            return true;
        }
        catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteStaff(int id) {
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
