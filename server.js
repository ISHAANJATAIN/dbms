require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
    } else {
        console.log('Connected to MySQL Database!');
        connection.release();
    }
});

// --- API ROUTES ---

// 1. LOGIN
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    pool.query('SELECT * FROM USERS WHERE Username = ? AND Password = ?', [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            res.json({ success: true, user: { username: results[0].Username, role: results[0].Role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// 2. REGISTER
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    pool.query('INSERT INTO USERS (Username, Password) VALUES (?, ?)', [username, password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Account created successfully' });
    });
});

// 3. CUSTOMERS
app.get('/api/customers', (req, res) => {
    pool.query('SELECT * FROM CUSTOMER', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/customers', (req, res) => {
    const { Name, Email, Phone, Address } = req.body;
    pool.query('INSERT INTO CUSTOMER (Name, Email, Phone, Address) VALUES (?, ?, ?, ?)', 
        [Name, Email, Phone, Address], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, ...req.body });
        }
    );
});

// 4. SHIPMENTS
app.get('/api/shipments', (req, res) => {
    const query = `
        SELECT s.ShipmentID, c.Name as CustomerName, r.Source, r.Destination, v.VehicleNumber, s.PickupDate, s.DeliveryDate, s.Status
        FROM SHIPMENT s
        LEFT JOIN CUSTOMER c ON s.CustomerID = c.CustomerID
        LEFT JOIN ROUTE r ON s.RouteID = r.RouteID
        LEFT JOIN VEHICLE v ON s.VehicleID = v.VehicleID
    `;
    pool.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/shipments', (req, res) => {
    let { CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight } = req.body;
    
    // FIX: Validate and convert all IDs to integers
    CustomerID = parseInt(CustomerID);
    RouteID = parseInt(RouteID);
    VehicleID = parseInt(VehicleID);
    Weight = parseFloat(Weight);

    // Validate all required fields
    if (!CustomerID || !RouteID || !VehicleID || !PickupDate || !DeliveryDate || !Weight) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // FIX: Validate that IDs are valid numbers
    if (isNaN(CustomerID) || isNaN(RouteID) || isNaN(VehicleID)) {
        return res.status(400).json({ error: 'Invalid Customer, Route, or Vehicle ID. Must be valid numbers.' });
    }

    console.log('Creating shipment with:', { CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight });
    
    pool.query('INSERT INTO SHIPMENT (CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight) VALUES (?, ?, ?, ?, ?, ?)', 
        [CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight], 
        (err, result) => {
            if (err) {
                console.error('Shipment insert error:', err.message);
                
                // FIX: Better error message for foreign key constraint
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(400).json({ 
                        error: 'Invalid Customer ID, Route ID, or Vehicle ID. Please ensure they exist in the database.' 
                    });
                }
                
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ 
                success: true,
                ShipmentID: result.insertId, 
                CustomerID,
                RouteID,
                VehicleID,
                PickupDate,
                DeliveryDate,
                Weight,
                Status: 'Pending' 
            });
        }
    );
});

// 5. ROUTES
app.get('/api/routes', (req, res) => {
    pool.query('SELECT * FROM ROUTE', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 6. VEHICLES
app.get('/api/vehicles', (req, res) => {
    pool.query('SELECT * FROM VEHICLE', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 7. DRIVERS
app.get('/api/drivers', (req, res) => {
    const query = `
        SELECT d.DriverID, d.Name, d.LicenseNumber, d.Phone, v.VehicleNumber
        FROM DRIVER d
        LEFT JOIN VEHICLE v ON d.VehicleID = v.VehicleID
    `;
    pool.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 8. PAYMENTS
app.get('/api/payments', (req, res) => {
    pool.query('SELECT * FROM PAYMENT', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});