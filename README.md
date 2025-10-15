# BC Printer Monitor - Railway Deployment

Real-time printer monitoring for Boston College using SNMP, deployed on Railway.

## Features
- Real-time SNMP queries to BC printers
- Live toner level monitoring
- Paper tray status tracking
- Automatic refresh every 2 minutes
- Responsive design
- Deployed on Railway cloud platform

## Deployment

1. **Push to GitHub**
2. **Connect to Railway**
3. **Auto-deploys** on every push

## API Endpoints
- `GET /` - Website
- `GET /api/health` - Health check
- `GET /api/printers` - All printer status
- `POST /api/printers/status` - Specific printer status

## Printer Configuration
Monitors 9 BC printers across O'Neill Library and other locations.
