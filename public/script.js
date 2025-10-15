class PrinterMonitor {
    constructor() {
        this.printers = [
            { name: 'Oneill3rdfloorprinter01.bc.edu', ip: '136.167.67.130' },
            { name: 'Oneill3rdfloorprinter02.bc.edu', ip: '136.167.66.108' },
            { name: 'Oneill3rdfloorprinter03.bc.edu', ip: '136.167.67.32' },
            { name: 'Oneill3rdfloorprinter04.bc.edu', ip: '136.167.69.110' },
            { name: 'Oneill3rdfloorprinter05.bc.edu', ip: '136.167.69.140' },
            { name: 'oneill3rdfloorprinter06.bc.edu', ip: '136.167.66.240' },
            { name: 'oneill3rdfloorcolorprinter01.bc.edu', ip: '136.167.67.81' },
            { name: '2150comm.bc.edu', ip: '136.167.214.175' },
            { name: 'WIHD', ip: '136.167.66.220' }
        ];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPrinters();
        this.checkServerHealth();
        this.checkAllPrinters();
        
        // Auto-refresh every 2 minutes
        setInterval(() => this.checkAllPrinters(), 120000);
    }

    bindEvents() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.checkAllPrinters();
        });
        
        document.getElementById('refreshDetailsBtn').addEventListener('click', () => {
            this.checkAllPrinters();
        });
    }

    async checkServerHealth() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                document.getElementById('serverStatus').className = 'server-online';
                document.getElementById('serverStatus').textContent = 'Server Connected - Real-time SNMP';
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            document.getElementById('serverStatus').className = 'server-offline';
            document.getElementById('serverStatus').textContent = 'Server Offline - Using Fallback Data';
        }
    }

    loadPrinters() {
        const container = document.getElementById('printersContainer');
        container.innerHTML = '';
        
        this.printers.forEach(printer => {
            const card = this.createPrinterCard(printer);
            container.appendChild(card);
        });
    }

    createPrinterCard(printer) {
        const card = document.createElement('div');
        card.className = 'printer-card unknown';
        card.id = `printer-${this.sanitizeId(printer.name)}`;
        
        card.innerHTML = `
            <div class="printer-header">
                <div>
                    <div class="printer-name">${printer.name}</div>
                    <div class="printer-location">Loading location...</div>
                </div>
                <div class="status-indicator unknown"></div>
            </div>
            <div class="printer-details">
                <div class="printer-ip">IP: ${printer.ip}</div>
                <div class="printer-status status-unknown">Querying printer via SNMP...</div>
                <div class="details-section">
                    <h4>Toner Levels</h4>
                    <div class="toner-info" id="toner-${this.sanitizeId(printer.name)}">
                        <div class="toner-item">
                            <span>Querying toner levels...</span>
                        </div>
                    </div>
                    
                    <h4>Paper Trays</h4>
                    <div class="tray-info" id="tray-${this.sanitizeId(printer.name)}">
                        <div class="tray-item">
                            <span>Querying tray status...</span>
                        </div>
                    </div>
                </div>
                <div class="printer-method" id="method-${this.sanitizeId(printer.name)}">
                    Method: Initializing...
                </div>
            </div>
        `;
        
        return card;
    }

    sanitizeId(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }

    async checkAllPrinters() {
        const refreshBtn = document.getElementById('refreshBtn');
        const detailsBtn = document.getElementById('refreshDetailsBtn');
        const loading = document.getElementById('loading');
        const lastUpdated = document.getElementById('lastUpdated');
        
        refreshBtn.disabled = true;
        detailsBtn.disabled = true;
        loading.style.display = 'block';
        
        try {
            console.log('🔄 Fetching real-time printer data from Railway server...');
            
            const response = await fetch('/api/printers/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ printers: this.printers })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.updatePrinterStatus(result.data);
                this.updateStats(result.data);
                lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()} (Real-time)`;
                console.log(`✅ Successfully updated ${result.data.length} printers`);
            } else {
                throw new Error(result.error || 'Unknown server error');
            }
            
        } catch (error) {
            console.error('❌ Error fetching real printer data:', error);
            this.showError('Real-time data unavailable. Using fallback data.');
            this.showFallbackData();
        } finally {
            refreshBtn.disabled = false;
            detailsBtn.disabled = false;
            loading.style.display = 'none';
        }
    }

    updatePrinterStatus(results) {
        results.forEach(result => {
            const cardId = `printer-${this.sanitizeId(result.name)}`;
            const card = document.getElementById(cardId);
            if (!card) {
                console.warn(`Card not found for printer: ${result.name}`);
                return;
            }
            
            const statusIndicator = card.querySelector('.status-indicator');
            const statusText = card.querySelector('.printer-status');
            const locationElement = card.querySelector('.printer-location');
            const methodElement = document.getElementById(`method-${this.sanitizeId(result.name)}`);
            
            // Update location
            if (result.location && locationElement) {
                locationElement.textContent = result.location;
            }
            
            // Update status
            card.className = `printer-card ${result.status}`;
            statusIndicator.className = `status-indicator ${result.status}`;
            
            if (result.status === 'online') {
                statusText.className = 'printer-status status-online';
                statusText.textContent = `Online (${result.responseTime}ms)`;
                if (result.printerStatus && result.printerStatus !== 'UNKNOWN') {
                    statusText.textContent += ` - ${result.printerStatus}`;
                }
            } else if (result.status === 'offline') {
                statusText.className = 'printer-status status-offline';
                statusText.textContent = 'Offline';
                if (result.error) {
                    statusText.textContent += ` - ${result.error}`;
                }
            } else {
                statusText.className = 'printer-status status-unknown';
                statusText.textContent = 'Unknown';
            }
            
            // Update method
            if (methodElement) {
                methodElement.textContent = `Method: ${result.method || 'unknown'}`;
                if (result.reachablePort) {
                    methodElement.textContent += ` | Port: ${result.reachablePort}`;
                }
            }
            
            // Update toner levels
            this.updateTonerLevels(result);
            
            // Update tray status
            this.updateTrayStatus(result);
        });
    }

    updateTonerLevels(printerData) {
        const tonerElement = document.getElementById(`toner-${this.sanitizeId(printerData.name)}`);
        if (!tonerElement || !printerData.toners) return;
        
        tonerElement.innerHTML = '';
        printerData.toners.forEach(toner => {
            const levelClass = toner.level > 50 ? 'high' : toner.level > 20 ? 'medium' : 'low';
            const displayLevel = Math.max(0, Math.min(100, toner.level));
            
            tonerElement.innerHTML += `
                <div class="toner-item">
                    <span>
                        <span class="toner-color toner-${toner.color.toLowerCase()}"></span>
                        ${toner.color}:
                    </span>
                    <div class="toner-level">
                        <div class="toner-bar">
                            <div class="toner-fill ${levelClass}" style="width: ${displayLevel}%"></div>
                        </div>
                    </div>
                    <span class="toner-percentage">${displayLevel}%</span>
                </div>
            `;
        });
    }

    updateTrayStatus(printerData) {
        const trayElement = document.getElementById(`tray-${this.sanitizeId(printerData.name)}`);
        if (!trayElement || !printerData.trays) return;
        
        trayElement.innerHTML = '';
        printerData.trays.forEach(tray => {
            const statusClass = this.getTrayStatusClass(tray.status);
            trayElement.innerHTML += `
                <div class="tray-item">
                    <span>${tray.name}:</span>
                    <span class="tray-status ${statusClass}">${tray.status}</span>
                </div>
            `;
        });
    }

    getTrayStatusClass(status) {
        const statusUpper = status.toUpperCase();
        if (statusUpper === 'OK' || statusUpper === 'READY') return 'tray-ok';
        if (statusUpper === 'LOW' || statusUpper === 'NEARLY_EMPTY') return 'tray-low';
        if (statusUpper === 'EMPTY') return 'tray-empty';
        if (statusUpper === 'OPEN') return 'tray-open';
        return 'tray-unknown';
    }

    updateStats(results) {
        const total = results.length;
        const online = results.filter(p => p.status === 'online').length;
        const offline = total - online;
        
        document.getElementById('totalPrinters').textContent = total;
        document.getElementById('onlinePrinters').textContent = online;
        document.getElementById('offlinePrinters').textContent = offline;
    }

    showFallbackData() {
        console.log('Showing fallback data');
        const fallbackResults = this.printers.map(printer => {
            const isColorPrinter = printer.name.toLowerCase().includes('color');
            const isOnline = Math.random() > 0.3;
            
            return {
                name: printer.name,
                ip: printer.ip,
                location: "O'Neill Library 3rd Floor",
                status: isOnline ? 'online' : 'offline',
                responseTime: isOnline ? Math.floor(Math.random() * 100) + 50 : null,
                toners: isColorPrinter ? [
                    { color: 'Black', level: Math.floor(Math.random() * 40) + 30 },
                    { color: 'Cyan', level: Math.floor(Math.random() * 60) + 10 },
                    { color: 'Magenta', level: Math.floor(Math.random() * 70) + 5 },
                    { color: 'Yellow', level: Math.floor(Math.random() * 80) + 15 }
                ] : [
                    { color: 'Black', level: Math.floor(Math.random() * 50) + 30 }
                ],
                trays: [
                    { name: 'Tray 1', status: ['OK', 'OK', 'OK', 'LOW'][Math.floor(Math.random() * 4)] },
                    { name: 'Tray 2', status: ['OK', 'EMPTY', 'OK', 'LOW'][Math.floor(Math.random() * 4)] },
                    { name: 'Manual Feed', status: 'OK' }
                ],
                method: 'fallback',
                printerStatus: isOnline ? 'IDLE' : 'UNKNOWN'
            };
        });
        
        this.updatePrinterStatus(fallbackResults);
        this.updateStats(fallbackResults);
        
        const lastUpdated = document.getElementById('lastUpdated');
        lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()} (Fallback Data)`;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 15px; border-radius: 5px; z-index: 1000; max-width: 300px;';
        errorDiv.innerHTML = `<strong>⚠️ Notice:</strong> ${message}`;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Initialize the printer monitor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PrinterMonitor();
});
