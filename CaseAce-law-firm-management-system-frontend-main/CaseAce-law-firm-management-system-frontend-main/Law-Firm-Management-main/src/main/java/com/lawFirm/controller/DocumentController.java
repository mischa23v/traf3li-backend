package com.lawFirm.controller;

import java.io.File;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

import com.lawFirm.beans.Document;
import com.lawFirm.dao.DocumentDAO;
import com.lawFirm.utils.Toast;

import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.ScrollPane;
import javafx.stage.FileChooser;
import javafx.stage.Modality;
import javafx.stage.Stage;
import javafx.scene.control.TextField;
import javafx.scene.layout.Pane;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;
import javafx.scene.text.Text;

public class DocumentController {

    private int caseId;
    private Stage primaryStage;
    private Pane mainContent;

    private DocumentDAO documentDAO;

   public DocumentController() {}
   
   public DocumentController(int caseId, Connection conn) {
    this.caseId = caseId;
    documentDAO = new DocumentDAO(conn);
   }

    public void load() {
        try {
            // Load the FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/document.fxml"));
            Parent root = loader.load();

            // Create a new stage
            Stage primaryStage = new Stage();
            this.primaryStage = primaryStage;
            primaryStage.initModality(Modality.APPLICATION_MODAL); // Optional: Make it a modal window
            primaryStage.setTitle("Documents List");

            // Set the scene with the loaded FXML content
            Scene scene = new Scene(root);
            primaryStage.setScene(scene);

            // Add the VBox to the main content
            Pane mainContent = (Pane) primaryStage.getScene().lookup("#main_content");
            this.mainContent = mainContent;

            // Search button functionality
            Button searchButton = (Button) primaryStage.getScene().lookup("#main_searchbtn");
            searchButton.getStyleClass().add("#main-searchbtn");
            searchButton.setOnAction(e -> {
                searchData();
            });

            // Add button functionality
            Button addButton = (Button) primaryStage.getScene().lookup("#main_addbtn");
            addButton.getStyleClass().add("#main-addbtn");
            addButton.setOnAction(e -> {
                ArrayList<String> newdata = addDocument();
                if(newdata != null) {
                    Document document = new Document(0, newdata.get(0), newdata.get(1), newdata.get(2), caseId);
                    boolean response = documentDAO.addDocument(document);
                    if(response) {
                        Toast.get().showSuccess("Document added successfully");
                        List<Document> documents = fetchData();
                        renderDocumentList(documents);
                    }else {
                        Toast.get().showError("Error adding document");
                    }
                }
            });

            List<Document> documents = fetchData();

            renderDocumentList(documents);
            
            // Show the new stage
            primaryStage.showAndWait(); // Use show() if you don't want it to be modal
        } catch (Exception e) {
            e.printStackTrace(); // Handle the exception as needed
        }
    }

    private List<Document> fetchData() {
        return documentDAO.getDocumentsByCaseID(caseId);
    }

    private void searchData() {
        // Get the search text
        String searchText = ((TextField) primaryStage.getScene().lookup("#main_searchinput")).getText();

        // Fetch data from the database
        String stmt = "SELECT * FROM Documents WHERE caseId = " + caseId + " AND (name LIKE '%" + searchText + "%' )";
        List<Document> documents = documentDAO.getDocumentsQuery(stmt);

        if(documents.size() == 0 || documents == null) {
            mainContent.getChildren().clear();
            mainContent.getChildren().add(new Button("No data found"));
        }

        renderDocumentList(documents);
    }

    private void renderDocumentList(List<Document> documents) {
        // create a scroll pane to contain the document list
        ScrollPane scrollPane = new ScrollPane();
        scrollPane.setFitToWidth(true);
        scrollPane.setFitToHeight(true);  
    
        // Create a single VBox to hold all document items
        VBox documentContainer = new VBox();
        documentContainer.getStyleClass().add("document-container");
    
        for (Document document : documents) {
            VBox documentItem = new VBox();
            documentItem.getStyleClass().add("document-item");
            documentItem.setSpacing(10); // Set the desired gap between children

            // Create document name
            Text documentName = new Text();
            documentName.setText(document.getName());

            // Create a filler region to push the button to the right
            Region filler = new Region();
            VBox.setVgrow(filler, Priority.ALWAYS);

            // Create button to download at the right of the VBox
            Button downloadButton = new Button();
            downloadButton.setText("Open");
            downloadButton.getStyleClass().add("form-add-download-button");

            downloadButton.setOnAction(e -> {
                File file = new File(document.getPath());
                if (file.exists()) {
                    try {

                        java.awt.Desktop.getDesktop().open(file);
                    } catch (Exception e1) {
                        e1.printStackTrace();
                    }
                } else {
                    Toast.get().showError("File not found");
                }
            });

            Button deleteButton = new Button();
            deleteButton.setText("Delete");
            deleteButton.getStyleClass().add("form-add-delete-button");
            deleteButton.setOnAction(e -> {
                boolean response = documentDAO.deleteDocument(document.getID());
                if(response) {
                    Toast.get().showSuccess("Document deleted successfully");
                    List<Document> newDocuments = fetchData();
                    renderDocumentList(newDocuments);
                }else {
                    Toast.get().showError("Error deleting document");
                }
            });
    
            // Add the document name and download button to the VBox
            documentItem.getChildren().addAll(documentName, downloadButton, deleteButton);
    
            // Add the document item to the main container
            documentContainer.getChildren().add(documentItem);
        }
    
        // Set the single VBox as the content of the ScrollPane
        scrollPane.setContent(documentContainer);
    
        mainContent.getChildren().clear();
        // Add the scroll pane to the main content
        mainContent.getChildren().add(scrollPane);
    
    }    

    private ArrayList<String> addDocument() {
        FileChooser fc = new FileChooser();
        fc.setTitle("Choose a file");

        File selectedFile = fc.showOpenDialog(primaryStage);

        ArrayList<String> newdata = new ArrayList<>();

        if(selectedFile != null) {
            String fileName = selectedFile.getName();
            String format = fileName.substring(fileName.lastIndexOf(".") + 1);
            String path = moveFile(selectedFile);
            newdata.add(fileName);
            newdata.add(format);
            newdata.add(path);
            return newdata;
        }else {
            return null;
        }
    }

    private String moveFile(File selectedFile) {
        // check if the directory exists
        File directory = new File("src/main/resources/documents");
        if(!directory.exists()) {
            directory.mkdir();
        }

        String path = "src/main/resources/documents/" + selectedFile.getName();
        File newFile = new File(path);
        selectedFile.renameTo(newFile);
        return path;
    }
}
