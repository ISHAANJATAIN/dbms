CREATE DATABASE IF NOT EXISTS shipment_management;
USE shipment_management;

-- 1. CUSTOMER Table
CREATE TABLE IF NOT EXISTS CUSTOMER (
    CustomerID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE,
    Phone VARCHAR(20),
    Address TEXT
);

-- 2. ROUTE Table
CREATE TABLE IF NOT EXISTS ROUTE (
    RouteID INT PRIMARY KEY AUTO_INCREMENT,
    Source VARCHAR(100) NOT NULL,
    Destination VARCHAR(100) NOT NULL,
    Distance DECIMAL(10,2),
    EstimatedTime VARCHAR(50)
);

-- 3. VEHICLE Table
CREATE TABLE IF NOT EXISTS VEHICLE (
    VehicleID INT PRIMARY KEY AUTO_INCREMENT,
    VehicleNumber VARCHAR(50) UNIQUE NOT NULL,
    VehicleType VARCHAR(50),
    Capacity DECIMAL(10,2),
    Status VARCHAR(20) DEFAULT 'Available'
);

-- 4. DRIVER Table
CREATE TABLE IF NOT EXISTS DRIVER (
    DriverID INT PRIMARY KEY AUTO_INCREMENT,
    VehicleID INT,
    Name VARCHAR(100) NOT NULL,
    LicenseNumber VARCHAR(50) UNIQUE,
    Phone VARCHAR(20),
    FOREIGN KEY (VehicleID) REFERENCES VEHICLE(VehicleID) ON DELETE SET NULL
);

-- 5. SHIPMENT Table
CREATE TABLE IF NOT EXISTS SHIPMENT (
    ShipmentID INT PRIMARY KEY AUTO_INCREMENT,
    CustomerID INT,
    RouteID INT,
    VehicleID INT,
    PickupDate DATE,
    DeliveryDate DATE,
    Weight DECIMAL(10,2),
    Status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (CustomerID) REFERENCES CUSTOMER(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (RouteID) REFERENCES ROUTE(RouteID) ON DELETE SET NULL,
    FOREIGN KEY (VehicleID) REFERENCES VEHICLE(VehicleID) ON DELETE SET NULL
);

-- 6. PAYMENT Table
CREATE TABLE IF NOT EXISTS PAYMENT (
    PaymentID INT PRIMARY KEY AUTO_INCREMENT,
    ShipmentID INT,
    PaymentDate DATE,
    Amount DECIMAL(10,2) NOT NULL,
    PaymentMethod VARCHAR(50),
    PaymentStatus VARCHAR(20) DEFAULT 'Unpaid',
    FOREIGN KEY (ShipmentID) REFERENCES SHIPMENT(ShipmentID) ON DELETE CASCADE
);

-- 7. USERS Table for Login
CREATE TABLE IF NOT EXISTS USERS (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Role VARCHAR(20) DEFAULT 'Admin'
);

-- Create a default Admin user (Username: admin, Password: password123)
-- In a real app, passwords should be hashed!
INSERT IGNORE INTO USERS (Username, Password, Role) VALUES ('admin', 'password123', 'Admin');
