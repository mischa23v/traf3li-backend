package com.lawFirm.controller;

import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import javafx.scene.control.Button;
import javafx.scene.control.TableView;
import javafx.scene.control.TextField;
import javafx.scene.layout.Pane;
import javafx.scene.text.Text;
import javafx.stage.Stage;

import com.lawFirm.beans.Staff;
import com.lawFirm.dao.StaffDAO;
import com.lawFirm.utils.Form;
import com.lawFirm.utils.Table;
import com.lawFirm.utils.Toast;
import com.lawFirm.utils.Utils;

import com.lawFirm.manager.UserManager;

public class StaffController {
    
    private Stage primaryStage;
    private StaffDAO staffDAO;
    private TableView<Staff> tableView;

    private Pane mainContent;
    private Text title;

    private ArrayList<String> colNames;
    private ArrayList<String> cellData;

    public StaffController(Stage primaryStage, Connection conn, Pane mainContent) {
        this.primaryStage = primaryStage;
        staffDAO = new StaffDAO(conn);
        tableView = new TableView<>();
        this.mainContent = mainContent;
        title = (Text) primaryStage.getScene().lookup("#main_title");

        // Get column names and cell data
        Staff staffobj = new Staff();
        colNames = staffobj.getColumnNames();
        cellData = staffobj.getCellData();

        //remove the last colNames and cellData element
        colNames.remove(colNames.size() - 1);
        cellData.remove(cellData.size() - 1);
    }

    public void load() {
        title.setText("Staffs List");
        Utils.get().show();
        // Fetch data from the database
        List<Staff> staffs = fetchData(); 

        Object user = UserManager.get().getData();
        // check if user is empty, if empty try get Admin
        if(user == null) {
            user = UserManager.get().getData();
        }

        // Search button functionality
        Button searchButton = (Button) primaryStage.getScene().lookup("#main_searchbtn");
        TextField searchInput = (TextField) primaryStage.getScene().lookup("#main_searchinput");
        // if user is not admin, set search button width to full
        if(user instanceof Staff) {
            searchButton.setLayoutX(688);
            searchInput.setPrefWidth(660);
        }

        searchButton.setOnAction(e -> {
            searchData();
        });


        // Add button functionality
        Button addButton = (Button) primaryStage.getScene().lookup("#main_addbtn");
        // if user is not admin, hide add button
        if(user instanceof Staff) {
            addButton.setVisible(false);
        }else{
            addButton.setOnAction(e -> {
                changeToAddStaff();
            });
        }

        // Generate table
        Staff staffobj = new Staff();
        ArrayList<String> newcolNames = staffobj.getColumnNames();
        ArrayList<String> newcellData = staffobj.getCellData();
        //remove the last colNames and cellData element
        newcolNames.remove(newcolNames.size() - 1);
        newcellData.remove(newcellData.size() - 1);
        Table.generateTable(staffs, tableView, mainContent, newcolNames, newcellData, this::changeToDetailStaff);
    }

    private List<Staff> fetchData() {
        return staffDAO.getStaffs();
    }

    private void searchData() {
        TextField searchField = (TextField) primaryStage.getScene().lookup("#main_searchinput");
        String searchInput = searchField.getText();

        String stmt = "";
        if(searchInput.isEmpty()) {
            stmt = "SELECT * FROM Users " +
            "WHERE role = 'staff'";
        }else {
            stmt = "SELECT * FROM Users " +
            "WHERE role = 'staff' AND firstName LIKE '%" + searchInput + "%' " +
            "   OR lastName LIKE '%" + searchInput + "%' " +
            "   OR phone LIKE '%" + searchInput + "%' " +
            "   OR address LIKE '%" + searchInput + "%' " +
            "   OR email LIKE '%" + searchInput + "%'";
        }

        List<Staff> staffs = staffDAO.getStaffQuery(stmt);

        // Generate table
        Staff staffobj = new Staff();
        ArrayList<String> newcolNames = staffobj.getColumnNames();
        ArrayList<String> newcellData = staffobj.getCellData();
        //remove the last colNames and cellData element
        newcolNames.remove(newcolNames.size() - 1);
        newcellData.remove(newcellData.size() - 1);

        // Generate table
        Table.generateTable(staffs, tableView, mainContent, newcolNames, newcellData, this::changeToDetailStaff);
    }

    public void changeToAddStaff() {
        Function <Void, Void> goBack = (id) -> {
            load();
            return null;
        };
        Staff staffobj = new Staff();
        ArrayList<String> newcolNames = staffobj.getColumnNames();
        ArrayList<String> newcellData = staffobj.getCellData();
        Form.changeToAddForm(title, "Staff", mainContent, primaryStage, newcolNames, newcellData, this::addAction, goBack);
    }

    private void addAction(ArrayList<String> newdata) {
        Staff newStaff = new Staff();
        newStaff.setFirstName(newdata.get(0));
        newStaff.setLastName(newdata.get(1));
        newStaff.setPhone(newdata.get(2));
        newStaff.setAddress(newdata.get(3));
        newStaff.setEmail(newdata.get(4));
        newStaff.setPassword(newdata.get(5));
        boolean response = staffDAO.addStaff(newStaff);
        if(response) {
            Toast.get().showSuccess("Staff added successfully");
            load();
        } else {
            Toast.get().showError("Error adding staff");
        }
    }

    public void changeToDetailStaff(Staff data) {
        Function <Void, Void> goBack = (id) -> {
            load();
            return null;
        };
        Form.changeToDetailForm("view",data, null, title,"Staff", mainContent, primaryStage, colNames, this::updateAction, this::deleteAction, goBack);
    }

    public void updateAction(ArrayList<String> newdata) {
        Staff newStaff = new Staff();
        newStaff.setID(Integer.parseInt(newdata.get(0)));
        newStaff.setFirstName(newdata.get(1));
        newStaff.setLastName(newdata.get(2));
        newStaff.setPhone(newdata.get(3));
        newStaff.setAddress(newdata.get(4));
        newStaff.setEmail(newdata.get(5));
        boolean response = staffDAO.updateStaff(newStaff);
        if(response) {
            Toast.get().showSuccess("Staff updated successfully");
        } else {
            Toast.get().showError("Error updating staff");
        }
    }

    public void deleteAction(int id) {
        boolean response = staffDAO.deleteStaff(id);
        if(response) {
            Toast.get().showSuccess("Staff deleted successfully");
            load();
        } else {
            Toast.get().showError("Error deleting staff");
        }
    }
}
