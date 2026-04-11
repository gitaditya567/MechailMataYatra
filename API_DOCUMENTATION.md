# Shri Machail Mata Yatra - External API Documentation (v1.0)

Welcome to the official API documentation for the Shri Machail Mata Yatra Registration Portal. This API allows authorized external partners to search for pilgrim bookings and retrieve detailed registration information.

---

## 🔐 Authentication

All API requests must be authenticated using an **API Key** passed in the HTTP header. 

| Header Name | Required | Description |
|:---|:---|:---|
| `x-api-key` | **Yes** | Your unique security key provided by the administration. |

> [!WARNING]
> **Keep your API Key secure.** Never share it in public repositories or front-end client-side code that is accessible to unauthorized users.

---

## 🌐 API Base URLs

| Environment | Base URL |
|:---|:---|
| **Production** | `https://shrimachailmatayatra.com/api/v1/external` |
| **Sandbox (Local)** | `http://localhost:5001/api/v1/external` |

---

## 🚀 Endpoints

---

### 1. Get Overall Statistics
Retrieve the total number of registration groups (bookings) and total pilgrims registered.

- **Method:** `GET`
- **Path:** `/stats`

#### Example Request
```bash
curl -X GET "https://shrimachailmatayatra.com/api/v1/external/stats" \
     -H "x-api-key: YOUR_API_KEY"
```

#### Success Response (200 OK)
```json
{
    "success": true,
    "data": {
        "totalBookings": 1540,
        "totalMembers": 4250
    }
}
```

---

### 2. Search Bookings by Mobile
Retrieve a list of all bookings associated with a specific mobile number.

- **Method:** `GET`
- **Path:** `/search`
- **Query Parameters:**
    - `mobile` (Required): The 10-digit mobile number of the primary pilgrim.

#### Example Request
```bash
curl -X GET "https://shrimachailmatayatra.com/api/v1/external/search?mobile=9906123456" \
     -H "x-api-key: YOUR_API_KEY"
```

#### Success Response (200 OK)
```json
{
    "success": true,
    "user": {
        "name": "Aditya Sharma",
        "mobile": "9906123456",
        "email": "aditya@example.com"
    },
    "bookings": [
        {
            "referenceId": "MATA/2026/0045",
            "darshanDate": "2026-05-15",
            "totalMembers": 3,
            "createdAt": "2026-04-10T14:30:00Z"
        }
    ]
}
```

---

### 3. Get Booking Details
Fetch full details of a specific booking using its unique Reference ID.

- **Method:** `GET`
- **Path:** `/booking/{referenceId}`
- **URL Parameters:**
    - `referenceId` (Required): The unique booking reference (e.g., `MATA/2026/0045`).

#### Example Request
```bash
curl -X GET "https://shrimachailmatayatra.com/api/v1/external/booking/MATA/2026/0045" \
     -H "x-api-key: YOUR_API_KEY"
```

#### Success Response (200 OK)
```json
{
    "success": true,
    "data": {
        "referenceId": "MATA/2026/0045",
        "darshanDate": "2026-05-15",
        "totalMembers": 2,
        "members": [
            {
                "name": "Aditya Sharma",
                "age": 28,
                "gender": "Male",
                "regNo": "MATA/2026/0045"
            },
            {
                "name": "Priya Sharma",
                "age": 25,
                "gender": "Female",
                "regNo": "MATA/2026/0046"
            }
        ],
        "primaryUser": {
            "name": "Aditya Sharma",
            "mobile": "9906123456"
        }
    }
}
```

---

## ❌ Error Codes

| Status Code | Message | Description |
|:---|:---|:---|
| `401` | Unauthorized | API Key is missing or invalid. |
| `403` | Forbidden | Insufficient permissions for this endpoint. |
| `404` | Not Found | The requested booking or data could not be found. |
| `500` | Internal Error | An unexpected error occurred on the server. |

---

## 🛠 Support
For technical issues or API key requests, please contact the IT Administration at support@shrimachailmatayatra.com.
