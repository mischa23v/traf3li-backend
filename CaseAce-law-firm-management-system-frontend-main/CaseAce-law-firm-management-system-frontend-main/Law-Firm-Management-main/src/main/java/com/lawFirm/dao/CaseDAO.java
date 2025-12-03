package com.lawFirm.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import com.lawFirm.beans.Case;

public class CaseDAO {

    Connection conn;

    public CaseDAO(Connection conn) {
        this.conn = conn;

        String stmt = "CREATE TABLE IF NOT EXISTS Cases (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, status TEXT, clientId INTEGER, staffId INTEGER, FOREIGN KEY (clientId) REFERENCES Clients(id), FOREIGN KEY (staffId) REFERENCES Users(id));";
        try {
            PreparedStatement pstmt = conn.prepareStatement(stmt);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public Case setRsToCase(ResultSet rs) {
        Case Case = new Case();
        try {
            Case.setID(rs.getInt("id"));
            Case.setTitle(rs.getString("title"));
            Case.setDescription(rs.getString("description"));
            Case.setStatus(rs.getString("status"));
            Case.setClientId(rs.getString("clientId"));
            Case.setStaffId(rs.getString("staffId"));  
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return Case;
    }

    public Case getCase(int id) {
        String stmt = "SELECT * FROM Cases WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, id);
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create a Case object
            if (rs.next()) {
                Case caseObj = new Case();
                caseObj = this.setRsToCase(rs);
                return caseObj;
            }
        } catch (SQLException e) {
            e.printStackTrace();

        }
        return null;
    }

    public List<Case> getCaseQuery(String stmt) {
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            List<Case> CaseList = new ArrayList<>();
            if (rs.next()) {
                Case Case = new Case();
                Case = this.setRsToCase(rs);
                CaseList.add(Case);
            }
            return CaseList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Case> getCases() {
        String stmt = "SELECT * FROM Cases";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create an array of Case objects
            List<Case> CaseList = new ArrayList<>();
            while (rs.next()) {
                Case Case = new Case();
                Case = this.setRsToCase(rs);
                CaseList.add(Case);
            }
            return CaseList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean addCase(Case newCase) {
        String stmt = "INSERT INTO Cases (title, description, status, clientId, staffId) VALUES (?, ?, ?, ?, ?)";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, newCase.getTitle());
            pstmt.setString(2, newCase.getDescription());
            pstmt.setString(3, newCase.getStatus());
            pstmt.setString(4, newCase.getClientId());
            pstmt.setString(5, newCase.getStaffId());
            pstmt.executeUpdate();
            return true;
        }
        catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateCase(Case caseObj) {
        String stmt = "UPDATE Cases SET title = ?, description = ?, status = ?, clientId = ?, staffId = ? WHERE id = ?";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, caseObj.getTitle());
            pstmt.setString(2, caseObj.getDescription());
            pstmt.setString(3, caseObj.getStatus());
            pstmt.setString(4, caseObj.getClientId());
            pstmt.setString(5, caseObj.getStaffId());
            pstmt.setInt(6, caseObj.getID());
            pstmt.executeUpdate();
            return true;
        }
        catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteCase(int id) {
        String stmt = "DELETE FROM Cases WHERE id = ?";
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
