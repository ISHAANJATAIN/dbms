require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files from root

// Create MySQL connection pool with async/await support
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
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL Database!');
        connection.release();
    } catch (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
    }
})();

// --- API ROUTES ---

// 1. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const connection = await pool.getConnection();
        const [results] = await connection.query('SELECT * FROM USERS WHERE Username = ? AND Password = ?', [username, password]);
        connection.release();
        
        if (results.length > 0) {
            res.json({ success: true, user: { username: results[0].Username, role: results[0].Role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('❌ Login error:', err.message);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// 2. REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const connection = await pool.getConnection();
        const [result] = await connection.query('INSERT INTO USERS (Username, Password) VALUES (?, ?)', [username, password]);
        connection.release();
        
        res.json({ success: true, message: 'Account created successfully' });
    } catch (err) {
        console.error('❌ Register error:', err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Server error: ' + err.message });
        }
    }
});

// 3. CUSTOMERS
app.get('/api/customers', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query('SELECT * FROM CUSTOMER');
        connection.release();
        res.json(results);
    } catch (err) {
        console.error('❌ Customers fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const { Name, Email, Phone, Address } = req.body;
        
        if (!Name) {
            return res.status(400).json({ error: 'Customer name is required' });
        }

        const connection = await pool.getConnection();
        const [result] = await connection.query('INSERT INTO CUSTOMER (Name, Email, Phone, Address) VALUES (?, ?, ?, ?)', 
            [Name, Email, Phone, Address]);
        connection.release();
        
        res.json({ id: result.insertId, ...req.body });
    } catch (err) {
        console.error('❌ Customer create error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. SHIPMENTS
app.get('/api/shipments', async (req, res) => {
    try {
        const query = `
            SELECT s.ShipmentID, c.Name as CustomerName, r.Source, r.Destination, v.VehicleNumber, 
                   s.PickupDate, s.DeliveryDate, s.Status, s.Weight
            FROM SHIPMENT s
            LEFT JOIN CUSTOMER c ON s.CustomerID = c.CustomerID
            LEFT JOIN ROUTE r ON s.RouteID = r.RouteID
            LEFT JOIN VEHICLE v ON s.VehicleID = v.VehicleID
            ORDER BY s.ShipmentID DESC
        `;
        
        const connection = await pool.getConnection();
        const [results] = await connection.query(query);
        connection.release();
        
        res.json(results);
    } catch (err) {
        console.error('❌ Shipments fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/shipments', async (req, res) => {
    try {
        let { CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight } = req.body;
        
        // Validate and convert to proper types
        CustomerID = parseInt(CustomerID);
        RouteID = parseInt(RouteID);
        VehicleID = parseInt(VehicleID);
        Weight = parseFloat(Weight);

        // Validate all required fields
        if (!CustomerID || !RouteID || !VehicleID || !PickupDate || !DeliveryDate || !Weight) {
            console.warn('⚠️ Missing fields:', { CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight });
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate that IDs are valid numbers
        if (isNaN(CustomerID) || isNaN(RouteID) || isNaN(VehicleID) || isNaN(Weight)) {
            return res.status(400).json({ error: 'Invalid Customer, Route, Vehicle ID, or Weight. Must be valid numbers.' });
        }

        console.log('📝 Creating shipment with:', { CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight });
        
        const connection = await pool.getConnection();
        
        // Verify foreign keys exist before inserting
        const [customerExists] = await connection.query('SELECT CustomerID FROM CUSTOMER WHERE CustomerID = ?', [CustomerID]);
        if (customerExists.length === 0) {
            connection.release();
            return res.status(400).json({ error: `Customer ID ${CustomerID} does not exist` });
        }
        
        const [routeExists] = await connection.query('SELECT RouteID FROM ROUTE WHERE RouteID = ?', [RouteID]);
        if (routeExists.length === 0) {
            connection.release();
            return res.status(400).json({ error: `Route ID ${RouteID} does not exist` });
        }
        
        const [vehicleExists] = await connection.query('SELECT VehicleID FROM VEHICLE WHERE VehicleID = ?', [VehicleID]);
        if (vehicleExists.length === 0) {
            connection.release();
            return res.status(400).json({ error: `Vehicle ID ${VehicleID} does not exist` });
        }
        
        // Insert shipment
        const [result] = await connection.query(
            'INSERT INTO SHIPMENT (CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight, Status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [CustomerID, RouteID, VehicleID, PickupDate, DeliveryDate, Weight, 'Pending']
        );
        connection.release();
        
        console.log('✅ Shipment created with ID:', result.insertId);
        
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
    } catch (err) {
        console.error('❌ Shipment create error:', err.message);
        res.status(500).json({ error: 'Error creating shipment: ' + err.message });
    }
});

// 5. ROUTES
app.get('/api/routes', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query('SELECT * FROM ROUTE');
        connection.release();
        res.json(results);
    } catch (err) {
        console.error('❌ Routes fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 6. VEHICLES
app.get('/api/vehicles', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query('SELECT * FROM VEHICLE');
        connection.release();
        res.json(results);
    } catch (err) {
        console.error('❌ Vehicles fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 7. DRIVERS
app.get('/api/drivers', async (req, res) => {
    try {
        const query = `
            SELECT d.DriverID, d.Name, d.LicenseNumber, d.Phone, v.VehicleNumber
            FROM DRIVER d
            LEFT JOIN VEHICLE v ON d.VehicleID = v.VehicleID
        `;
        const connection = await pool.getConnection();
        const [results] = await connection.query(query);
        connection.release();
        res.json(results);
    } catch (err) {
        console.error('❌ Drivers fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 8. PAYMENTS
app.get('/api/payments', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query('SELECT * FROM PAYMENT');
        connection.release();
        res.json(results);
    } catch (err) {
        console.error('❌ Payments fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`🔗 Open your browser and navigate to http://localhost:${port}`);
});
