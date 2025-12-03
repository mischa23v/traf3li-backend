package com.lawFirm.utils;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.scene.control.Button;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.Pane;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class Table {

    public interface TableData {
        ArrayList<String> getColumnNames();
        ArrayList<String> getCellData();
    }

    public static <T> void generateTable(List<T> data, TableView<T> tableView, Pane mainContent, ArrayList<String> colNames, ArrayList<String> cellData, Consumer<T> callback) {

        if(data.size() == 0 || data == null) {
            mainContent.getChildren().clear();
            mainContent.getChildren().add(new Button("No data found"));
            return;
        }

        ObservableList<T> observableData = FXCollections.observableArrayList(data);

        // Clear existing columns
        tableView.getColumns().clear();

        for(int i=0; i<cellData.size(); i++) {
            TableColumn<T, String> column = new TableColumn<>(colNames.get(i));
            column.setCellValueFactory(new PropertyValueFactory<>(cellData.get(i)));
            tableView.getColumns().add(column);
        }

        // add details button the last column
        TableColumn<T, Void> detailColumn = new TableColumn<>("Details");
        detailColumn.setCellFactory(param -> new TableCell<T, Void>() {
            private final Button detailButton = new Button("Details");
            {
                detailButton.getStyleClass().add("table-detail-btn"); 
                detailButton.setPrefHeight(10);
                detailButton.setOnAction(event -> {
                    T data = getTableView().getItems().get(getIndex());
                    callback.accept(data);
                });
            }

            @Override
            public void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                setGraphic(empty ? null : detailButton);
            }
        });
        tableView.getColumns().add(detailColumn);

        // Add data to the table
        tableView.setItems(observableData);

        // Enable horizontal scrolling by setting column resize policy
        tableView.setMaxHeight(Double.MAX_VALUE);
        tableView.setMaxWidth(Double.MAX_VALUE);
        tableView.prefWidthProperty().bind(mainContent.widthProperty());

        tableView.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);
        tableView.getStyleClass().add("table-view");

        mainContent.getChildren().clear();
        mainContent.getChildren().add(tableView);
    }
}
