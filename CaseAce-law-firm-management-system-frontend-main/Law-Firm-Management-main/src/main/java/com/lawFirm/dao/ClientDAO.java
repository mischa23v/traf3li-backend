package com.lawFirm.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import com.lawFirm.beans.Client;
import com.lawFirm.manager.UserManager;

public class ClientDAO {

    Connection conn;

    public ClientDAO(Connection conn) {
        this.conn = conn;
        String stmt = "CREATE TABLE IF NOT EXISTS Clients (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT, phone TEXT, email TEXT UNIQUE, createdBy INTEGER, FOREIGN KEY (createdBy) REFERENCES Users(id))";
        try {
            PreparedStatement pstmt = conn.prepareStatement(stmt);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public Client setRsToClient(ResultSet rs) {
        Client client = new Client();
        try {
            client.setID(rs.getInt("id"));
            client.setFirstName(rs.getString("firstName"));
            client.setLastName(rs.getString("lastName"));
            client.setPhone(rs.getString("phone"));
            client.setEmail(rs.getString("email"));
            client.setCreatedBy(rs.getInt("createdBy"));
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return client;
    }

    public Client getClient(int id) {
        String stmt = "SELECT * FROM Clients WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, id);
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create a Client object
            if (rs.next()) {
                Client client = new Client();
                client = this.setRsToClient(rs);
                return client;
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Client> getClientQuery(String stmt) {
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            List<Client> clientList = new ArrayList<>();
            while (rs.next()) {
                Client client = new Client();
                client = this.setRsToClient(rs);
                clientList.add(client);
            }
            return clientList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Client> getClients() {

        String stmt = "";
        if(UserManager.get().getRole() == "admin") {
            stmt = "SELECT * FROM Clients";
        } else {
            int staffId = UserManager.get().getID();

            stmt = "SELECT c.id, c.firstName, c.lastName, c.phone, c.createdBy, c.email " +
                           "FROM Clients AS c " +
                           "JOIN Cases AS cs ON cs.staffId = " + staffId + " " +
                           "UNION " +
                           "SELECT c.id, c.firstName, c.lastName, c.phone, c.createdBy, c.email " +
                           "FROM Clients AS c " +
                           "WHERE c.createdBy = " + staffId + " AND c.id NOT IN (SELECT clientId FROM Cases)";
        }
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create an array of Client objects
            List<Client> clientList = new ArrayList<>();
            while (rs.next()) {
                Client client = new Client();
                client = this.setRsToClient(rs);
                clientList.add(client);
            }
            return clientList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean addClient(Client client) {
        String stmt = "INSERT INTO Clients (firstName, lastName, phone, email, createdBy) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, client.getFirstName());
            pstmt.setString(2, client.getLastName());
            pstmt.setString(3, client.getPhone());
            pstmt.setString(4, client.getEmail());
            pstmt.setInt(5, client.getCreatedBy());
            pstmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateClient(Client client) {
        String stmt = "UPDATE Clients SET firstName = ?, lastName = ?, phone = ?, email = ?, createdBy = ? WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, client.getFirstName());
            pstmt.setString(2, client.getLastName());
            pstmt.setString(3, client.getPhone());
            pstmt.setString(4, client.getEmail());
            pstmt.setInt(5, client.getCreatedBy());
            pstmt.setInt(6, client.getID());
            pstmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteClient(int id) {
        String stmt = "DELETE FROM Clients WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, id);
            pstmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
}
