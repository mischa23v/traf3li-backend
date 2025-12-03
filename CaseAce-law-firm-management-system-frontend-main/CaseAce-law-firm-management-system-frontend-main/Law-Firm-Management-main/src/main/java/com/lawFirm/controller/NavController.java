package com.lawFirm.controller;

import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.scene.control.TextArea;
import javafx.scene.layout.AnchorPane;
import javafx.scene.layout.Pane;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import javafx.fxml.FXMLLoader;
import javafx.scene.layout.VBox;

import java.sql.Connection;

import com.lawFirm.utils.Toast;
import com.lawFirm.utils.Utils;

import com.lawFirm.manager.UserManager;
import com.lawFirm.beans.Staff;
import com.lawFirm.beans.User;
import com.lawFirm.Main;
import com.lawFirm.beans.Admin;
import com.lawFirm.dao.StaffDAO;
import com.lawFirm.dao.AdminDAO;
import com.lawFirm.dao.CaseDAO;

public class NavController {

    private Stage primaryStage;
    private Connection conn;
    private Pane mainContent;
    private StaffDAO staffDAO;
    private AdminDAO adminDAO;

    public NavController() {}
    
    public NavController(Stage primaryStage, Connection conn) {
        this.primaryStage = primaryStage;
        this.conn = conn;
        this.staffDAO = new StaffDAO(conn);
        this.adminDAO = new AdminDAO(conn);
        this.mainContent = (Pane) primaryStage.getScene().lookup("#main_content");
    }

    public void createEventListeners() {
        showHome();

        Button navHome = (Button) primaryStage.getScene().lookup("#nav_home");
        Button navClient = (Button) primaryStage.getScene().lookup("#nav_clients");
        Button navStaff = (Button) primaryStage.getScene().lookup("#nav_staffs");
        Button navCase = (Button) primaryStage.getScene().lookup("#nav_cases");

        navHome.setOnAction(e-> {
            showHome();
        });

        navClient.setOnAction(e-> {
            Utils.get().show();
            ClientController clientController = new ClientController(primaryStage, conn, mainContent);
            clientController.load();
        });

        navStaff.setOnAction(e -> {
            Utils.get().show();
            StaffController staffController = new StaffController(primaryStage, conn, mainContent);
            staffController.load();
        });

        navCase.setOnAction(e -> {
            Utils.get().show();
            CaseController caseController = new CaseController(primaryStage, conn, mainContent);
            caseController.load();
        });
    }

    
    private void showHome() {
        mainContent.getChildren().clear();

        Text title = (Text) primaryStage.getScene().lookup("#main_title");
        title.setText("Dashboard");

        // set the vbox with id dashboard_vbox layout Y to 0
        VBox dashboardVbox = new VBox();

        try {
            dashboardVbox = FXMLLoader.load(getClass().getResource("/dashboard.fxml"));
            mainContent.getChildren().add(dashboardVbox);
        } catch (Exception e) {
            System.out.println(e);
        }

        dashboardVbox.setLayoutY(-75);
        dashboardVbox.setLayoutX(-15);

        // populate the dashboard input with user data
        AnchorPane dashboardPane = (AnchorPane) primaryStage.getScene().lookup("#dashboard_page");
        // get the input filed inside the dashboard pane by id of the children
        
        TextField dashboardFirstName= (TextField) dashboardPane.lookup("#dashboard-firstname_input");
        TextField dashboardLastName = (TextField) primaryStage.getScene().lookup("#dashboard-lastname_input");
        TextField dashboardEmail = (TextField) primaryStage.getScene().lookup("#dashboard-email_input");
        TextField dashboardPhone = (TextField) primaryStage.getScene().lookup("#dashboard-phone_input");
        TextArea dashboardAddress = (TextArea) primaryStage.getScene().lookup("#dashboard-address_input");

        Object user = UserManager.get().getData();

        if(user instanceof Staff) {
            Staff staff = (Staff) user;
            dashboardFirstName.setText(staff.getFirstName());
            dashboardLastName.setText(staff.getLastName());
            dashboardEmail.setText(staff.getEmail());
            dashboardPhone.setText(staff.getPhone());
            dashboardAddress.setText(staff.getAddress());
        }else if(user instanceof Admin) {
            Admin admin = (Admin) user;
            dashboardFirstName.setText(admin.getFirstName());
            dashboardLastName.setText(admin.getLastName());
            dashboardEmail.setText(admin.getEmail());
            dashboardPhone.setText(admin.getPhone());
            dashboardAddress.setText(admin.getAddress());
        }

        // on click update button update the user data
        Button dashboardUpdateBtn = (Button) primaryStage.getScene().lookup("#dashboard-edit_btn");
        dashboardUpdateBtn.getStyleClass().add("dashboard-edit_btn");
        dashboardUpdateBtn.setOnAction(e -> {
            // get the user data from the input field
            String firstName = dashboardFirstName.getText();
            String lastName = dashboardLastName.getText();
            String email = dashboardEmail.getText();
            String phone = dashboardPhone.getText();
            String address = dashboardAddress.getText();

            // check if user is empty, if empty try get Admin
            if(user instanceof Staff) {
                Staff staff = (Staff) user;
                staff.setFirstName(firstName);
                staff.setLastName(lastName);
                staff.setEmail(email);
                staff.setPhone(phone);
                staff.setAddress(address);
                staffDAO.updateStaff(staff);
                
            }else if(user instanceof Admin) {
                Admin admin = (Admin) user;
                admin.setFirstName(firstName);
                admin.setLastName(lastName);
                admin.setEmail(email);
                admin.setPhone(phone);
                admin.setAddress(address);
                adminDAO.updateAdmin(admin);
            }

            Toast.get().showSuccess("User data updated successfully");
        });

        Button dashboardLogButton = (Button) primaryStage.getScene().lookup("#dashboard-logout_btn");
        dashboardLogButton.setOnAction(e -> {
            Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
            alert.setTitle("Logout");
            alert.setHeaderText("Are you sure you want to logout?");
            alert.showAndWait();
            if(alert.getResult().getText().equals("OK")) {
                try {
                    Main main = new Main();
                    main.start(primaryStage);
                } catch (Exception error) {
                    // TODO: handle exception
                    System.out.println(error);
                }
            }else {
                alert.close();
            }

        });
        // Hide search and add button in the homepage
        Utils.get().hide();
    }

    public void clickCase() {
        Utils.get().show();
        CaseController caseController = new CaseController(primaryStage, conn, mainContent);
        caseController.load();
    }
}