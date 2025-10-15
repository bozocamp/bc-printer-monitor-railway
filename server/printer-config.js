// BC Printer Configuration
const printers = [
    { 
        name: 'Oneill3rdfloorprinter01.bc.edu', 
        ip: '136.167.67.130',
        community: 'public',
        model: 'hp',
        location: "O'Neill Library 3rd Floor"
    },
    { 
        name: 'Oneill3rdfloorprinter02.bc.edu', 
        ip: '136.167.66.108',
        community: 'public',
        model: 'hp',
        location: "O'Neill Library 3rd Floor"
    },
    { 
        name: 'Oneill3rdfloorprinter03.bc.edu', 
        ip: '136.167.67.32',
        community: 'public',
        model: 'hp',
        location: "O'Neill Library 3rd Floor"
    },
    { 
        name: 'Oneill3rdfloorprinter04.bc.edu', 
        ip: '136.167.69.110',
        community: 'public',
        model: 'hp',
        location: "O'Neill Library 3rd Floor"
    },
    { 
        name: 'Oneill3rdfloorprinter05.bc.edu', 
        ip: '136.167.69.140',
        community: 'public',
        model: 'hp',
        location: "O'Neill Library 3rd Floor"
    },
    { 
        name: 'oneill3rdfloorprinter06.bc.edu', 
        ip: '136.167.66.240',
        community: 'public',
        model: 'hp',
        location: "O'Neill Library 3rd Floor"
    },
    { 
        name: 'oneill3rdfloorcolorprinter01.bc.edu', 
        ip: '136.167.67.81',
        community: 'public',
        model: 'hp-color',
        location: "O'Neill Library 3rd Floor"
    },
    { 
        name: '2150comm.bc.edu', 
        ip: '136.167.214.175',
        community: 'public',
        model: 'xerox',
        location: "2150 Commonwealth Ave"
    },
    { 
        name: 'WIHD', 
        ip: '136.167.66.220',
        community: 'public',
        model: 'canon',
        location: "Wallace Instructional & Design Hub"
    }
];

// SNMP OIDs for printer monitoring
const SNMP_OIDS = {
    // Toner Levels
    TONER_BLACK: '1.3.6.1.2.1.43.11.1.1.9.1.1',
    TONER_CYAN: '1.3.6.1.2.1.43.11.1.1.9.1.2',
    TONER_MAGENTA: '1.3.6.1.2.1.43.11.1.1.9.1.3',
    TONER_YELLOW: '1.3.6.1.2.1.43.11.1.1.9.1.4',
    
    // Tray Status
    TRAY_1_STATUS: '1.3.6.1.2.1.43.8.2.1.12.1.1',
    TRAY_2_STATUS: '1.3.6.1.2.1.43.8.2.1.12.1.2',
    TRAY_3_STATUS: '1.3.6.1.2.1.43.8.2.1.12.1.3',
    
    // Printer Status
    PRINTER_STATUS: '1.3.6.1.2.1.25.3.5.1.1.1',
    
    // Page Count
    PAGE_COUNT: '1.3.6.1.2.1.43.10.2.1.4.1.1'
};

module.exports = {
    printers,
    SNMP_OIDS
};
