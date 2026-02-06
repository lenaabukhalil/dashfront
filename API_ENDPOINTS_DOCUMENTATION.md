# API Endpoints Documentation

Complete documentation for all Node-RED API endpoints.

**Base URL:** `http://your-node-red-host:1880`

**All endpoints use Query Parameters only (NO path parameters)**

---

## Table of Contents

1. [Organizations API](#organizations-api)
2. [Locations API](#locations-api)
3. [Chargers API](#chargers-api)
4. [Connectors API](#connectors-api)
5. [Tariffs API](#tariffs-api)

---

## Organizations API

Base endpoint: `/api/v4/org`

### GET /api/v4/org

Get all organizations or a specific organization.

**Query Parameters:**
- `id` (optional): Organization ID to get specific organization

**Examples:**
```bash
# Get all organizations
GET /api/v4/org

# Get specific organization
GET /api/v4/org?id=1
```

**Response (All Organizations):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Organization 1"
    },
    {
      "id": 2,
      "name": "Organization 2"
    }
  ]
}
```

**Response (Single Organization):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "organization_id": 1,
      "name": "Organization 1",
      "name_ar": "منظمة 1",
      "contact_first_name": "John",
      "contact_last_name": "Doe",
      "contact_phoneNumber": "+962791234567",
      "details": "Organization details"
    }
  ]
}
```

**Response (No Content):**
- Status: `204 No Content`
- Body: `[]`

**Error Responses:**
- `400 Bad Request`: Invalid organization ID (must be a number)
- `500 Internal Server Error`: Server error

---

### POST /api/v4/org

Create a new organization.

**Request Body:**
```json
{
  "name": "Organization Name",
  "name_ar": "اسم المنظمة",
  "contact_first_name": "John",
  "contact_last_name": "Doe",
  "contact_phoneNumber": "+962791234567",
  "details": "Organization details"
}
```

**Required Fields:**
- `name` (string): Organization name

**Optional Fields:**
- `name_ar` (string): Arabic name
- `contact_first_name` (string): Contact first name
- `contact_last_name` (string): Contact last name
- `contact_phoneNumber` (string): Contact phone number
- `details` (string): Organization details

**Response (Success):**
```json
{
  "success": true,
  "message": "Organization saved successfully",
  "insertId": 5
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: Missing required field `name`
- `500 Internal Server Error`: Server error

---

### PUT /api/v4/org

Update an existing organization.

**Query Parameters:**
- `id` (required): Organization ID

**Request Body:**
```json
{
  "name": "Updated Organization Name",
  "name_ar": "اسم المنظمة المحدث",
  "contact_first_name": "Jane",
  "contact_last_name": "Smith",
  "contact_phoneNumber": "+962798765432",
  "details": "Updated details"
}
```

**Required Fields:**
- `id` (query parameter): Organization ID
- `name` (body): Organization name

**Response (Success):**
```json
{
  "success": true,
  "message": "Organization updated successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: 
  - Missing organization ID (`?id={id}` required)
  - Invalid organization ID (must be a number)
  - Missing required field `name`
- `500 Internal Server Error`: Server error

---

### DELETE /api/v4/org

Delete an organization.

**Query Parameters:**
- `id` (required): Organization ID

**Examples:**
```bash
DELETE /api/v4/org?id=1
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: 
  - Missing organization ID (`?id={id}` required)
  - Invalid organization ID (must be a number)
  - Cannot delete organization (has associated locations)
- `500 Internal Server Error`: Server error

**Note:** Organization cannot be deleted if it has associated locations.

---

## Locations API

Base endpoint: `/api/v4/location`

### GET /api/v4/location

Get all locations, a specific location, or locations by organization.

**Query Parameters:**
- `id` (optional): Location ID to get specific location
- `organizationId` or `organization_id` (optional): Filter by organization ID

**Examples:**
```bash
# Get all locations
GET /api/v4/location

# Get specific location
GET /api/v4/location?id=1

# Get locations by organization
GET /api/v4/location?organizationId=5
```

**Response (All Locations):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "location_id": 1,
      "organization_id": 5,
      "name": "Location 1",
      "name_ar": "موقع 1",
      "lat": "31.9539",
      "lng": "35.9106",
      "num_chargers": 4,
      "payment_types": "credit_card,cash",
      "availability": "public",
      "visible_on_map": true
    }
  ]
}
```

**Response (Single Location):**
```json
{
  "success": true,
  "data": {
    "location_id": 1,
    "organization_id": 5,
    "name": "Location 1",
    "name_ar": "موقع 1",
    "lat": "31.9539",
    "lng": "35.9106",
    "num_chargers": 4,
    "description": "Location description",
    "logo_url": "https://example.com/logo.png",
    "ad_url": "https://example.com/ad.png",
    "payment_types": "credit_card,cash",
    "availability": "public",
    "subscription": "free",
    "visible_on_map": true,
    "ocpi_id": "OCPI123",
    "ocpi_name": "OCPI Location",
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
}
```

**Response (No Content):**
- Status: `204 No Content`
- Body: `[]`

**Error Responses:**
- `404 Not Found`: Location not found (when using `id`)
- `500 Internal Server Error`: Server error

---

### POST /api/v4/location

Create a new location.

**Request Body:**
```json
{
  "organization_id": 5,
  "name": "New Location",
  "name_ar": "موقع جديد",
  "lat": "31.9539",
  "lng": "35.9106",
  "num_chargers": 4,
  "description": "Location description",
  "logo_url": "https://example.com/logo.png",
  "ad_url": "https://example.com/ad.png",
  "payment_types": "credit_card,cash",
  "availability": "public",
  "subscription": "free",
  "visible_on_map": true,
  "ocpi_id": "OCPI123",
  "ocpi_name": "OCPI Location",
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

**Required Fields:**
- `name` (string): Location name
- `organization_id` (number): Organization ID

**Response (Success):**
```json
{
  "success": true,
  "message": "Location created successfully",
  "insertId": 10
}
```
- Status: `201 Created`

**Error Responses:**
- `400 Bad Request`: 
  - Missing required field `name`
  - Missing required field `organization_id`
- `500 Internal Server Error`: Server error

---

### PUT /api/v4/location

Update an existing location.

**Query Parameters:**
- `id` (required): Location ID

**Request Body:**
```json
{
  "organization_id": 5,
  "name": "Updated Location",
  "name_ar": "موقع محدث",
  "lat": "31.9539",
  "lng": "35.9106",
  "num_chargers": 6,
  "description": "Updated description",
  "visible_on_map": false
}
```

**Required Fields:**
- `id` (query parameter): Location ID
- `name` (body): Location name

**Response (Success):**
```json
{
  "success": true,
  "message": "Location updated successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: 
  - Missing location ID (`?id={id}` required)
  - Missing required field `name`
- `404 Not Found`: Location not found
- `500 Internal Server Error`: Server error

---

### DELETE /api/v4/location

Delete a location.

**Query Parameters:**
- `id` (required): Location ID

**Examples:**
```bash
DELETE /api/v4/location?id=1
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Location deleted successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: 
  - Missing location ID (`?id={id}` required)
  - Cannot delete location (has associated chargers)
- `404 Not Found`: Location not found
- `500 Internal Server Error`: Server error

**Note:** Location cannot be deleted if it has associated chargers.

---

## Chargers API

Base endpoint: `/api/v4/charger`

### GET /api/v4/charger

Get all chargers, a specific charger, or filtered chargers.

**Query Parameters:**
- `id` (optional): Charger ID to get specific charger
- `status` (optional): Filter by status (`online` or `offline`)
- `locationId` or `location_id` (optional): Filter by location ID

**Examples:**
```bash
# Get all chargers
GET /api/v4/charger

# Get specific charger
GET /api/v4/charger?id=1

# Get chargers by status
GET /api/v4/charger?status=online

# Get chargers by location
GET /api/v4/charger?locationId=5

# Combined filters
GET /api/v4/charger?status=online&locationId=5
```

**Response (All Chargers):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Charger 1",
      "chargerID": "CHG001",
      "time": "2024-01-15T10:30:00Z",
      "status": "online",
      "type": "AC",
      "locationId": 5
    },
    {
      "id": 2,
      "name": "Charger 2",
      "chargerID": "CHG002",
      "time": "2024-01-15T11:00:00Z",
      "status": "offline",
      "type": "DC",
      "locationId": 5
    }
  ]
}
```

**Response (Single Charger):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Charger 1",
    "chargerID": "CHG001",
    "time": "2024-01-15T10:30:00Z",
    "status": "online",
    "type": "AC",
    "locationId": 5
  }
}
```

**Response (No Content):**
- Status: `204 No Content`
- Body: `[]`

**Error Responses:**
- `400 Bad Request`: Invalid status value (must be `online` or `offline`)
- `404 Not Found`: Charger not found (when using `id`)
- `500 Internal Server Error`: Server error

---

### POST /api/v4/charger

Create a new charger.

**Request Body:**
```json
{
  "name": "New Charger",
  "type": "AC",
  "status": "online",
  "location_id": 5,
  "max_session_time": 120,
  "num_connectors": 2,
  "description": "Charger description"
}
```

**Required Fields:**
- `name` (string): Charger name
- `type` (string): Charger type
- `status` (string): Charger status

**Optional Fields:**
- `location_id` or `locationId` (number): Location ID
- `max_session_time` or `maxSessionTime` (number): Maximum session time in minutes
- `num_connectors` or `numConnectors` (number): Number of connectors
- `description` (string): Charger description

**Response (Success):**
```json
{
  "success": true,
  "message": "Charger created successfully",
  "insertId": 15
}
```
- Status: `201 Created`

**Error Responses:**
- `400 Bad Request`: Missing required fields (`name`, `type`, `status`)
- `500 Internal Server Error`: Server error

---

### PUT /api/v4/charger

Update an existing charger.

**Query Parameters:**
- `id` (required): Charger ID

**Request Body:**
```json
{
  "name": "Updated Charger",
  "type": "DC",
  "status": "offline",
  "location_id": 6,
  "max_session_time": 180,
  "num_connectors": 4,
  "description": "Updated description"
}
```

**Required Fields:**
- `id` (query parameter): Charger ID
- `name` (body): Charger name
- `type` (body): Charger type
- `status` (body): Charger status

**Response (Success):**
```json
{
  "success": true,
  "message": "Charger updated successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: 
  - Missing charger ID (`?id={id}` required)
  - Missing required fields (`name`, `type`, `status`)
- `404 Not Found`: Charger not found
- `500 Internal Server Error`: Server error

---

### DELETE /api/v4/charger

Delete a charger.

**Query Parameters:**
- `id` (required): Charger ID

**Examples:**
```bash
DELETE /api/v4/charger?id=1
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Charger deleted successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: 
  - Missing charger ID (`?id={id}` required)
  - Cannot delete charger (has associated connectors)
- `404 Not Found`: Charger not found
- `500 Internal Server Error`: Server error

**Note:** Charger cannot be deleted if it has associated connectors.

---

## Connectors API

Base endpoint: `/api/v4/connector`

### GET /api/v4/connector

Get all connectors, a specific connector, or connectors by charger.

**Query Parameters:**
- `id` (optional): Connector ID to get specific connector
- `chargerId` or `charger_id` (optional): Filter by charger ID

**Examples:**
```bash
# Get all connectors
GET /api/v4/connector

# Get specific connector
GET /api/v4/connector?id=1

# Get connectors by charger
GET /api/v4/connector?chargerId=5
```

**Response (All Connectors):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "chargerId": 5,
      "type": "Type2",
      "status": "Available",
      "power": 22,
      "power_unit": "kw",
      "time_limit": 120,
      "pin": "1234",
      "ocpi_standard": "OCPI2.2",
      "ocpi_format": "SOCKET",
      "ocpi_power_type": "AC_3_PHASE",
      "ocpi_max_voltage": 400,
      "ocpi_max_amperage": 32,
      "ocpi_tariff_ids": "1,2",
      "stop_on80": 1,
      "enabled": 1
    }
  ]
}
```

**Response (Single Connector):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "chargerId": 5,
    "type": "Type2",
    "status": "Available",
    "power": 22,
    "power_unit": "kw",
    "time_limit": 120,
    "pin": "1234",
    "ocpi_standard": "OCPI2.2",
    "ocpi_format": "SOCKET",
    "ocpi_power_type": "AC_3_PHASE",
    "ocpi_max_voltage": 400,
    "ocpi_max_amperage": 32,
    "ocpi_tariff_ids": "1,2",
    "stop_on80": 1,
    "enabled": 1
  }
}
```

**Response (No Content):**
- Status: `204 No Content`
- Body: `[]`

**Error Responses:**
- `404 Not Found`: Connector not found (when using `id`)
- `500 Internal Server Error`: Server error

---

### POST /api/v4/connector

Create a new connector.

**Request Body:**
```json
{
  "charger_id": 5,
  "type": "Type2",
  "status": "Available",
  "power": 22,
  "power_unit": "kw",
  "time_limit": 120,
  "pin": "1234",
  "ocpi_standard": "OCPI2.2",
  "ocpi_format": "SOCKET",
  "ocpi_power_type": "AC_3_PHASE",
  "ocpi_max_voltage": 400,
  "ocpi_max_amperage": 32,
  "ocpi_tariff_ids": "1,2",
  "stop_on80": true,
  "enabled": true
}
```

**Required Fields:**
- `charger_id` or `chargerId` (number): Charger ID
- `type` or `connector_type` (string): Connector type
- `power` or `power_kw` (number): Power in kW
- `status` (string): Connector status

**Optional Fields:**
- `power_unit` (string): Power unit (default: "kw")
- `time_limit` (number): Time limit in minutes
- `pin` (string): PIN code
- `ocpi_standard` (string): OCPI standard version
- `ocpi_format` (string): OCPI format
- `ocpi_power_type` (string): OCPI power type
- `ocpi_max_voltage` (number): Maximum voltage
- `ocpi_max_amperage` (number): Maximum amperage
- `ocpi_tariff_ids` (string): Comma-separated tariff IDs
- `stop_on80` (boolean): Stop charging at 80% (default: false)
- `enabled` (boolean): Connector enabled (default: true)

**Response (Success):**
```json
{
  "success": true,
  "message": "Connector created successfully",
  "insertId": 20
}
```
- Status: `201 Created`

**Error Responses:**
- `400 Bad Request`: 
  - Missing required field `charger_id`
  - Missing required field `type`
  - Missing required field `power`
  - Missing required field `status`
- `500 Internal Server Error`: Server error

---

### PUT /api/v4/connector

Update an existing connector.

**Query Parameters:**
- `id` (required): Connector ID

**Request Body:**
```json
{
  "type": "CCS",
  "status": "Charging",
  "power": 50,
  "power_unit": "kw",
  "time_limit": 180,
  "pin": "5678",
  "stop_on80": false,
  "enabled": true
}
```

**Required Fields:**
- `id` (query parameter): Connector ID

**Optional Fields (all fields are optional for update):**
- `type` or `connector_type` (string): Connector type
- `status` (string): Connector status
- `power` or `power_kw` (number): Power in kW
- `power_unit` (string): Power unit
- `time_limit` (number): Time limit in minutes
- `pin` (string): PIN code
- `ocpi_standard` (string): OCPI standard version
- `ocpi_format` (string): OCPI format
- `ocpi_power_type` (string): OCPI power type
- `ocpi_max_voltage` (number): Maximum voltage
- `ocpi_max_amperage` (number): Maximum amperage
- `ocpi_tariff_ids` (string): Comma-separated tariff IDs
- `stop_on80` (boolean): Stop charging at 80%
- `enabled` (boolean): Connector enabled

**Response (Success):**
```json
{
  "success": true,
  "message": "Connector updated successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: Missing connector ID (`?id={id}` required)
- `404 Not Found`: Connector not found
- `500 Internal Server Error`: Server error

---

### DELETE /api/v4/connector

Delete a connector.

**Query Parameters:**
- `id` (required): Connector ID

**Examples:**
```bash
DELETE /api/v4/connector?id=1
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Connector deleted successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: 
  - Missing connector ID (`?id={id}` required)
  - Cannot delete connector (has active charging sessions)
- `404 Not Found`: Connector not found
- `500 Internal Server Error`: Server error

**Note:** Connector cannot be deleted if it has active charging sessions (status: 'Charging' or 'Active').

---

## Tariffs API

Base endpoint: `/api/v4/tariff`

### GET /api/v4/tariff

Get all tariffs, a specific tariff, or filtered tariffs.

**Query Parameters:**
- `id` (optional): Tariff ID to get specific tariff
- `connectorId` or `connector_id` (optional): Filter by connector ID
- `status` (optional): Filter by status
- `type` (optional): Filter by type
- `peakType` or `peak_type` (optional): Filter by peak type

**Examples:**
```bash
# Get all tariffs
GET /api/v4/tariff

# Get specific tariff
GET /api/v4/tariff?id=1

# Get tariffs by connector
GET /api/v4/tariff?connectorId=5

# Get tariffs by status
GET /api/v4/tariff?status=Active

# Get tariffs by peak type
GET /api/v4/tariff?peakType=Peak

# Combined filters
GET /api/v4/tariff?status=Active&peakType=Peak
```

**Response (All Tariffs):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "type": "residential",
      "buy_rate": 0.15,
      "sell_rate": 0.12,
      "transaction_fees": 2.5,
      "client_percentage": 80,
      "partner_percentage": 20,
      "peak_type": "Peak",
      "status": "Active",
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "type": "commercial",
      "buy_rate": 0.18,
      "sell_rate": 0.15,
      "transaction_fees": 3.0,
      "client_percentage": 75,
      "partner_percentage": 25,
      "peak_type": "Off-Peak",
      "status": "Active",
      "created_at": "2024-01-16T11:00:00Z"
    }
  ]
}
```

**Response (Single Tariff):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "residential",
    "buy_rate": 0.15,
    "sell_rate": 0.12,
    "transaction_fees": 2.5,
    "client_percentage": 80,
    "partner_percentage": 20,
    "peak_type": "Peak",
    "status": "Active",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Response (No Content):**
- Status: `204 No Content`
- Body: `[]`

**Error Responses:**
- `404 Not Found`: Tariff not found (when using `id`)
- `500 Internal Server Error`: Server error

---

### POST /api/v4/tariff

Create a new tariff.

**Request Body:**
```json
{
  "type": "residential",
  "buy_rate": 0.15,
  "sell_rate": 0.12,
  "transaction_fees": 2.5,
  "client_percentage": 80,
  "partner_percentage": 20,
  "peak_type": "Peak",
  "status": "Active"
}
```

**Required Fields:**
- `type` (string): Tariff type (e.g., "residential", "commercial")
- `buy_rate` or `buyRate` (number): Buy rate in $/kWh
- `sell_rate` or `sellRate` (number): Sell rate in $/kWh

**Optional Fields:**
- `transaction_fees` or `transactionFees` (number): Transaction fees in $
- `client_percentage` or `clientPercentage` (number): Client percentage
- `partner_percentage` or `partnerPercentage` (number): Partner percentage
- `peak_type` or `peakType` (string): Peak type (e.g., "Peak", "Off-Peak", "Shoulder")
- `status` (string): Tariff status (default: "Active")

**Response (Success):**
```json
{
  "success": true,
  "message": "Tariff created successfully",
  "insertId": 25
}
```
- Status: `201 Created`

**Error Responses:**
- `400 Bad Request`: 
  - Missing required field `type`
  - Missing required field `buy_rate`
  - Missing required field `sell_rate`
- `500 Internal Server Error`: Server error

---

### PUT /api/v4/tariff

Update an existing tariff.

**Query Parameters:**
- `id` (required): Tariff ID

**Request Body:**
```json
{
  "type": "commercial",
  "buy_rate": 0.18,
  "sell_rate": 0.15,
  "transaction_fees": 3.0,
  "client_percentage": 75,
  "partner_percentage": 25,
  "peak_type": "Off-Peak",
  "status": "Inactive"
}
```

**Required Fields:**
- `id` (query parameter): Tariff ID

**Optional Fields (all fields are optional for update):**
- `type` (string): Tariff type
- `buy_rate` or `buyRate` (number): Buy rate in $/kWh
- `sell_rate` or `sellRate` (number): Sell rate in $/kWh
- `transaction_fees` or `transactionFees` (number): Transaction fees in $
- `client_percentage` or `clientPercentage` (number): Client percentage
- `partner_percentage` or `partnerPercentage` (number): Partner percentage
- `peak_type` or `peakType` (string): Peak type
- `status` (string): Tariff status

**Response (Success):**
```json
{
  "success": true,
  "message": "Tariff updated successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: Missing tariff ID (`?id={id}` required)
- `404 Not Found`: Tariff not found
- `500 Internal Server Error`: Server error

---

### DELETE /api/v4/tariff

Delete a tariff.

**Query Parameters:**
- `id` (required): Tariff ID

**Examples:**
```bash
DELETE /api/v4/tariff?id=1
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Tariff deleted successfully"
}
```
- Status: `200 OK`

**Error Responses:**
- `400 Bad Request`: Missing tariff ID (`?id={id}` required)
- `404 Not Found`: Tariff not found
- `500 Internal Server Error`: Server error

---

## Common Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "count": 1
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "details": "Detailed error information"
}
```

## HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Successful request with no content
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## CORS Headers

All endpoints include CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Notes

1. **Query Parameters Only**: All endpoints use query parameters only. No path parameters are used.
2. **Field Name Flexibility**: Most endpoints accept both camelCase and snake_case field names (e.g., `chargerId` or `charger_id`).
3. **Validation**: All endpoints include validation for required fields and data types.
4. **Error Handling**: All endpoints have comprehensive error handling with appropriate HTTP status codes.
5. **Database Constraints**: Some delete operations check for related records before deletion (e.g., cannot delete organization with locations, cannot delete location with chargers, etc.).

---

**Last Updated:** January 2026
