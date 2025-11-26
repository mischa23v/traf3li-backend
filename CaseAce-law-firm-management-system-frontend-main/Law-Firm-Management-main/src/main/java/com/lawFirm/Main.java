package com.lawFirm;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.stage.Stage;
import javafx.scene.Scene;
import javafx.scene.layout.VBox;

import java.sql.*;
import java.util.Objects;

import com.lawFirm.controller.AuthController;
import com.lawFirm.controller.NavController;
import com.lawFirm.utils.Utils;

public class Main extends Application implements AuthController.LoginCallback {

    static Connection conn;

	@Override
	public void start(Stage primaryStage) {
		// uncomment for development
		// showMainPage(primaryStage);
		// uncomment for production
		try {
			AuthController authController = new AuthController(primaryStage, conn, this);
			authController.createLogin();

		} catch(Exception e) {
			e.printStackTrace();
		}
	}

	@Override
	public void onLoginSuccess(Stage primaryStage) {
		showMainPage(primaryStage);
	}

	public void showMainPage(Stage primaryStage) {
		Utils.get().setPrimaryStage(primaryStage);
		try {
			FXMLLoader loader = new FXMLLoader(getClass().getResource("/main.fxml"));
			VBox root = loader.load();

			// Use css file for styling
			root.getStylesheets().add(Objects.requireNonNull(getClass().getResource("/application.css")).toExternalForm());

			primaryStage.setTitle("Main");
			primaryStage.setScene(new Scene(root));
			primaryStage.show();
		} catch (Exception e) {
			e.printStackTrace();
		}

		// Add navbar controller 
		NavController navController = new NavController(primaryStage, conn);
		navController.createEventListeners();
	}
	
	public static void main(String[] args) throws Exception{
        String url = "jdbc:sqlite:lawfirm.db";
        conn = DriverManager.getConnection(url);
        System.out.println("Connection to SQLite has been established.");
		launch(args);
	}
}
