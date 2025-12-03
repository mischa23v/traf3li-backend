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

import com.lawFirm.beans.Admin;
import com.lawFirm.beans.Client;
import com.lawFirm.beans.Staff;
import com.lawFirm.dao.AdminDAO;
import com.lawFirm.dao.ClientDAO;
import com.lawFirm.dao.StaffDAO;
import com.lawFirm.manager.UserManager;
import com.lawFirm.utils.Form;
import com.lawFirm.utils.Table;
import com.lawFirm.utils.Toast;
import com.lawFirm.utils.Utils;

public class ClientController {
    
    private Stage primaryStage;
    private ClientDAO clientDAO;
    private StaffDAO staffDAO;
    private AdminDAO adminDAO;
    private TableView<Client> tableView;

    private Pane mainContent;
    private Text title;

    private ArrayList<String> colNames;
    private ArrayList<String> cellData;

    public ClientController(Stage primaryStage, Connection conn, Pane mainContent) {
        this.primaryStage = primaryStage;
        this.mainContent = mainContent;
        clientDAO = new ClientDAO(conn);
        staffDAO = new StaffDAO(conn);
        adminDAO = new AdminDAO(conn);
        tableView = new TableView<>();
        title = (Text) primaryStage.getScene().lookup("#main_title");

        // Get column names and cell data
        Client clientobj = new Client();
        colNames = clientobj.getColumnNames();
        cellData = clientobj.getCellData();
    }

    public void load() {
        title.setText("Clients List");
        Utils.get().show();
        // Fetch data from the database
        List<Client> clients = fetchData(); 

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
            changeToAddClient();
        });
        
        // Generate table
        Table.generateTable(clients, tableView, mainContent, colNames, cellData, this::changeToDetailClient);
    }

    private List<Client> fetchData() {
        return clientDAO.getClients();
    }

    private void searchData() {
        TextField searchField = (TextField) primaryStage.getScene().lookup("#main_searchinput");
        String searchInput = searchField.getText();

        String stmt = "SELECT * FROM Clients " +
                     "WHERE firstName LIKE '%" + searchInput + "%' " +
                     "   OR lastName LIKE '%" + searchInput + "%' " +
                     "   OR phone LIKE '%" + searchInput + "%' " +
                     "   OR email LIKE '%" + searchInput + "%'" + 
                     "   OR createdBy LIKE '%" + searchInput + "%'";
        List<Client> clients = clientDAO.getClientQuery(stmt);

        Client clientobj = new Client();
        ArrayList<String> colNames = clientobj.getColumnNames();
        ArrayList<String> cellData = clientobj.getCellData();

        // Generate table
        Table.generateTable(clients, tableView, mainContent, colNames, cellData, this::changeToDetailClient);
    }

    public void changeToAddClient() {
        Function <Void, Void> goBack = (id) -> {
            load();
            return null;
        };
        Form.changeToAddForm(title, "Client", mainContent, primaryStage, colNames, cellData, this::addAction, goBack);
    }

    private void addAction(ArrayList<String> newdata) {
        Client newClient = new Client();
        newClient.setFirstName(newdata.get(0));
        newClient.setLastName(newdata.get(1));
        newClient.setPhone(newdata.get(2));
        newClient.setEmail(newdata.get(3));
        newClient.setCreatedBy(UserManager.get().getID());
        boolean response = clientDAO.addClient(newClient);
        if(response) {
            Toast.get().showSuccess("Client added successfully");
            load();
        } else {
            Toast.get().showError("Client add failed");
        }
    }

    public void changeToDetailClient(Client data) {
        Function <Void, Void> goBack = (id) -> {
            load();
            return null;
        };

        String creatorName = "";

        Staff staff = staffDAO.getStaff(data.getCreatedBy());
        if(staff == null) {
            Admin admin = adminDAO.getAdmin(data.getCreatedBy());
            if(admin == null) {
                creatorName = "Unknown";
            } else {
                creatorName = admin.getFirstName() + " " + admin.getLastName();
            }
        } else {
            creatorName = staff.getFirstName() + " " + staff.getLastName();
        }
    
        ArrayList<String> columnNames = new ArrayList<>();
        columnNames.addAll(data.getColumnNames());
        columnNames.add("Created By");
        ArrayList<String> dataString = new ArrayList<>();

        dataString.add(String.valueOf(data.getID()));
        dataString.add(data.getFirstName());
        dataString.add(data.getLastName());
        dataString.add(data.getPhone());
        dataString.add(data.getEmail());
        dataString.add(creatorName);

        Form.changeToDetailForm("edit",data, dataString, title, "Client",mainContent, primaryStage, columnNames, this::updateAction, this::deleteAction, goBack);
    }

    private void updateAction(ArrayList<String> newdata) {
        Client newClient = new Client();
        newClient.setID(Integer.parseInt(newdata.get(0)));
        newClient.setFirstName(newdata.get(1));
        newClient.setLastName(newdata.get(2));
        newClient.setPhone(newdata.get(3));
        newClient.setEmail(newdata.get(4));
        newClient.setCreatedBy(Integer.parseInt(newdata.get(5)));
        boolean response = clientDAO.updateClient(newClient);
        if(response) {
            Toast.get().showSuccess("Client updated successfully");
        } else {
            Toast.get().showError("Client update failed");
        }
    }

    private void deleteAction(Integer id) {
        boolean response = clientDAO.deleteClient(id);
        if(response) {
            Toast.get().showSuccess("Client deleted successfully");
            load();
        } else {
            Toast.get().showError("Client delete failed");
        }
    }
}
