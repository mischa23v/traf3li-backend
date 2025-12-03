package com.lawFirm.utils;

import javafx.scene.control.Alert;
import javafx.scene.control.Alert.AlertType;

public class Toast {

    private static Toast instance = null;

    private Toast() {
    }

    public static Toast get() {
        if (instance == null) {
            instance = new Toast();
        }
        return instance;
    }

    public void showError(String message) {
        showAlert(AlertType.ERROR, "Error", message);
    }

    public void showSuccess(String message) {
        showAlert(AlertType.INFORMATION, "Success", message);
    }

    public void showInformation(String message) {
        showAlert(AlertType.INFORMATION, "Information", message);
    }

    private void showAlert(AlertType alertType, String title, String message) {
        Alert alert = new Alert(alertType);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }
}
