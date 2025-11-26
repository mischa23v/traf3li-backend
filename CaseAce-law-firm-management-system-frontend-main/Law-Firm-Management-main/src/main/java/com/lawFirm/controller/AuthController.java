package com.lawFirm.controller;

import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Hyperlink;
import javafx.scene.layout.VBox;
import javafx.scene.control.TextField;
import javafx.scene.control.PasswordField;
import javafx.stage.Stage;

import java.sql.Connection;

import com.lawFirm.beans.User;
import com.lawFirm.dao.AuthDAO;
import com.lawFirm.manager.UserManager;
import com.lawFirm.utils.Toast;

public class AuthController {
    
    private Stage primaryStage;
    private LoginCallback loginCallback;
    private AuthDAO auth;

    public AuthController(Stage primaryStage, Connection conn, LoginCallback loginCallback) {
        this.primaryStage = primaryStage;
        this.loginCallback = loginCallback;
        auth = new AuthDAO(conn);
    }

    public interface LoginCallback {
        void onLoginSuccess(Stage primaryStage);
    }

    private void setNewStage(String title, VBox root) {
        primaryStage.setTitle(title);
        primaryStage.setScene(new Scene(root));
        primaryStage.show();
    }

    // Pages creation for login 
    public void createLogin() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/login.fxml"));
            VBox root = loader.load();

            createLoginEventListeners(root);
            setNewStage("Login", root);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

 // Pages creation for signup
    public void createSignUp() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/signup.fxml"));
            VBox root = loader.load();

            // Create event listeners
            createSignUpEventListeners(root);
            setNewStage("Sign Up", root);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // event listeners for login page
    public void createLoginEventListeners(VBox root) {
        Hyperlink signupLink = (Hyperlink) root.lookup("#signupLink");
        signupLink.setOnAction(e -> {
            createSignUp();
        });

        @SuppressWarnings("unchecked")
        ComboBox<String> roleCombo = (ComboBox<String>) root.lookup("#login_role");
        roleCombo.getItems().addAll("Admin", "Staff");

        // Login button event listener
        Button login = (Button) root.lookup("#loginButton");
        // add enter key event listener
        root.setOnKeyPressed(event -> {
            switch (event.getCode()) {
                case ENTER:
                    runLogin(root);
                    break;
                default:
                    break;
            }
        });
        login.setOnAction(e -> {
            runLogin(root);
        });
    }

    // Login function
    private void runLogin(VBox root) {
        // Get username and password
        String email = ((TextField) root.lookup("#login_email")).getText();
        String password = ((PasswordField) root.lookup("#login_password")).getText();
        @SuppressWarnings("unchecked")
        String role = ((ComboBox<String>) root.lookup("#login_role")).getValue();

        if(email.equals("") || password.equals("")) {
            Toast.get().showError("Email or password is empty");
            return;
        }

        if(role == null) {
            Toast.get().showError("Please select a role");
            return;
        }

        User user = null;
        String roleType = null;

        if (role.equals("Staff")) {
            user = auth.loginStaff(email, password);
            roleType = "staff";
        } else if (role.equals("Admin")) {
            user = auth.loginAdmin(email, password);
            roleType = "admin";
        }

        if (user != null) {
            UserManager.get().setUser(roleType, user);
            Toast.get().showSuccess("Login successful");
            if (loginCallback != null) {
                loginCallback.onLoginSuccess(this.primaryStage);
            }
        } else {
            Toast.get().showError("Incorrect email or password");
        }
    }

    // event listeners for signup page
    public void createSignUpEventListeners(VBox root) {
        // Change the scene to login
        Hyperlink loginLink = (Hyperlink) root.lookup("#loginLink");
        loginLink.setOnAction(event -> {
            createLogin();
        });

        @SuppressWarnings("unchecked")
        ComboBox<String> roleCombo = (ComboBox<String>) root.lookup("#signup_role");
        roleCombo.getItems().addAll("Admin", "Staff");

         // Sign up button event listener
        Button signup = (Button) root.lookup("#signupButton");
        // add enter key event listener
        root.setOnKeyPressed(event -> {
            switch (event.getCode()) {
                case ENTER:
                    runSignUp(root);
                    break;
                default:
                    break;
            }
        });
        signup.setOnAction(e -> {
            runSignUp(root);
        });
    }

    // Signup function
    private void runSignUp(VBox root) {
        // account details
        String firstname = ((javafx.scene.control.TextField) root.lookup("#signup_firstname")).getText();
        String lastname = ((javafx.scene.control.TextField) root.lookup("#signup_lastname")).getText();
        String phone = ((javafx.scene.control.TextField) root.lookup("#signup_phone")).getText();
        String address = ((javafx.scene.control.TextArea) root.lookup("#signup_address")).getText();

        // account credentials
        String email = ((javafx.scene.control.TextField) root.lookup("#signup_email")).getText();
        String password = ((javafx.scene.control.PasswordField) root.lookup("#signup_password")).getText();

        // role type
        @SuppressWarnings("unchecked")
        String role = ((ComboBox<String>) root.lookup("#signup_role")).getValue();

        String[] inputs = {firstname, lastname, phone, address, email, password};
        String errors = "";
        for(String input : inputs) {
            if(input.equals("")) {
                errors += input + " is empty\n";
                return;
            }
        }
        if(!errors.equals("")) {
            Toast.get().showError(errors);
            return;
        }

        boolean response = auth.register(firstname, lastname, phone, address, email, password, role);
        if(response) {
            Toast.get().showSuccess("Signup successful");
            createLogin();
        } else {
            Toast.get().showError("Signup failed");
        }
    }

}
