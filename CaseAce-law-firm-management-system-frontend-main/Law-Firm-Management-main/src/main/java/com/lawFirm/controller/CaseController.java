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

import com.lawFirm.beans.Case;
import com.lawFirm.dao.CaseDAO;
import com.lawFirm.utils.CaseForm;
import com.lawFirm.utils.Table;
import com.lawFirm.utils.Toast;
import com.lawFirm.utils.Utils;

@FunctionalInterface
interface CFunction {
    void apply();
}
public class CaseController {
    
    private Stage primaryStage;
    private CaseDAO caseDAO;
    private Connection conn;
    private TableView<Case> tableView;

    private Pane mainContent;
    private Text title;

    private ArrayList<String> colNames;
    private ArrayList<String> cellData;

    public CaseController(Stage primaryStage, Connection conn, Pane mainContent) {
        this.primaryStage = primaryStage;
        this.mainContent = mainContent;
        this.conn = conn;
        caseDAO = new CaseDAO(conn);
        tableView = new TableView<>();
        title = (Text) primaryStage.getScene().lookup("#main_title");

        Case caseobj = new Case();
        colNames = caseobj.getColumnNames();
        cellData = caseobj.getCellData();
    }

    public void load() {
        title.setText("Cases List");
        Utils.get().show();
        
        // Fetch data from the database
        List<Case> cases = fetchData();

        // Search button functionality
        Button searchButton = (Button) primaryStage.getScene().lookup("#main_searchbtn");
        TextField searchInput = (TextField) primaryStage.getScene().lookup("#main_searchinput");
        searchButton.setLayoutX(593);
        searchInput.setPrefWidth(567);
        searchButton.setOnAction(e -> {
            searchData();
        });
        
        // Add button functionality
        Button addButton = (Button) primaryStage.getScene().lookup("#main_addbtn");
        addButton.setOnAction(e -> {
            changeToAddCase();
        });

        // Generate table
        Table.generateTable(cases, tableView, mainContent, colNames, cellData, this::changeToDetailCase);
    }

    private List<Case> fetchData() {
        return caseDAO.getCases();
    }

    private void searchData() {
        TextField searchField = (TextField) primaryStage.getScene().lookup("#main_searchinput");
        String searchQuery = searchField.getText();

        String stmt = "SELECT * FROM Cases " +
                    " WHERE title LIKE '%" + searchQuery + "%' " +
                    " OR description LIKE '%" + searchQuery + "%' " +
                    " OR status LIKE '%" + searchQuery + "%' " +
                    " OR clientID LIKE '%" + searchQuery + "%' " +
                    " OR staffID LIKE '%" + searchQuery + "%' ";
        List<Case> cases = caseDAO.getCaseQuery(stmt);

        Table.generateTable(cases, tableView, mainContent, colNames, cellData, this::changeToDetailCase);
    }

    public void changeToAddCase() {
        Function <Void, Void> goBack = (id) -> {
            load();
            return null;
        };
        CaseForm caseForm = new CaseForm(conn, goBack);
        caseForm.changeToAddForm(title, mainContent, primaryStage,this::addAction);
    }

    private void addAction(ArrayList<String> newdata) {
        Case newCase = new Case();
        newCase.setTitle(newdata.get(0));
        newCase.setDescription(newdata.get(1));
        newCase.setStatus(newdata.get(2));
        newCase.setClientId(newdata.get(3));
        newCase.setStaffId(newdata.get(4));
        boolean response = caseDAO.addCase(newCase);
        if(response) {
            Toast.get().showSuccess("Case added successfully");
            load();
        } else {
            Toast.get().showError("Error adding case");
        }
    }

    public void changeToDetailCase(Case caseobj) {
        Function <Void, Void> goBack = (id) -> {
            load();
            return null;
        };
        CaseForm caseForm = new CaseForm(conn, goBack);
        caseForm.changeToDetailForm(caseobj, title, mainContent, primaryStage, this::updateAction, this::deleteAction);
    }

    private void updateAction(ArrayList<String> newdata) {
        Case newCase = new Case();
        newCase.setID(Integer.parseInt(newdata.get(0)));
        newCase.setTitle(newdata.get(1));
        newCase.setDescription(newdata.get(2));
        newCase.setStatus(newdata.get(3));
        newCase.setClientId(newdata.get(4));
        newCase.setStaffId(newdata.get(5));
        boolean response = caseDAO.updateCase(newCase);
        if(response) {
            Toast.get().showSuccess("Case updated successfully");
        }else {
            Toast.get().showError("Error updating case");
        }
    }

    private void deleteAction(Integer id) {
        boolean response = caseDAO.deleteCase(id);
        if(response) {
            Toast.get().showSuccess("Case deleted successfully");
            load();
        }else {
            Toast.get().showError("Error deleting case");
        }
    }
}

