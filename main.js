const app = {
    user: null,
    currentTab: 0,
    newCustomerData: null,
    newRouteData: null,
    newVehicleData: null,

    init() {
        this.bindLogin();
        this.bindNavigation();
        this.bindForms();
        this.setupAdvancedModal();
    },

    bindLogin() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (data.success) {
                    this.user = data.user;
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('app-shell').style.display = 'flex';
                    document.getElementById('logged-in-user').textContent = data.user.username;
                    this.loadDashboardData();
                } else {
                    errorEl.textContent = data.message || 'Login failed';
                }
            } catch (err) {
                errorEl.textContent = 'Server is offline. Please install Node.js and run the backend!';
            }
        });

        // Toggle between Login and Signup
        document.getElementById('show-signup').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('signup-form').style.display = 'block';
            document.getElementById('login-tagline').textContent = 'Join Nexus Transit today';
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signup-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('login-tagline').textContent = 'Please enter your details to sign in';
        });

        // Signup Logic
        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const password = document.getElementById('signup-password').value;
            const errorEl = document.getElementById('signup-error');

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (data.success) {
                    alert('Account created! You can now sign in.');
                    document.getElementById('show-login').click();
                } else {
                    errorEl.textContent = data.error || 'Registration failed';
                }
            } catch (err) {
                errorEl.textContent = 'Server error. Try again later.';
            }
        });
    },

    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                this.switchView(item.getAttribute('data-target'));
            });
        });
    },

    bindForms() {
        document.getElementById('add-shipment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const body = Object.fromEntries(formData.entries());

            // Validation - Check all required fields
            if (!body.CustomerID || !body.RouteID || !body.VehicleID || !body.PickupDate || !body.DeliveryDate || !body.Weight) {
                alert('❌ Please fill all required fields');
                console.warn('Missing fields:', body);
                return;
            }

            try {
                console.log('📤 Sending shipment data:', body);
                const res = await fetch('/api/shipments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const responseData = await res.json();
                
                if (!res.ok) {
                    throw new Error(responseData.error || 'Failed to create shipment');
                }

                console.log('✅ Shipment created successfully:', responseData);
                alert('✅ Shipment created successfully! ID: ' + responseData.ShipmentID);
                e.target.reset(); // Reset form fields
                this.hideModal('shipment-modal');
                
                // Reload dashboard and shipments to show new data
                this.loadDashboardData();
                this.loadShipments();
                
            } catch (err) {
                console.error('❌ Error creating shipment:', err);
                alert('❌ Error creating shipment: ' + err.message);
            }
        });
    },

    // =============== ADVANCED MODAL FUNCTIONS ===============
    setupAdvancedModal() {
        // Load existing data for dropdowns
        this.loadDropdownData();
        
        // Setup tab navigation
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach((btn, idx) => {
            btn.addEventListener('click', () => this.switchTab(idx));
        });
    },

    async loadDropdownData() {
        try {
            // Load customers
            const customers = await fetch('/api/customers').then(r => r.json());
            const customerSelect = document.getElementById('existing-customer');
            customers.forEach(c => {
                const option = document.createElement('option');
                option.value = c.CustomerID;
                option.textContent = `${c.CustomerID} - ${c.Name}`;
                customerSelect.appendChild(option);
            });

            // Load routes
            const routes = await fetch('/api/routes').then(r => r.json());
            const routeSelect = document.getElementById('existing-route');
            routes.forEach(r => {
                const option = document.createElement('option');
                option.value = r.RouteID;
                option.textContent = `${r.RouteID} - ${r.Source} → ${r.Destination}`;
                routeSelect.appendChild(option);
            });

            // Load vehicles
            const vehicles = await fetch('/api/vehicles').then(r => r.json());
            const vehicleSelect = document.getElementById('existing-vehicle');
            vehicles.forEach(v => {
                const option = document.createElement('option');
                option.value = v.VehicleID;
                option.textContent = `${v.VehicleID} - ${v.VehicleNumber} (${v.VehicleType})`;
                vehicleSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Error loading dropdown data:', err);
        }
    },

    switchTab(tabIndex) {
        this.currentTab = tabIndex;
        const tabs = document.querySelectorAll('.tab-content');
        const buttons = document.querySelectorAll('.tab-btn');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        buttons.forEach(btn => btn.classList.remove('active'));
        
        tabs[tabIndex].classList.add('active');
        buttons[tabIndex].classList.add('active');
        
        // Scroll to top
        document.querySelector('.modal-content').scrollTop = 0;
    },

    nextTab() {
        if (this.currentTab < 3) {
            this.switchTab(this.currentTab + 1);
        }
    },

    prevTab() {
        if (this.currentTab > 0) {
            this.switchTab(this.currentTab - 1);
        }
    },

    toggleNewCustomerForm() {
        const form = document.getElementById('new-customer-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    },

    toggleNewRouteForm() {
        const form = document.getElementById('new-route-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    },

    toggleNewVehicleForm() {
        const form = document.getElementById('new-vehicle-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    },

    async createNewCustomer() {
        const name = document.getElementById('new-customer-name').value;
        const email = document.getElementById('new-customer-email').value;
        const phone = document.getElementById('new-customer-phone').value;
        const address = document.getElementById('new-customer-address').value;

        if (!name) {
            alert('❌ Customer name is required');
            return;
        }

        try {
            console.log('📝 Creating new customer...');
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Name: name, Email: email, Phone: phone, Address: address })
            });

            const data = await res.json();
            if (res.ok) {
                this.newCustomerData = data;
                console.log('✅ Customer created:', data);
                alert('✅ Customer created! ID: ' + data.id);
                
                // Add to dropdown
                const select = document.getElementById('existing-customer');
                const option = document.createElement('option');
                option.value = data.id;
                option.textContent = `${data.id} - ${name}`;
                option.selected = true;
                select.appendChild(option);
                
                // Reset form
                document.getElementById('new-customer-name').value = '';
                document.getElementById('new-customer-email').value = '';
                document.getElementById('new-customer-phone').value = '';
                document.getElementById('new-customer-address').value = '';
                this.toggleNewCustomerForm();
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('❌ Error creating customer:', err);
            alert('❌ Error: ' + err.message);
        }
    },

    async createNewRoute() {
        const source = document.getElementById('new-route-source').value;
        const destination = document.getElementById('new-route-destination').value;
        const distance = document.getElementById('new-route-distance').value;
        const time = document.getElementById('new-route-time').value;

        if (!source || !destination) {
            alert('❌ Source and Destination are required');
            return;
        }

        try {
            console.log('📝 Creating new route...');
            const res = await fetch('/api/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Source: source, Destination: destination, Distance: distance, EstimatedTime: time })
            });

            const data = await res.json();
            if (res.ok) {
                this.newRouteData = data;
                console.log('✅ Route created:', data);
                alert('✅ Route created! ID: ' + data.id);
                
                // Add to dropdown
                const select = document.getElementById('existing-route');
                const option = document.createElement('option');
                option.value = data.id;
                option.textContent = `${data.id} - ${source} → ${destination}`;
                option.selected = true;
                select.appendChild(option);
                
                // Reset form
                document.getElementById('new-route-source').value = '';
                document.getElementById('new-route-destination').value = '';
                document.getElementById('new-route-distance').value = '';
                document.getElementById('new-route-time').value = '';
                this.toggleNewRouteForm();
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('❌ Error creating route:', err);
            alert('❌ Error: ' + err.message);
        }
    },

    async createNewVehicle() {
        const number = document.getElementById('new-vehicle-number').value;
        const type = document.getElementById('new-vehicle-type').value;
        const capacity = document.getElementById('new-vehicle-capacity').value;
        const status = document.getElementById('new-vehicle-status').value;

        if (!number || !type || !capacity) {
            alert('❌ Vehicle Number, Type, and Capacity are required');
            return;
        }

        try {
            console.log('📝 Creating new vehicle...');
            const res = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ VehicleNumber: number, VehicleType: type, Capacity: capacity, Status: status })
            });

            const data = await res.json();
            if (res.ok) {
                this.newVehicleData = data;
                console.log('✅ Vehicle created:', data);
                alert('✅ Vehicle created! ID: ' + data.id);
                
                // Add to dropdown
                const select = document.getElementById('existing-vehicle');
                const option = document.createElement('option');
                option.value = data.id;
                option.textContent = `${data.id} - ${number} (${type})`;
                option.selected = true;
                select.appendChild(option);
                
                // Reset form
                document.getElementById('new-vehicle-number').value = '';
                document.getElementById('new-vehicle-capacity').value = '';
                this.toggleNewVehicleForm();
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('❌ Error creating vehicle:', err);
            alert('❌ Error: ' + err.message);
        }
    },

    async submitAdvancedShipment() {
        const customerID = document.getElementById('existing-customer').value;
        const routeID = document.getElementById('existing-route').value;
        const vehicleID = document.getElementById('existing-vehicle').value;
        const weight = document.getElementById('shipment-weight').value;
        const pickup = document.getElementById('shipment-pickup').value;
        const delivery = document.getElementById('shipment-delivery').value;

        if (!customerID || !routeID || !vehicleID || !weight || !pickup || !delivery) {
            alert('❌ Please fill all required fields');
            return;
        }

        try {
            console.log('📤 Submitting advanced shipment...');
            const res = await fetch('/api/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    CustomerID: customerID,
                    RouteID: routeID,
                    VehicleID: vehicleID,
                    Weight: weight,
                    PickupDate: pickup,
                    DeliveryDate: delivery
                })
            });

            const data = await res.json();
            if (res.ok) {
                console.log('✅ Shipment created:', data);
                alert('✅ Shipment created successfully! ID: ' + data.ShipmentID);
                this.hideModal('advanced-shipment-modal');
                this.loadDashboardData();
                this.loadShipments();
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('❌ Error creating shipment:', err);
            alert('❌ Error: ' + err.message);
        }
    },

    // =============== EXISTING FUNCTIONS ===============
    switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        if(viewId === 'dashboard-view') this.loadDashboardData();
        else if(viewId === 'shipments-view') this.loadShipments();
        else if(viewId === 'customers-view') this.loadCustomers();
        else if(viewId === 'routes-view') this.loadRoutes();
        else if(viewId === 'vehicles-view') this.loadVehicles();
        else if(viewId === 'drivers-view') this.loadDrivers();
    },

    // UI Helpers
    showModal(id) { document.getElementById(id).style.display = 'flex'; },
    hideModal(id) { document.getElementById(id).style.display = 'none'; },
    logout() { window.location.reload(); },

    renderStatus(status) {
        const s = (status || 'pending').toLowerCase();
        let cls = 'status-pending';
        if(s.includes('transit')) cls = 'status-transit';
        if(s.includes('delivered') || s.includes('available')) cls = 'status-delivered';
        return `<span class="status-badge ${cls}">${status || 'Pending'}</span>`;
    },

    // Data Loaders with async/await
    async loadDashboardData() {
        try {
            const [shipments, customers, vehicles, payments] = await Promise.all([
                fetch('/api/shipments').then(r => r.json()).catch(e => { console.error('Shipments error:', e); return []; }),
                fetch('/api/customers').then(r => r.json()).catch(e => { console.error('Customers error:', e); return []; }),
                fetch('/api/vehicles').then(r => r.json()).catch(e => { console.error('Vehicles error:', e); return []; }),
                fetch('/api/payments').then(r => r.json()).catch(e => { console.error('Payments error:', e); return []; })
            ]);

            const stats = [
                { title: 'Total Shipments', val: shipments.length, icon: 'paper-plane' },
                { title: 'Customers', val: customers.length, icon: 'people' },
                { title: 'Vehicles', val: vehicles.length, icon: 'bus' },
                { title: 'Revenue', val: `$${payments.reduce((a,c) => a + Number(c.Amount), 0).toLocaleString()}`, icon: 'wallet' }
            ];

            document.getElementById('stats-container').innerHTML = stats.map(s => `
                <div class="stat-card">
                    <h3>${s.title}</h3>
                    <div class="stat-value">${s.val}</div>
                </div>
            `).join('');

            const tbody = document.getElementById('dashboard-shipments-table');
            tbody.innerHTML = shipments.slice(0, 5).map(s => `
                <tr>
                    <td>#${s.ShipmentID}</td>
                    <td>${s.CustomerName || 'Unknown'}</td>
                    <td>${s.Source} ➔ ${s.Destination}</td>
                    <td>${s.VehicleNumber || 'N/A'}</td>
                    <td>${this.renderStatus(s.Status)}</td>
                </tr>
            `).join('') || '<tr><td colspan="5" class="text-center">No shipments.</td></tr>';
        } catch (e) {
            console.error("Fetch error:", e);
        }
    },

    async loadShipments() {
        try {
            const data = await fetch('/api/shipments').then(r => r.json());
            const tbody = document.getElementById('shipments-table');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No shipments found.</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(s => `
                <tr>
                    <td>#${s.ShipmentID}</td>
                    <td>${s.CustomerName || 'N/A'}</td>
                    <td>${s.Source} ➔ ${s.Destination}</td>
                    <td>${s.VehicleNumber || 'N/A'}</td>
                    <td>${new Date(s.PickupDate).toLocaleDateString()}</td>
                    <td>${new Date(s.DeliveryDate).toLocaleDateString()}</td>
                    <td>${this.renderStatus(s.Status)}</td>
                </tr>
            `).join('');
        } catch (e) {
            console.error('Shipments load error:', e);
            document.getElementById('shipments-table').innerHTML = '<tr><td colspan="7" class="text-center">Error loading shipments.</td></tr>';
        }
    },

    async loadCustomers() {
        try {
            const data = await fetch('/api/customers').then(r => r.json());
            const tbody = document.getElementById('customers-table');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No customers found.</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(c => `
                <tr><td>#${c.CustomerID}</td><td>${c.Name}</td><td>${c.Email}</td><td>${c.Phone}</td><td>${c.Address}</td></tr>
            `).join('');
        } catch (e) {
            console.error('Customers load error:', e);
            document.getElementById('customers-table').innerHTML = '<tr><td colspan="5" class="text-center">Error loading customers.</td></tr>';
        }
    },

    async loadRoutes() {
        try {
            const data = await fetch('/api/routes').then(r => r.json());
            const tbody = document.getElementById('routes-table');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No routes found.</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(r => `
                <tr><td>#${r.RouteID}</td><td>${r.Source}</td><td>${r.Destination}</td><td>${r.Distance}</td><td>${r.EstimatedTime}</td></tr>
            `).join('');
        } catch (e) {
            console.error('Routes load error:', e);
            document.getElementById('routes-table').innerHTML = '<tr><td colspan="5" class="text-center">Error loading routes.</td></tr>';
        }
    },

    async loadVehicles() {
        try {
            const data = await fetch('/api/vehicles').then(r => r.json());
            const tbody = document.getElementById('vehicles-table');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No vehicles found.</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(v => `
                <tr><td>#${v.VehicleID}</td><td>${v.VehicleNumber}</td><td>${v.VehicleType}</td><td>${v.Capacity} kg</td><td>${this.renderStatus(v.Status)}</td></tr>
            `).join('');
        } catch (e) {
            console.error('Vehicles load error:', e);
            document.getElementById('vehicles-table').innerHTML = '<tr><td colspan="5" class="text-center">Error loading vehicles.</td></tr>';
        }
    },

    async loadDrivers() {
        try {
            const data = await fetch('/api/drivers').then(r => r.json());
            const tbody = document.getElementById('drivers-table');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No drivers found.</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(d => `
                <tr><td>#${d.DriverID}</td><td>${d.Name}</td><td>${d.LicenseNumber}</td><td>${d.Phone}</td><td>${d.VehicleNumber || 'N/A'}</td></tr>
            `).join('');
        } catch (e) {
            console.error('Drivers load error:', e);
            document.getElementById('drivers-table').innerHTML = '<tr><td colspan="5" class="text-center">Error loading drivers.</td></tr>';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
