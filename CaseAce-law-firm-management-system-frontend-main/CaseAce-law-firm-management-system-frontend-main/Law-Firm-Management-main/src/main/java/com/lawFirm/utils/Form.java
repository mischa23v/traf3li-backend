package com.lawFirm.utils;

import java.util.ArrayList;
import java.util.function.Consumer;
import java.util.function.Function;

import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.scene.layout.Pane;
import javafx.scene.text.Text;
import javafx.stage.Stage;

public class Form {
    
    public static <T> void changeToAddForm(Text title, String titlename,  Pane mainContent, Stage primaryStage, ArrayList<String> colNames, ArrayList<String> cellData, Consumer<ArrayList<String>> callback, Function<Void,Void> load) {
        title.setText("Add New " + titlename);
        Utils.get().hide();

        Pane addForm = new Pane();

        // clear the main anchor pane
        mainContent.getChildren().clear();

        // add back button
        Button backButton = new Button("< Go Back To " + titlename + " List");
        backButton.getStyleClass().add("back-button");
        backButton.setLayoutY(-60);
        backButton.setOnAction(e -> {
            load.apply(null);
        });
        addForm.getChildren().add(backButton);
    
        for(int i=1; i<colNames.size(); i++) {
            TextField textField = new TextField();
            textField.setPromptText(colNames.get(i));
            textField.setMaxWidth(Double.MAX_VALUE);
            textField.setLayoutY(i*50-50);
            textField.prefWidthProperty().bind(addForm.widthProperty());
            addForm.getChildren().add(textField);
        }

        // add submit button
        Button addButton = new Button("Submit");
        addButton.getStyleClass().add("form-add-btn");
        addButton.setPrefWidth(100);
        addButton.setLayoutY(colNames.size()*50 - 50);
        addButton.setOnAction(e-> {
            ArrayList<String> newdata = new ArrayList<>();
            for(int i=1; i<colNames.size(); i++) {
                TextField textField = (TextField) addForm.getChildren().get(i);
                if(textField.getText().equals("")) {
                    Toast.get().showError(colNames.get(i) + " cannot be empty");
                    return;
                }
                newdata.add(textField.getText());
            }
            callback.accept(newdata);
        });

        addForm.getChildren().add(addButton);
        addForm.prefWidthProperty().bind(mainContent.widthProperty());
        mainContent.getChildren().add(addForm);
    }

    // DETAIL FORM - UPDATE + DELETE
    public static <T> void changeToDetailForm(String mode, T data, ArrayList<String> dataString, Text title, String titlename, Pane mainContent, Stage primaryStage, ArrayList<String> colNames, Consumer<ArrayList<String>> updateCallback, Consumer<Integer> deleteCallback, Function<Void,Void> load) {
        title.setText(titlename + " Details");
        Utils.get().hide();

        Pane detailForm = new Pane();

        // // add back button
        Button backButton = new Button("< Go Back To " + titlename + " List");
        backButton.getStyleClass().add("back-button");
        backButton.setLayoutY(-60);
        backButton.setOnAction(e -> {
            load.apply(null);
        });
        detailForm.getChildren().add(backButton);

        if(dataString != null) {
            createTextFieldsWithData(dataString, colNames, detailForm, mode);
        }else {
            createTextFields(data, colNames, detailForm ,mode);
        }
        if(mode != "view") {createSubmitButton(data, colNames, detailForm, updateCallback);}
        if(mode != "view") {createDeleteButton(data, colNames, detailForm, deleteCallback);}

        detailForm.prefWidthProperty().bind(mainContent.widthProperty());
        mainContent.getChildren().clear();
        mainContent.getChildren().add(detailForm);
    }

    // ADD FORM
    private static <T> void createTextFields(T data, ArrayList<String> colNames, Pane detailForm, String mode) {
        for(int i=0; i<colNames.size(); i++) {
            TextField textField = new TextField();
            textField.setLayoutY(i*50);
            textField.setPromptText(colNames.get(i));
            textField.setMaxWidth(Double.MAX_VALUE);
            textField.prefWidthProperty().bind(detailForm.widthProperty());
            if(mode == "view") textField.setEditable(false);
            // invoke the getter method from the object
            try {
                String methodName = "get" + String.join("", colNames.get(i).split(" "));
                Object result = data.getClass().getMethod(methodName).invoke(data);
            
                // Convert the result to String before setting it in the textField
                textField.setText(String.valueOf(result));
            } catch (Exception e) {
                e.printStackTrace(); // Handle the exception appropriately
            }

            if(colNames.get(i) == "ID") {
                textField.setEditable(false);
            }
            detailForm.getChildren().add(textField);
        }
    }

    public static <T> void createTextFieldsWithData(ArrayList<String> data, ArrayList<String> colNames, Pane detailForm, String mode) {
        for(int i=0; i<colNames.size(); i++) {
            TextField textField = new TextField();
            textField.setLayoutY(i*50);
            textField.setPromptText(colNames.get(i));
            textField.setMaxWidth(Double.MAX_VALUE);
            textField.prefWidthProperty().bind(detailForm.widthProperty());
            if(mode == "view") textField.setEditable(false);

            textField.setText(data.get(i));

            if(colNames.get(i) == "ID"  ||colNames.get(i) == "Created By" ) {
                textField.setEditable(false);
            }
            detailForm.getChildren().add(textField);
        }
    }

    // SUBMIT BUTTON
    private static <T> void createSubmitButton(T data, ArrayList<String> colNames, Pane detailForm, Consumer<ArrayList<String>> callback ) {
        Button submitButton = new Button("Submit");
        submitButton.getStyleClass().add("form-add-btn");
        submitButton.setLayoutY(colNames.size()*50);
        submitButton.setPrefWidth(100);

        submitButton.setOnAction(e -> {
            ArrayList<String> newdata = new ArrayList<>();
            for(int i=1; i<colNames.size(); i++) {
                TextField textField = (TextField) detailForm.getChildren().get(i);
                if(textField.getText().equals("")) {
                    Toast.get().showError(colNames.get(i) + " cannot be empty");
                    return;
                }
                newdata.add(textField.getText());
            }
            callback.accept(newdata);
        });
        detailForm.getChildren().add(submitButton);
    }

    private static <T> void createDeleteButton(T data, ArrayList<String> colNames, Pane detailForm, Consumer<Integer> callback) {
        Button deleteButton = new Button("Delete");
        deleteButton.setLayoutX(110);
        deleteButton.setLayoutY(colNames.size()*50);
        deleteButton.setPrefWidth(100);
        deleteButton.getStyleClass().add("form-delete-btn");

        deleteButton.setOnAction(e -> {
            int id = Integer.parseInt(((TextField) detailForm.getChildren().get(1)).getText());
            callback.accept(id);
        });
        detailForm.getChildren().add(deleteButton);
    }
}
