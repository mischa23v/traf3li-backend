package com.lawFirm.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import com.lawFirm.beans.Document;

public class DocumentDAO {

    Connection conn;

    public DocumentDAO(Connection conn) {
        this.conn = conn;
        String stmt = "CREATE TABLE IF NOT EXISTS Documents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, format TEXT, path TEXT, caseId INTEGER, FOREIGN KEY (caseId) REFERENCES Cases(id))";
        try {
            PreparedStatement pstmt = conn.prepareStatement(stmt);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public Document setRsToDocument(ResultSet rs) {
        Document document = new Document();
        try {
            document.setID(rs.getInt("id"));
            document.setName(rs.getString("name"));
            document.setFormat(rs.getString("format"));
            document.setPath(rs.getString("path"));
            document.setCaseID(rs.getInt("caseId"));
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return document;
    }

    public Document getDocument(int id) {
        String stmt = "SELECT * FROM Documents WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, id);
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create a Document object
            if (rs.next()) {
                Document Document = new Document();
                Document = this.setRsToDocument(rs);
                return Document;
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Document> getDocumentsByCaseID(int caseId) {
        String stmt = "SELECT * FROM Documents WHERE caseId = ?";
        try(PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setInt(1, caseId);
            ResultSet rs = pstmt.executeQuery();

            List<Document> DocumentList = new ArrayList<>();

            // Process the result set and create a Document object
            while(rs.next()) {
                Document Document = new Document();
                Document = this.setRsToDocument(rs);
                DocumentList.add(Document);
            }
            return DocumentList;
        }catch(SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Document> getDocumentsQuery(String stmt) {
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            List<Document> documentList = new ArrayList<>();
            while (rs.next()) {
                Document document = new Document();
                document = this.setRsToDocument(rs);
                documentList.add(document);
            }
            return documentList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public List<Document> getDocuments() {
        String stmt = "SELECT * FROM Documents";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            ResultSet rs = pstmt.executeQuery();

            // Process the result set and create an array of Document objects
            List<Document> DocumentList = new ArrayList<>();
            while (rs.next()) {
                Document Document = new Document();
                Document = this.setRsToDocument(rs);
                DocumentList.add(Document);
            }
            return DocumentList;
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean addDocument(Document Document) {
        String stmt = "INSERT INTO Documents (name, format, path, caseId) VALUES (?, ?, ?, ?)";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, Document.getName());
            pstmt.setString(2, Document.getFormat());
            pstmt.setString(3, Document.getPath());
            pstmt.setInt(4, Document.getCaseID());
            pstmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
    
    public boolean updateDocument(Document Document) {
        String stmt = "UPDATE Documents SET name = ?, format = ?, path = ? WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(stmt)) {
            pstmt.setString(1, Document.getName());
            pstmt.setString(2, Document.getFormat());
            pstmt.setString(3, Document.getPath());
            pstmt.setInt(4, Document.getID());
            pstmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteDocument(int id) {
        String stmt = "DELETE FROM Documents WHERE id = ?";
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
