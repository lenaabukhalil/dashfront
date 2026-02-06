# Node-RED API Documentation

## Project Overview

### Project Name
ION Dashboard API (Node-RED Backend)

### Description
The ION Dashboard API is a Node-RED-based backend system that provides RESTful API endpoints for managing electric vehicle charging infrastructure. The system handles organizations, locations, chargers, connectors, tariffs, users, reports, and real-time monitoring data.

### Purpose of the System
- Manage charging station infrastructure (organizations, locations, chargers, connectors)
- Configure charging tariffs and pricing
- Monitor real-time charger status and active sessions
- Generate financial and operational reports
- Manage user accounts and partner organizations
- Provide dashboard analytics and statistics

### Technologies Used
- **Node-RED**: Flow-based programming platform for API orchestration
- **HTTP In/Out Nodes**: Handle HTTP requests and responses
- **Function Nodes**: Business logic and data transformation
- **Database**: MySQL/MariaDB (inferred from data models)
- **External Services**: OCPI/OCPP protocol integration for charger communication

---

## Architecture Overview

### High-Level Flow Architecture
The Node-RED API follows a RESTful architecture pattern with the following major flow categories:

1. **v4 API Flows** (Modern endpoints)
   - `/v4/org` - Organizations
   - `/v4/location` - Locations
   - `/v4/charger` - Chargers

2. **Legacy API Flows** (Backward compatibility)
   - `/organizations/*` - Organization management
   - `/locations/*` - Location management
   - `/chargers/*` - Charger management
   - `/connectors/*` - Connector management
   - `/tariffs/*` - Tariff management

3. **Dashboard Flows**
   - `/dashboard/*` - Real-time monitoring and statistics

4. **Reports Flows**
   - `/reports/*` - Financial and operational reports

5. **User Management Flows**
   - `/users/*` - User account management

### Node Communication Pattern
```
HTTP In → Function (Validation) → Database Query → Function (Transform) → HTTP Response
```

### Integration Points
- **Database**: MySQL/MariaDB for persistent storage
- **OCPI/OCPP**: External charger communication protocols
- **Frontend**: React-based dashboard consuming these APIs

---

## Authentication & Authorization

### Authentication Method
**Status**: Not explicitly implemented in frontend code
- **Assumed**: JWT tokens or API keys (standard for production systems)
- **Current State**: Based on frontend code, authentication may be handled at the application level or via middleware

### Authorization Logic
- Role-Based Access Control (RBAC) implemented in frontend
- Permissions checked via `PermissionGuard` components
- Roles: `admin`, `manager`, `engineer`, `operator`, `accountant`

### Security Considerations
- CORS must be configured to allow frontend domain
- Input validation required on all endpoints
- SQL injection prevention (parameterized queries)
- Rate limiting recommended for production
- HTTPS required for production deployment

---

## Base URL

### Production
```
https://dash.evse.cloud/api
```

### Development
```
http://localhost:1880/api
```
*(Assumed - standard Node-RED port)*

### Environment Configuration
The frontend uses environment variable `VITE_API_BASE_URL` to configure the API base URL.

---

## API Endpoints

### Organizations

#### Get All Organizations
- **Endpoint Name**: Get Organizations
- **HTTP Method**: `GET`
- **URL Path**: `/v4/org`
- **Node-RED Flow Name**: `v4-org-get` (assumed)
- **Description**: Retrieves all organizations with their revenue and energy statistics

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | Filter by organization ID |

**Request Headers**:
```
Content-Type: application/json
```

**Response Body (Success - 200)**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "1",
      "organization_id": "1",
      "name": "Organization 1",
      "amount": 15000.50,
      "energy": 2500.75
    }
  ]
}
```

**Response Body (No Content - 204)**:
```
(Empty response body)
```

**Response Body (Error - 500)**:
```json
{
  "success": false,
  "message": "Database error occurred"
}
```

**Validation Rules**:
- None (returns all organizations)

**Error Handling**:
- Database connection errors return 500
- Empty results return 204 No Content

---

#### Get Organization Details
- **Endpoint Name**: Get Organization Details
- **HTTP Method**: `GET`
- **URL Path**: `/v4/org?id={id}`
- **Node-RED Flow Name**: `v4-org-details` (assumed)
- **Description**: Retrieves detailed information about a specific organization

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Organization ID |

**Response Body (Success - 200)**:
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "1",
      "name": "Organization 1",
      "name_ar": "المنظمة 1",
      "contact_first_name": "John",
      "contact_last_name": "Doe",
      "contact_phoneNumber": "+962791234567",
      "details": "Organization details"
    }
  ]
}
```

---

#### Create Organization
- **Endpoint Name**: Create Organization
- **HTTP Method**: `POST`
- **URL Path**: `/organizations`
- **Node-RED Flow Name**: `organizations-create` (assumed)
- **Description**: Creates a new organization

**Request Body**:
```json
{
  "organization_id": "1",
  "name": "New Organization",
  "amount": 0,
  "energy": 0
}
```

**Response Body (Success - 201)**:
```json
{
  "success": true,
  "message": "Organization saved successfully",
  "insertId": 123
}
```

---

#### Update Organization
- **Endpoint Name**: Update Organization
- **HTTP Method**: `PUT`
- **URL Path**: `/organizations/{id}`
- **Node-RED Flow Name**: `organizations-update` (assumed)

**Request Body**: Same as Create Organization

**Response Body (Success - 200)**:
```json
{
  "success": true,
  "message": "Organization updated successfully"
}
```

---

#### Delete Organization
- **Endpoint Name**: Delete Organization
- **HTTP Method**: `DELETE`
- **URL Path**: `/organizations/{id}`
- **Node-RED Flow Name**: `organizations-delete` (assumed)

**Response Body (Success - 200)**:
```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```

---

### Locations

#### Get All Locations
- **Endpoint Name**: Get Locations
- **HTTP Method**: `GET`
- **URL Path**: `/v4/location`
- **Node-RED Flow Name**: `v4-location-get` (assumed)
- **Description**: Retrieves all locations, optionally filtered by organization

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | string | No | Filter by organization ID |
| `organization_id` | string | No | Alternative parameter name |

**Response Body (Success - 200)**:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "1",
      "location_id": "1",
      "organization_id": "1",
      "name": "Location 1",
      "label": "Location 1"
    }
  ]
}
```

---

#### Get Location Details
- **Endpoint Name**: Get Location Details
- **HTTP Method**: `GET`
- **URL Path**: `/locations/{id}` or `/locations/details/{id}`
- **Node-RED Flow Name**: `locations-details` (assumed)

**Response Body (Success - 200)**:
```json
{
  "location_id": "1",
  "organization_id": "1",
  "name": "Location 1",
  "name_ar": "الموقع 1",
  "lat": "31.9539",
  "lng": "35.9106",
  "num_chargers": 5,
  "description": "Location description",
  "logo_url": "https://example.com/logo.png",
  "ad_url": "https://example.com/ad.png",
  "payment_types": "card,cash",
  "availability": "24/7",
  "subscription": "free",
  "visible_on_map": true,
  "ocpi_id": "OCPI-001",
  "ocpi_name": "OCPI Location Name",
  "ocpi_address": "123 Main St",
  "ocpi_city": "Amman",
  "ocpi_postal_code": "11118",
  "ocpi_country": "JO",
  "ocpi_visible": true,
  "ocpi_facility": "parking",
  "ocpi_parking_restrictions": "none",
  "ocpi_directions": "Directions in Arabic",
  "ocpi_directions_en": "Directions in English"
}
```

---

#### Create/Update Location
- **Endpoint Name**: Save Location
- **HTTP Method**: `POST` (create) or `PUT` (update)
- **URL Path**: `/locations` (create) or `/locations/{id}` (update) or `/locations/save`
- **Node-RED Flow Name**: `locations-save` (assumed)

**Request Body**:
```json
{
  "location_id": "1",
  "organization_id": "1",
  "name": "Location Name",
  "name_ar": "اسم الموقع",
  "lat": "31.9539",
  "lng": "35.9106",
  "num_chargers": 5,
  "description": "Description",
  "logo_url": "https://example.com/logo.png",
  "ad_url": "https://example.com/ad.png",
  "payment_types": "card,cash",
  "availability": "24/7",
  "subscription": "free",
  "visible_on_map": true,
  "ocpi_id": "OCPI-001",
  "ocpi_name": "OCPI Name",
  "ocpi_address": "123 Main St",
  "ocpi_city": "Amman",
  "ocpi_postal_code": "11118",
  "ocpi_country": "JO",
  "ocpi_visible": true,
  "ocpi_facility": "parking",
  "ocpi_parking_restrictions": "none",
  "ocpi_directions": "Directions AR",
  "ocpi_directions_en": "Directions EN"
}
```

**Response Body (Success - 200/201)**:
```json
{
  "success": true,
  "message": "Location saved successfully"
}
```

---

### Chargers

#### Get All Chargers
- **Endpoint Name**: Get Chargers
- **HTTP Method**: `GET`
- **URL Path**: `/v4/charger`
- **Node-RED Flow Name**: `v4-charger-get` (assumed)
- **Description**: Retrieves all chargers, optionally filtered by status or location

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status (`online`, `offline`) |
| `locationId` | string | No | Filter by location ID |
| `location_id` | string | No | Alternative parameter name |

**Response Body (Success - 200)**:
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "ID": "1",
      "chargerID": "1",
      "charger_id": "1",
      "id": "1",
      "Name": "Charger 1",
      "name": "Charger 1",
      "status": "online",
      "type": "AC",
      "locationId": "1",
      "location_id": "1",
      "Time": "2024-01-19T10:30:00Z",
      "time": "2024-01-19T10:30:00Z",
      "ocpi_last_update": "2024-01-19T10:30:00Z"
    }
  ]
}
```

---

#### Get Chargers by Status
- **Endpoint Name**: Get Chargers by Status
- **HTTP Method**: `GET`
- **URL Path**: `/v4/charger?status={status}` or `/chargers/{status}`
- **Node-RED Flow Name**: `chargers-status` (assumed)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | Yes | `online` or `offline` |

**Response Body (Success - 200)**:
Same format as Get All Chargers

---

#### Get Charger Status (Combined)
- **Endpoint Name**: Get Charger Status
- **HTTP Method**: `GET`
- **URL Path**: `/chargers/status` or `/chargers/state`
- **Node-RED Flow Name**: `chargers-status-combined` (assumed)
- **Description**: Returns both online and offline chargers

**Response Body (Success - 200)**:
```json
{
  "offline": [
    {
      "ID": "2",
      "Name": "Charger 2",
      "status": "offline"
    }
  ],
  "online": [
    {
      "ID": "1",
      "Name": "Charger 1",
      "status": "online"
    }
  ]
}
```

**Alternative Response Format**:
```json
[
  [
    { "ID": "2", "status": "offline" }
  ],
  [
    { "ID": "1", "status": "online" }
  ]
]
```

---

#### Get Charger Details
- **Endpoint Name**: Get Charger Details
- **HTTP Method**: `GET`
- **URL Path**: `/chargers/{id}` or `/chargers/details/{id}`
- **Node-RED Flow Name**: `chargers-details` (assumed)

**Response Body (Success - 200)**:
```json
{
  "charger_id": "1",
  "chargerID": "1",
  "id": "1",
  "name": "Charger 1",
  "type": "AC",
  "status": "online",
  "max_session_time": 120,
  "num_connectors": 2,
  "description": "Charger description"
}
```

---

#### Create/Update Charger
- **Endpoint Name**: Save Charger
- **HTTP Method**: `POST` (create) or `PUT` (update)
- **URL Path**: `/chargers` (create) or `/chargers/{id}` (update) or `/chargers/save`
- **Node-RED Flow Name**: `chargers-save` (assumed)

**Request Body**:
```json
{
  "charger_id": "1",
  "name": "Charger Name",
  "type": "AC",
  "status": "online",
  "max_session_time": 120,
  "num_connectors": 2,
  "description": "Description",
  "location_id": "1"
}
```

**Response Body (Success - 200/201)**:
```json
{
  "success": true,
  "message": "Charger saved successfully"
}
```

---

### Connectors

#### Get Connectors by Charger
- **Endpoint Name**: Get Connectors
- **HTTP Method**: `GET`
- **URL Path**: `/connectors?chargerId={id}` or `/connectors?charger_id={id}` or `/chargers/{id}/connectors`
- **Node-RED Flow Name**: `connectors-get` (assumed)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chargerId` | string | Yes | Charger ID |
| `charger_id` | string | Yes | Alternative parameter name |

**Response Body (Success - 200)**:
```json
[
  {
    "id": "1",
    "connector_id": "1",
    "value": "1",
    "name": "Connector 1",
    "label": "Connector 1"
  }
]
```

---

#### Get Connector Details
- **Endpoint Name**: Get Connector Details
- **HTTP Method**: `GET`
- **URL Path**: `/connectors/{id}` or `/connectors/details/{id}`
- **Node-RED Flow Name**: `connectors-details` (assumed)

**Response Body (Success - 200)**:
```json
{
  "connector_id": "1",
  "id": "1",
  "connector_type": "type2",
  "type": "type2",
  "status": "available",
  "power": "22",
  "power_unit": "kw",
  "time_limit": 120,
  "max_session_time": 120,
  "pin": "1234",
  "ocpi_standard": "ocpi",
  "ocpi_format": "v2.1.1",
  "ocpi_power_type": "AC_3_PHASE",
  "ocpi_max_voltage": "400",
  "ocpi_max_amperage": "32",
  "ocpi_tariff_ids": "tariff-1",
  "stop_on80": true,
  "stop_on_80": true,
  "enabled": true
}
```

---

#### Create/Update Connector
- **Endpoint Name**: Save Connector
- **HTTP Method**: `POST` (create) or `PUT` (update)
- **URL Path**: `/connectors` (create) or `/connectors/{id}` (update) or `/connectors/save`
- **Node-RED Flow Name**: `connectors-save` (assumed)

**Request Body**:
```json
{
  "connector_id": "1",
  "charger_id": "1",
  "connector_type": "type2",
  "status": "available",
  "power": "22",
  "power_unit": "kw",
  "time_limit": 120,
  "pin": "1234",
  "ocpi_standard": "ocpi",
  "ocpi_format": "v2.1.1",
  "ocpi_power_type": "AC_3_PHASE",
  "ocpi_max_voltage": "400",
  "ocpi_max_amperage": "32",
  "ocpi_tariff_ids": "tariff-1",
  "stop_on80": false,
  "enabled": true
}
```

**Response Body (Success - 200/201)**:
```json
{
  "success": true,
  "message": "Connector saved successfully"
}
```

---

### Tariffs

#### Get Tariff by Connector
- **Endpoint Name**: Get Tariff
- **HTTP Method**: `GET`
- **URL Path**: `/tariffs?connectorId={id}` or `/connectors/{id}/tariffs`
- **Node-RED Flow Name**: `tariffs-get` (assumed)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectorId` | string | Yes | Connector ID |

**Response Body (Success - 200)**:
```json
{
  "tariff_id": "1",
  "connector_id": "1",
  "type": "standard",
  "buy_rate": 0.25,
  "sell_rate": 0.30,
  "transaction_fees": 0.50,
  "client_percentage": 70,
  "partner_percentage": 30,
  "peak_type": "peak",
  "status": "active"
}
```

---

#### Create/Update Tariff
- **Endpoint Name**: Save Tariff
- **HTTP Method**: `POST` (create) or `PUT` (update)
- **URL Path**: `/tariffs` (create) or `/tariffs/{id}` (update) or `/tariffs/save`
- **Node-RED Flow Name**: `tariffs-save` (assumed)

**Request Body**:
```json
{
  "tariff_id": "1",
  "connector_id": "1",
  "type": "standard",
  "buy_rate": 0.25,
  "sell_rate": 0.30,
  "transaction_fees": 0.50,
  "client_percentage": 70,
  "partner_percentage": 30,
  "peak_type": "peak",
  "status": "active"
}
```

**Response Body (Success - 200/201)**:
```json
{
  "success": true,
  "message": "Tariff saved successfully"
}
```

---

### Users

#### Create Partner User
- **Endpoint Name**: Create Partner User
- **HTTP Method**: `POST`
- **URL Path**: `/users/partner` or `/users`
- **Node-RED Flow Name**: `users-partner-create` (assumed)

**Request Body**:
```json
{
  "organization_id": "1",
  "f_name": "John",
  "l_name": "Doe",
  "mobile": "+962791234567",
  "role_id": 2,
  "email": "john.doe@example.com",
  "language": "en"
}
```

**Response Body (Success - 201)**:
```json
{
  "success": true,
  "message": "Partner user saved"
}
```

---

#### Get Leadership Users
- **Endpoint Name**: Get Leadership Users
- **HTTP Method**: `GET`
- **URL Path**: `/users/leadership`
- **Node-RED Flow Name**: `users-leadership-get` (assumed)

**Response Body (Success - 200)**:
```json
[
  {
    "id": "1",
    "firstName": "John",
    "lastName": "Doe",
    "mobile": "+962791234567",
    "email": "john.doe@example.com",
    "role": "admin"
  }
]
```

---

### Dashboard

#### Get Active Sessions
- **Endpoint Name**: Get Active Sessions
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/active-sessions`
- **Node-RED Flow Name**: `dashboard-active-sessions` (assumed)
- **Description**: Returns currently active charging sessions

**Response Body (Success - 200)**:
```json
[
  {
    "Start Date/Time": "2024-01-19T10:30:00Z",
    "Session ID": "session-123",
    "Location": "Location 1",
    "Charger": "Charger 1",
    "Connector": "Connector 1",
    "Energy (KWH)": 15.5,
    "Amount (JOD)": 4.65,
    "mobile": "+962791234567",
    "User ID": "user-123"
  }
]
```

---

#### Get Local Sessions
- **Endpoint Name**: Get Local Sessions
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/local-sessions`
- **Node-RED Flow Name**: `dashboard-local-sessions` (assumed)

**Response Body (Success - 200)**:
```json
[
  {
    "Start Date/Time": "2024-01-19T10:30:00Z",
    "Location": "Location 1",
    "Charger": "Charger 1",
    "Connector": "Connector 1",
    "Energy (KWH)": 15.5,
    "Amount (JOD)": 4.65,
    "User ID": "user-123"
  }
]
```

---

#### Get User Info
- **Endpoint Name**: Get User Info
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/user-info?mobile={mobile}`
- **Node-RED Flow Name**: `dashboard-user-info` (assumed)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mobile` | string | Yes | User mobile number (min 10 digits) |

**Response Body (Success - 200)**:
```json
{
  "mobile": "+962791234567",
  "first_name": "John",
  "last_name": "Doe",
  "balance": 50.00,
  "language": "en",
  "device_id": "device-123"
}
```

---

#### Get User Sessions
- **Endpoint Name**: Get User Sessions
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/user-sessions?mobile={mobile}`
- **Node-RED Flow Name**: `dashboard-user-sessions` (assumed)

**Response Body (Success - 200)**:
```json
[
  {
    "Date/Time": "2024-01-19T10:30:00Z",
    "Charger": "Charger 1",
    "Energy": 15.5,
    "Amount": 4.65
  }
]
```

---

#### Get User Payments
- **Endpoint Name**: Get User Payments
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/user-payments?mobile={mobile}`
- **Node-RED Flow Name**: `dashboard-user-payments` (assumed)

**Response Body (Success - 200)**:
```json
[
  {
    "Date/Time": "2024-01-19T10:30:00Z",
    "Source": "eFawateerCom",
    "Amount (JOD)": 50.00
  }
]
```

---

#### Get Dashboard Statistics
- **Endpoint Name**: Get Dashboard Stats
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/stats`
- **Node-RED Flow Name**: `dashboard-stats` (assumed)
- **Description**: Returns aggregated dashboard statistics

**Response Body (Success - 200)**:
```json
{
  "activeSessions": 5,
  "utilization": 75.5,
  "chargersOnline": 45,
  "newUsers": 12,
  "sessions": 150,
  "payments": 200,
  "faults": 3,
  "revenue": 5000.50,
  "tariffAC": 0.25,
  "tariffDC": 0.30,
  "eFawateerCom": 2000.00,
  "ni": 1500.00,
  "orangeMoney": 1000.00,
  "totalCashIn": 4500.00,
  "expendature": 500.00
}
```

---

#### Get Charger Status
- **Endpoint Name**: Get Charger Status
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/charger-status?chargerId={id}`
- **Node-RED Flow Name**: `dashboard-charger-status` (assumed)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chargerId` | string | Yes | Charger ID |

**Response Body (Success - 200)**:
```json
{
  "status": "online"
}
```

---

#### Get Connector Status
- **Endpoint Name**: Get Connector Status
- **HTTP Method**: `GET`
- **URL Path**: `/dashboard/connector-status?connectorId={id}`
- **Node-RED Flow Name**: `dashboard-connector-status` (assumed)

**Response Body (Success - 200)**:
```json
{
  "status": "available"
}
```

---

#### Send Charger Command
- **Endpoint Name**: Send Charger Command
- **HTTP Method**: `POST`
- **URL Path**: `/dashboard/charger-command`
- **Node-RED Flow Name**: `dashboard-charger-command` (assumed)
- **Description**: Sends remote control commands to chargers

**Request Body**:
```json
{
  "chargerId": "1",
  "command": "restart"
}
```

**Command Values**:
- `restart` - Restart the charger
- `stop` - Stop charging session
- `unlock` - Unlock connector

**Response Body (Success - 200)**:
```json
{
  "success": true,
  "message": "Command sent successfully"
}
```

---

### Reports

#### Get Financial Reports
- **Endpoint Name**: Get Financial Reports
- **HTTP Method**: `POST`
- **URL Path**: `/reports/financial` or `/reports`
- **Node-RED Flow Name**: `reports-financial` (assumed)
- **Description**: Generates financial reports based on filters

**Request Body**:
```json
{
  "organizationId": "1",
  "locationId": "1",
  "chargerId": "1",
  "connectorId": "1",
  "period": "daily",
  "payment": "prepaid",
  "from": "2024-01-01",
  "to": "2024-01-31"
}
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | `daily`, `weekly`, `monthly` |
| `payment` | string | No | `prepaid`, `postpaid`, `mixed` |
| `from` | string | No | Start date (YYYY-MM-DD) |
| `to` | string | No | End date (YYYY-MM-DD) |

**Response Body (Success - 200)**:
```json
[
  {
    "date": "2024-01-19",
    "organization": "Organization 1",
    "location": "Location 1",
    "charger": "Charger 1",
    "connector": "Connector 1",
    "sessions": 10,
    "energy": 150.5,
    "revenue": 45.15,
    "payment_type": "prepaid"
  }
]
```

---

## Function Nodes Documentation

### Response Format Standardization Function
- **Function Name**: `standardizeResponse`
- **Flow Name**: All v4 flows
- **Purpose**: Standardizes API responses to a consistent format

**Input Payload Structure**:
```javascript
{
  payload: [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" }
  ]
}
```

**Output Payload Structure**:
```javascript
{
  payload: {
    success: true,
    count: 2,
    data: [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" }
    ]
  }
}
```

**Business Logic**:
- Wraps array responses in `{ success: true, count: N, data: [...] }` format
- Handles empty arrays (returns 204 No Content)
- Handles single objects (wraps in array)

**Edge Cases**:
- Empty result set → 204 No Content
- Database error → `{ success: false, message: "..." }`
- Null/undefined → Empty array

---

### Data Extraction Function
- **Function Name**: `extractDataFromResponse`
- **Flow Name**: Frontend helper (not Node-RED)
- **Purpose**: Extracts data from Node-RED response format

**Input Payload Structure**:
```javascript
{
  success: true,
  count: 2,
  data: [...]
}
```

**Output Payload Structure**:
```javascript
[...] // Array of data items
```

**Business Logic**:
- Extracts `data` array from response object
- Handles direct array responses
- Handles single object responses (wraps in array)
- Returns empty array on error

---

### Charger Status Mapping Function
- **Function Name**: `mapChargerStatus`
- **Flow Name**: Charger status flows
- **Purpose**: Maps database charger records to standardized format

**Input Payload Structure**:
```javascript
{
  payload: [
    {
      ID: "1",
      Name: "Charger 1",
      Status: "online",
      LocationId: "1"
    }
  ]
}
```

**Output Payload Structure**:
```javascript
{
  payload: [
    {
      id: "1",
      name: "Charger 1",
      status: "online",
      locationId: "1",
      time: "2024-01-19T10:30:00Z"
    }
  ]
}
```

**Business Logic**:
- Normalizes field names (ID → id, Name → name)
- Handles multiple field name variations
- Adds timestamp if missing
- Filters by status if query parameter provided

---

### Organization Normalization Function
- **Function Name**: `normalizeOrganizations`
- **Flow Name**: Organization flows
- **Purpose**: Normalizes organization data for frontend consumption

**Input Payload Structure**:
```javascript
{
  payload: [
    {
      organization_id: "1",
      name: "Org 1",
      total_amount: 15000.50,
      total_energy: 2500.75
    }
  ]
}
```

**Output Payload Structure**:
```javascript
{
  payload: [
    {
      id: "1",
      organization_id: "1",
      name: "Org 1",
      amount: 15000.50,
      energy: 2500.75
    }
  ]
}
```

**Business Logic**:
- Maps `total_amount` → `amount`
- Maps `total_energy` → `energy`
- Ensures `id` field exists
- Handles missing fields with defaults

---

## Data Models

### Organization
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Organization ID |
| `organization_id` | string | Yes | Alternative ID field |
| `name` | string | Yes | Organization name |
| `name_ar` | string | No | Arabic name |
| `amount` | number | No | Total revenue (default: 0) |
| `energy` | number | No | Total energy (default: 0) |
| `contact_first_name` | string | No | Contact first name |
| `contact_last_name` | string | No | Contact last name |
| `contact_phoneNumber` | string | No | Contact phone |
| `details` | string | No | Organization details |

**Relationships**:
- One-to-many with Locations

---

### Location
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location_id` | string | Yes | Location ID |
| `organization_id` | string | Yes | Parent organization ID |
| `name` | string | Yes | Location name |
| `name_ar` | string | No | Arabic name |
| `lat` | string | No | Latitude |
| `lng` | string | No | Longitude |
| `num_chargers` | number | No | Number of chargers |
| `description` | string | No | Description |
| `logo_url` | string | No | Logo URL |
| `ad_url` | string | No | Advertisement URL |
| `payment_types` | string | No | Comma-separated payment types |
| `availability` | string | No | Availability schedule |
| `subscription` | string | No | Subscription type (default: "free") |
| `visible_on_map` | boolean | No | Visible on map (default: false) |
| `ocpi_id` | string | No | OCPI identifier |
| `ocpi_name` | string | No | OCPI name |
| `ocpi_address` | string | No | OCPI address |
| `ocpi_city` | string | No | OCPI city |
| `ocpi_postal_code` | string | No | OCPI postal code |
| `ocpi_country` | string | No | OCPI country code |
| `ocpi_visible` | boolean | No | OCPI visible flag |
| `ocpi_facility` | string | No | OCPI facility type |
| `ocpi_parking_restrictions` | string | No | Parking restrictions |
| `ocpi_directions` | string | No | Directions (Arabic) |
| `ocpi_directions_en` | string | No | Directions (English) |

**Relationships**:
- Many-to-one with Organization
- One-to-many with Chargers

---

### Charger
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `charger_id` | string | Yes | Charger ID |
| `chargerID` | string | Yes | Alternative ID field |
| `id` | string | Yes | Alternative ID field |
| `name` | string | Yes | Charger name |
| `type` | string | No | Charger type (AC/DC) |
| `status` | string | No | Status (online/offline) |
| `location_id` | string | Yes | Parent location ID |
| `max_session_time` | number | No | Maximum session time (minutes) |
| `num_connectors` | number | No | Number of connectors |
| `description` | string | No | Description |
| `time` | string | No | Last update timestamp |

**Relationships**:
- Many-to-one with Location
- One-to-many with Connectors

---

### Connector
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connector_id` | string | Yes | Connector ID |
| `charger_id` | string | Yes | Parent charger ID |
| `connector_type` | string | No | Type (type2, ccs2, chademo) |
| `status` | string | No | Status (available/busy/offline) |
| `power` | string | No | Power rating |
| `power_unit` | string | No | Power unit (kw/amp) |
| `time_limit` | number | No | Time limit (minutes) |
| `pin` | string | No | PIN code |
| `ocpi_standard` | string | No | OCPI standard (ocpi/ocpp) |
| `ocpi_format` | string | No | OCPI format version |
| `ocpi_power_type` | string | No | OCPI power type |
| `ocpi_max_voltage` | string | No | OCPI max voltage |
| `ocpi_max_amperage` | string | No | OCPI max amperage |
| `ocpi_tariff_ids` | string | No | OCPI tariff IDs |
| `stop_on80` | boolean | No | Stop at 80% SOC |
| `enabled` | boolean | No | Enabled flag (default: true) |

**Relationships**:
- Many-to-one with Charger
- One-to-one with Tariff

---

### Tariff
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tariff_id` | string | Yes | Tariff ID |
| `connector_id` | string | Yes | Parent connector ID |
| `type` | string | No | Tariff type |
| `buy_rate` | number | Yes | Buy rate (JOD/kWh) |
| `sell_rate` | number | Yes | Sell rate (JOD/kWh) |
| `transaction_fees` | number | No | Transaction fees (JOD) |
| `client_percentage` | number | No | Client percentage |
| `partner_percentage` | number | No | Partner percentage |
| `peak_type` | string | No | Peak type (peak/off-peak) |
| `status` | string | No | Status (active/inactive) |

**Relationships**:
- One-to-one with Connector

---

### User
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | User ID |
| `mobile` | string | Yes | Mobile number |
| `first_name` | string | No | First name |
| `last_name` | string | No | Last name |
| `email` | string | No | Email address |
| `balance` | number | No | Account balance (JOD) |
| `language` | string | No | Preferred language |
| `device_id` | string | No | Device identifier |
| `role_id` | number | No | Role ID |
| `organization_id` | string | No | Organization ID (for partner users) |

---

## Error Handling

### Global Error Handling Strategy
Node-RED flows should implement consistent error handling:

1. **Try-Catch Blocks**: All function nodes should wrap logic in try-catch
2. **Error Response Format**: Standardized error responses
3. **HTTP Status Codes**: Appropriate status codes for different error types
4. **Logging**: All errors logged for debugging

### Common Error Responses

#### Database Error (500)
```json
{
  "success": false,
  "message": "Database error occurred",
  "error": "Connection timeout"
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

#### Not Found Error (404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

#### Unauthorized Error (401)
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### Error Payload Format
All error responses follow this structure:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (optional)",
  "code": "ERROR_CODE (optional)"
}
```

---

## Logging & Monitoring

### Debug Nodes Usage
- **Debug Nodes**: Used for development and troubleshooting
- **Log Levels**: `info`, `warn`, `error`
- **Log Format**: JSON format for structured logging

### Logging Strategy
1. **Request Logging**: Log all incoming requests (method, path, query params)
2. **Response Logging**: Log response status and timing
3. **Error Logging**: Log all errors with stack traces
4. **Performance Logging**: Log slow queries (>1 second)

### Monitoring Considerations
- **Health Check Endpoint**: `/health` (recommended)
- **Metrics Collection**: Response times, error rates
- **Alerting**: Set up alerts for high error rates
- **Database Monitoring**: Monitor query performance

---

## Deployment

### How to Deploy the Node-RED Project

1. **Export Flows**:
   - In Node-RED editor, go to Menu → Export
   - Select "flows" and copy the JSON

2. **Import Flows**:
   - In target Node-RED instance, go to Menu → Import
   - Paste the flows JSON

3. **Deploy**:
   - Click "Deploy" button in Node-RED editor

### Required Environment Variables
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ion_dashboard
DB_USER=root
DB_PASSWORD=password

# API Configuration
API_PORT=1880
API_BASE_URL=https://dash.evse.cloud/api

# Security
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://dash.evse.cloud

# OCPI/OCPP Configuration
OCPI_ENDPOINT=https://ocpi.example.com
OCPP_ENDPOINT=ws://ocpp.example.com
```

### Configuration Steps

1. **Install Node-RED**:
   ```bash
   npm install -g node-red
   ```

2. **Install Required Nodes**:
   ```bash
   npm install node-red-node-mysql
   npm install node-red-contrib-http-request
   ```

3. **Configure Database**:
   - Update MySQL connection settings in flow nodes
   - Test database connectivity

4. **Configure CORS**:
   - In `settings.js`, configure CORS:
   ```javascript
   httpNodeCors: {
     origin: "*",
     methods: "GET,PUT,POST,DELETE,OPTIONS"
   }
   ```

5. **Start Node-RED**:
   ```bash
   node-red
   ```

6. **Verify Deployment**:
   - Test endpoints using Postman or curl
   - Check Node-RED logs for errors

---

## Testing

### How to Test the API

#### Using cURL

**Get Organizations**:
```bash
curl -X GET "https://dash.evse.cloud/api/v4/org" \
  -H "Content-Type: application/json"
```

**Get Chargers by Status**:
```bash
curl -X GET "https://dash.evse.cloud/api/v4/charger?status=online" \
  -H "Content-Type: application/json"
```

**Create Organization**:
```bash
curl -X POST "https://dash.evse.cloud/api/organizations" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Organization",
    "organization_id": "test-1"
  }'
```

**Get Dashboard Stats**:
```bash
curl -X GET "https://dash.evse.cloud/api/dashboard/stats" \
  -H "Content-Type: application/json"
```

#### Using Postman

1. **Create Collection**: "ION Dashboard API"
2. **Set Base URL**: `https://dash.evse.cloud/api`
3. **Add Requests**: Create requests for each endpoint
4. **Set Headers**: `Content-Type: application/json`
5. **Test Responses**: Verify response format and status codes

#### Test Scenarios

1. **Happy Path**: Valid requests with expected responses
2. **Error Handling**: Invalid inputs, missing fields
3. **Edge Cases**: Empty results, null values
4. **Performance**: Response times, concurrent requests
5. **Security**: Unauthorized access, SQL injection attempts

---

## Assumptions

Due to the absence of actual Node-RED flow files in this repository, the following assumptions were made:

1. **Flow Names**: Flow names are inferred from endpoint paths (e.g., `/v4/org` → `v4-org-get`)

2. **Response Format**: All v4 endpoints return standardized format:
   ```json
   {
     "success": true,
     "count": N,
     "data": [...]
   }
   ```

3. **Database**: MySQL/MariaDB is assumed based on data models and field naming conventions

4. **Authentication**: Authentication method is not explicitly documented in frontend code; assumed to be JWT or API keys

5. **Error Handling**: Standard HTTP status codes and error response format assumed

6. **Node-RED Version**: Assumed to be a recent stable version (1.x or 2.x)

7. **Function Node Logic**: Business logic in function nodes is inferred from frontend data transformations

8. **Database Schema**: Table and column names inferred from API request/response payloads

9. **OCPI/OCPP Integration**: Assumed to be handled via external nodes or HTTP requests

10. **Real-time Updates**: Charger status updates assumed to be polled or pushed via WebSocket/SSE

---

## Future Improvements

### Security Enhancements
1. **Implement JWT Authentication**: Add JWT token validation middleware
2. **Rate Limiting**: Implement rate limiting per IP/API key
3. **Input Sanitization**: Add comprehensive input validation and sanitization
4. **SQL Injection Prevention**: Ensure all queries use parameterized statements
5. **HTTPS Enforcement**: Require HTTPS in production
6. **API Key Management**: Implement API key rotation and revocation

### Scalability Improvements
1. **Caching Layer**: Add Redis cache for frequently accessed data
2. **Database Connection Pooling**: Optimize database connections
3. **Load Balancing**: Deploy multiple Node-RED instances behind load balancer
4. **Async Processing**: Move heavy operations to background queues
5. **Database Indexing**: Add indexes on frequently queried fields

### Performance Optimizations
1. **Response Compression**: Enable gzip compression for large responses
2. **Pagination**: Implement pagination for list endpoints
3. **Query Optimization**: Optimize slow database queries
4. **Caching Strategy**: Cache static data (organizations, locations)
5. **Batch Operations**: Support batch create/update operations

### Feature Enhancements
1. **WebSocket Support**: Real-time updates for charger status
2. **GraphQL API**: Add GraphQL endpoint for flexible queries
3. **API Versioning**: Proper versioning strategy (v4, v5, etc.)
4. **OpenAPI/Swagger**: Generate API documentation automatically
5. **Webhook Support**: Allow external systems to subscribe to events
6. **Audit Logging**: Comprehensive audit trail for all operations
7. **Data Export**: CSV/Excel export for reports
8. **Real-time Analytics**: Streaming analytics for dashboard

### Documentation Improvements
1. **Interactive API Docs**: Swagger/OpenAPI interactive documentation
2. **Code Examples**: Add code examples in multiple languages
3. **Postman Collection**: Provide ready-to-use Postman collection
4. **Video Tutorials**: Create video tutorials for common operations
5. **Architecture Diagrams**: Visual diagrams of flow architecture

---

## Appendix

### HTTP Status Codes Reference
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Successful request with no response body
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Response Format Variations
The frontend handles multiple response formats for backward compatibility:

1. **Standard Format**:
   ```json
   { "success": true, "count": 2, "data": [...] }
   ```

2. **Array Format**:
   ```json
   [...]
   ```

3. **Object Format**:
   ```json
   { "field": "value" }
   ```

4. **Empty Response**: `204 No Content`

### Field Name Variations
The API supports multiple field name variations for backward compatibility:

- `id` / `ID` / `organization_id` / `charger_id` / `location_id`
- `name` / `Name` / `label`
- `status` / `Status`
- `locationId` / `location_id` / `LocationId`

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-19  
**Maintained By**: ION Dashboard Development Team
