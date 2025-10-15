const express = require('express');
const cors = require('cors');
const snmp = require('net-snmp');
const path = require('path');
const { printers, SNMP_OIDS } = require('./printer-config');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Utility function to check if port is open
function checkPort(ip, port, timeout = 3000) {
    return new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();
        
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', () => {
            resolve(false);
        });
        
        socket.connect(port, ip);
    });
}

// SNMP query function with better error handling
function snmpQuery(ip, community, oids, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const session = snmp.createSession(ip, community, { 
            timeout: timeout,
            retries: 2,
            port: 161,
            transport: "udp4"
        });
        
        session.get(oids, (error, varbinds) => {
            session.close();
            
            if (error) {
                reject(error);
            } else {
                // Check if we got any valid responses
                const validResponses = varbinds.filter(vb => 
                    vb.value !== null && vb.value !== undefined
                );
                
                if (validResponses.length > 0) {
                    resolve(varbinds);
                } else {
                    reject(new Error('No valid SNMP responses received'));
                }
            }
        });
    });
}

// Get tray status from SNMP value
function getTrayStatus(value) {
    const statusMap = {
        1: 'OK',
        2: 'LOW',
        3: 'EMPTY',
        4: 'OPEN',
        5: 'JAMMED'
    };
    return statusMap[value] || 'UNKNOWN';
}

// Get printer status from SNMP value
function getPrinterStatus(value) {
    const statusMap = {
        1: 'OTHER',
        2: 'UNKNOWN',
        3: 'IDLE',
        4: 'PRINTING',
        5: 'WARMUP'
    };
    return statusMap[value] || 'UNKNOWN';
}

// Check printer basic connectivity
async function checkPrinterConnectivity(printer) {
    const commonPorts = [9100, 515, 631, 80, 443, 9220];
    
    for (const port of commonPorts) {
        if (await checkPort(printer.ip, port, 2000)) {
            return { reachable: true, port: port };
        }
    }
    return { reachable: false, port: null };
}

// Get detailed printer information via SNMP
async function getPrinterDetails(printer) {
    const startTime = Date.now();
    
    try {
        console.log(`🔍 Checking printer: ${printer.name} (${printer.ip})`);
        
        // First check basic connectivity
        const connectivity = await checkPrinterConnectivity(printer);
        if (!connectivity.reachable) {
            console.log(`❌ Printer ${printer.name} is not reachable`);
            throw new Error('Printer not reachable on any common port');
        }

        console.log(`✅ Printer ${printer.name} is reachable on port ${connectivity.port}`);

        // Define OIDs to query based on printer type
        const oids = [
            SNMP_OIDS.TONER_BLACK,
            SNMP_OIDS.TRAY_1_STATUS,
            SNMP_OIDS.TRAY_2_STATUS,
            SNMP_OIDS.PRINTER_STATUS,
            SNMP_OIDS.PAGE_COUNT
        ];

        // Add color toner OIDs for color printers
        if (printer.model.includes('color')) {
            oids.push(SNMP_OIDS.TONER_CYAN, SNMP_OIDS.TONER_MAGENTA, SNMP_OIDS.TONER_YELLOW);
        }

        console.log(`📡 Querying SNMP data for ${printer.name}...`);
        
        // Query printer via SNMP
        const varbinds = await snmpQuery(printer.ip, printer.community, oids, 8000);
        
        // Process the results
        const toners = [];
        const trays = [];
        
        varbinds.forEach((vb, index) => {
            if (vb.value !== null && vb.value !== undefined && !isNaN(vb.value)) {
                const oid = vb.oid;
                
                // Process toner levels
                if (oid.includes('1.3.6.1.2.1.43.11.1.1.9.1.')) {
                    const tonerIndex = parseInt(oid.split('.').pop());
                    const colors = ['Black', 'Cyan', 'Magenta', 'Yellow'];
                    if (colors[tonerIndex - 1]) {
                        const level = Math.min(100, Math.max(0, parseInt(vb.value)));
                        toners.push({
                            color: colors[tonerIndex - 1],
                            level: level,
                            rawValue: vb.value
                        });
                        console.log(`🎨 ${colors[tonerIndex - 1]} toner: ${level}%`);
                    }
                }
                
                // Process tray status
                else if (oid.includes('1.3.6.1.2.1.43.8.2.1.12.1.')) {
                    const trayIndex = parseInt(oid.split('.').pop());
                    const status = getTrayStatus(parseInt(vb.value));
                    trays.push({
                        name: `Tray ${trayIndex}`,
                        status: status,
                        rawValue: vb.value
                    });
                    console.log(`📦 Tray ${trayIndex}: ${status}`);
                }
            }
        });

        // Get printer status
        const printerStatusValue = varbinds.find(vb => 
            vb.oid === SNMP_OIDS.PRINTER_STATUS
        );
        const printerStatus = printerStatusValue ? 
            getPrinterStatus(parseInt(printerStatusValue.value)) : 'UNKNOWN';

        // Get page count
        const pageCountValue = varbinds.find(vb => 
            vb.oid === SNMP_OIDS.PAGE_COUNT
        );
        const pageCount = pageCountValue ? parseInt(pageCountValue.value) : null;

        console.log(`✅ Successfully queried ${printer.name}`);

        return {
            name: printer.name,
            ip: printer.ip,
            location: printer.location,
            status: 'online',
            reachable: true,
            reachablePort: connectivity.port,
            toners: toners.length > 0 ? toners : [{ color: 'Black', level: 100 }],
            trays: trays.length > 0 ? trays : [{ name: 'Tray 1', status: 'OK' }],
            printerStatus: printerStatus,
            pageCount: pageCount,
            responseTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            method: 'snmp'
        };

    } catch (error) {
        console.error(`❌ Error querying printer ${printer.name}:`, error.message);
        
        // Fallback: try to at least get connectivity status
        const connectivity = await checkPrinterConnectivity(printer);
        
        return {
            name: printer.name,
            ip: printer.ip,
            location: printer.location,
            status: connectivity.reachable ? 'online' : 'offline',
            reachable: connectivity.reachable,
            reachablePort: connectivity.port,
            toners: [{ color: 'Black', level: 0 }],
            trays: [{ name: 'Tray 1', status: 'UNKNOWN' }],
            error: error.message,
            responseTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            method: connectivity.reachable ? 'port-only' : 'offline'
        };
    }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'BC Printer Monitor is running on Railway',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Get all printer status
app.get('/api/printers', async (req, res) => {
    try {
        console.log('🖨️ Fetching status for all printers...');
        
        const results = await Promise.all(
            printers.map(printer => getPrinterDetails(printer))
        );
        
        const onlineCount = results.filter(p => p.status === 'online').length;
        console.log(`✅ Retrieved status for ${onlineCount}/${results.length} online printers`);
        
        res.json({
            success: true,
            data: results,
            count: results.length,
            online: onlineCount,
            offline: results.length - onlineCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error fetching printer status:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get specific printer status
app.get('/api/printers/:name', async (req, res) => {
    try {
        const printerName = req.params.name;
        const printer = printers.find(p => p.name === printerName);
        
        if (!printer) {
            return res.status(404).json({
                success: false,
                error: 'Printer not found',
                timestamp: new Date().toISOString()
            });
        }
        
        const result = await getPrinterDetails(printer);
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`❌ Error fetching printer ${req.params.name}:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Batch check printers (POST)
app.post('/api/printers/status', async (req, res) => {
    try {
        const { printerNames } = req.body;
        let printersToCheck = printers;
        
        if (printerNames && Array.isArray(printerNames)) {
            printersToCheck = printers.filter(p => printerNames.includes(p.name));
        }
        
        console.log(`🖨️ Fetching status for ${printersToCheck.length} printers...`);
        
        const results = await Promise.all(
            printersToCheck.map(printer => getPrinterDetails(printer))
        );
        
        res.json({
            success: true,
            data: results,
            count: results.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in batch printer check:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve the main page for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 BC Printer Monitor running on port ${PORT}`);
    console.log(`📍 Website: http://localhost:${PORT}`);
    console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🖨️  Monitoring ${printers.length} printers`);
    console.log('📡 Ready for real-time printer monitoring...');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down BC Printer Monitor...');
    process.exit(0);
});
