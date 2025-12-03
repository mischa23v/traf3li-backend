package com.lawFirm.utils;

import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.stage.Stage;

public class Utils {
    
    private static Utils instance = null;
    private Stage primaryStage;    

    private Utils() {
    }

    public static Utils get() {
        if (instance == null) {
            instance = new Utils();
        }
        return instance;
    }
    public void setPrimaryStage(Stage primaryStage) {
        this.primaryStage = primaryStage;
    }

    public void hide() {
        TextField searchField = (TextField) primaryStage.getScene().lookup("#main_searchinput");
        searchField.setVisible(false);
        Button addButton = (Button) primaryStage.getScene().lookup("#main_addbtn");
        addButton.setVisible(false);
        Button searchButton = (Button) primaryStage.getScene().lookup("#main_searchbtn");
        searchButton.setVisible(false);
    }

    public void show() {
        TextField searchField = (TextField) primaryStage.getScene().lookup("#main_searchinput");
        searchField.setVisible(true);
        Button addButton = (Button) primaryStage.getScene().lookup("#main_addbtn");
        addButton.setVisible(true);
        Button searchButton = (Button) primaryStage.getScene().lookup("#main_searchbtn");
        searchButton.setVisible(true);
    }

}
