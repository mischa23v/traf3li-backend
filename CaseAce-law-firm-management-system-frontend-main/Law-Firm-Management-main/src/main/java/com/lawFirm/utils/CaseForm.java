package com.lawFirm.utils;

import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Function;

import com.lawFirm.beans.Case;
import com.lawFirm.beans.Client;
import com.lawFirm.beans.Staff;
import com.lawFirm.controller.DocumentController;
import com.lawFirm.dao.ClientDAO;
import com.lawFirm.dao.StaffDAO;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.Pane;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import javafx.util.StringConverter;

public class CaseForm {

    private StaffDAO staffDAO;
    private ClientDAO clientDAO;
    private Connection conn;

    private Function<Void, Void> load;

    public CaseForm(Connection conn, Function<Void, Void> load) {
        this.clientDAO = new ClientDAO(conn);
        this.staffDAO = new StaffDAO(conn);
        this.conn = conn;
        this.load = load;
    }
    
    public void changeToAddForm(Text title, Pane mainContent, Stage primaryStage, Consumer<ArrayList<String>> callback) {
        title.setText("Add New Case");
        Utils.get().hide();

        Pane addForm = new Pane();

        // clear the main anchor pane
        mainContent.getChildren().clear();

        // add back button
        Button backButton = new Button("< Go Back To Cases List");
        backButton.getStyleClass().add("back-button");
        backButton.setLayoutY(-60);
        backButton.setOnAction(e -> {
            load.apply(null);
        });
        addForm.getChildren().add(backButton);

        createTextFields(null, addForm);

        // add submit button
        Button addButton = new Button("Submit");
        addButton.getStyleClass().add("form-add-btn");
        addButton.setPrefWidth(100);
        addButton.setLayoutY(350);
        addButton.setOnAction(e-> {
            ArrayList<String> newdata = new ArrayList<>();
            newdata = validateData(addForm);
            if(newdata == null) return;

            callback.accept(newdata);
        });

        addForm.getChildren().add(addButton);
        addForm.prefWidthProperty().bind(mainContent.widthProperty());
        mainContent.getChildren().add(addForm);
    }

    private ArrayList<String> validateData(Pane form) {
        TextField titleField = (TextField) form.getChildren().get(1);
        TextArea descriptionField = (TextArea) form.getChildren().get(2);
        @SuppressWarnings("unchecked")
        ComboBox<String> statusDropdown = (ComboBox<String>) form.getChildren().get(3);
        @SuppressWarnings("unchecked")
        ComboBox<Client> clientDropdown = (ComboBox<Client>) form.getChildren().get(4);
        @SuppressWarnings("unchecked")
        ComboBox<Staff> staffDropdown = (ComboBox<Staff>) form.getChildren().get(5);

        if(titleField.getText().equals("")) {
            Toast.get().showError("Title cannot be empty");
            return null;
        }
        if(descriptionField.getText().equals("")) {
            Toast.get().showError("Description cannot be empty");
            return null;
        }
        if(statusDropdown.getValue() == null) {
            Toast.get().showError("Status cannot be empty");
            return null;
        }
        if(clientDropdown.getValue() == null) {
            Toast.get().showError("Client cannot be empty");
            return null;
        }
        if(staffDropdown.getValue() == null) {
            Toast.get().showError("Staff cannot be empty");
            return null;
        }   

        ArrayList<String> data = new ArrayList<>();
        data.add(titleField.getText());
        data.add(descriptionField.getText());
        data.add(statusDropdown.getValue());
        data.add(String.valueOf(clientDropdown.getValue().getID()));
        data.add(String.valueOf(staffDropdown.getValue().getID()));
        return data;
    }

    // DETAIL FORM - UPDATE + DELETE
    public void changeToDetailForm(Case data, Text title, Pane mainContent, Stage primaryStage,Consumer<ArrayList<String>> updateCallback, Consumer<Integer> deleteCallback) {
        title.setText("Case Details");
        Utils.get().hide();

        Pane detailForm = new Pane();

        // add back button
        Button backButton = new Button("< Go Back To Cases List");
        backButton.getStyleClass().add("back-button");
        backButton.setLayoutY(-60);
        backButton.setOnAction(e -> {
            load.apply(null);
        });
        detailForm.getChildren().add(backButton);

        createTextFields(data, detailForm);
        createDeleteButton(data, detailForm, deleteCallback);
        createDocumentButton(data, detailForm);

        // add submit button
        Button updateButton = new Button("Submit");
        updateButton.getStyleClass().add("form-add-btn");
        updateButton.setPrefWidth(100);
        updateButton.setLayoutY(350);
        updateButton.setOnAction(e-> {
            ArrayList<String> newdata = new ArrayList<>();
            newdata = validateData(detailForm);
            if(newdata == null) return;

            newdata.add(0, String.valueOf(data.getID()));
            updateCallback.accept(newdata);
        });
        detailForm.getChildren().add(updateButton);

        detailForm.prefWidthProperty().bind(mainContent.widthProperty());
        mainContent.getChildren().clear();
        mainContent.getChildren().add(detailForm);
    }

    // ADD FORM
    private void createTextFields(Case data, Pane form) {
        TextField titleField = new TextField();
        if(data != null) titleField.setText(data.getTitle());
        titleField.setPromptText("Title");
        titleField.setMaxWidth(Double.MAX_VALUE);
        titleField.setLayoutY(0);
        titleField.prefWidthProperty().bind(form.widthProperty());
        form.getChildren().add(titleField);

        TextArea descriptionField = new TextArea();
        if(data != null) descriptionField.setText(data.getDescription());
        descriptionField.setPromptText("Description");
        descriptionField.setMaxWidth(Double.MAX_VALUE);
        descriptionField.setLayoutY(50);
        descriptionField.prefWidthProperty().bind(form.widthProperty());
        descriptionField.setPrefHeight(120);
        form.getChildren().add(descriptionField);
        
        // add status dropdown
        String[] statusList ={"Pending" , "Completed", "In Progress", "Declined"};

        ComboBox<String> statusDropdown = new ComboBox<>();
        if(data != null) statusDropdown.setValue(data.getStatus());
        statusDropdown.getItems().addAll(statusList);

        statusDropdown.setLayoutY(200);
        statusDropdown.setPromptText("Status");
        statusDropdown.setMaxWidth(Double.MAX_VALUE);
        statusDropdown.prefWidthProperty().bind(form.widthProperty());
        form.getChildren().add(statusDropdown);
        
        // add client dropdown
        List<Client> clientNames = clientDAO.getClients();
        ObservableList<Client> clientList = FXCollections.observableArrayList(clientNames);
        ComboBox<Client> clientDropdown = new ComboBox<>();
        if(data != null) clientDropdown.setValue(clientDAO.getClient(Integer.parseInt(data.getClientId())));
        clientDropdown.setItems(clientList);

        clientDropdown.setLayoutY(250);
        clientDropdown.setPromptText("Client");
        clientDropdown.setMaxWidth(Double.MAX_VALUE);
        clientDropdown.prefWidthProperty().bind(form.widthProperty());
        form.getChildren().add(clientDropdown);

        clientDropdown.setConverter(new StringConverter<Client>() {
            @Override
            public String toString(Client client) {
                return client.getFirstName() + " " + client.getLastName();
            }

            @Override
            public Client fromString(String string) {
                throw new UnsupportedOperationException("Unimplemented method 'fromString'");
            }
        });

        // add staff dropdown
        List<Staff> staffNames = staffDAO.getStaffs();
        ObservableList<Staff> staffList = FXCollections.observableArrayList(staffNames);
        ComboBox<Staff> staffDropdown = new ComboBox<>();
        if(data != null) staffDropdown.setValue(staffDAO.getStaff(Integer.parseInt(data.getStaffId())));
        staffDropdown.setItems(staffList);

        staffDropdown.setLayoutY(300);
        staffDropdown.setPromptText("Staff");
        staffDropdown.setMaxWidth(Double.MAX_VALUE);
        staffDropdown.prefWidthProperty().bind(form.widthProperty());

        staffDropdown.setConverter(new StringConverter<Staff>() {
            @Override
            public String toString(Staff staff) {
                return staff.getFirstName() + " " + staff.getLastName();
            }

            @Override
            public Staff fromString(String string) {
                throw new UnsupportedOperationException("Unimplemented method 'fromString'");
            }
        });

        form.getChildren().add(staffDropdown);
    }

    private void createDeleteButton(Case data, Pane detailForm, Consumer<Integer> callback) {
        Button deleteButton = new Button("Delete");
        deleteButton.getStyleClass().add("form-delete-btn");
        deleteButton.setPrefWidth(100);
        deleteButton.setLayoutX(110);
        deleteButton.setLayoutY(350);
        deleteButton.getStyleClass().add("delete-button");

        deleteButton.setOnAction(e -> {
            int id = data.getID();
            callback.accept(id);
        });
        detailForm.getChildren().add(deleteButton);
    }

    private void createDocumentButton(Case data, Pane detailForm) {
        Button documentButton = new Button("Documents");
        documentButton.getStyleClass().add("document-btn");
        documentButton.setPrefWidth(130);
        documentButton.setLayoutX(220);
        documentButton.setLayoutY(350);
        documentButton.getStyleClass().add("document-button");

        documentButton.setOnAction(e -> {
            DocumentController documentController = new DocumentController(data.getID(), conn);
            documentController.load();
        });
        detailForm.getChildren().add(documentButton);
    }
}
