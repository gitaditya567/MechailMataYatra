# Shri Machail Mata Yatra - External API Documentation (v1.0)

Welcome to the official developer documentation for the Shri Machail Mata Yatra Registration Portal. This API allows authorized partner systems to retrieve pilgrim registration data and portal statistics.

---

## 🔐 Authentication

All API requests require an **API Key** to be sent in the HTTP header. Requests without a valid key will return a `401 Unauthorized` error.

| Header Name | Required | Description |
|:---|:---|:---|
| `x-api-key` | **Yes** | Your unique access key (Generate in Admin Panel > API Keys) |

> [!IMPORTANT]
> **API Key Security**: Treat your API key like a password. Do not embed it in client-side JavaScript or expose it in public repositories.

---

## 🌐 API Base URL

| Environment | Base URL |
|:---|:---|
| **Production** | `https://shrimachailmatayatra.com/api/v1/external` |

---

## 🚀 Endpoints

### 1. Overall Statistics
Retrieve the current tally of registered groups and pilgrims.

- **Method**: `GET`
- **Path**: `/stats`

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
        "totalBookings": 5,
        "totalMembers": 12
    }
}
```

---

### 2. Search by Mobile Number
Find all registration records associated with a specific mobile number.

- **Method**: `GET`
- **Path**: `/search`
- **Params**: `mobile` (10-digit number)

#### Example Request
```bash
curl -X GET "https://shrimachailmatayatra.com/api/v1/external/search?mobile=9999999999" \
     -H "x-api-key: YOUR_API_KEY"
```

#### Success Response (200 OK)
```json
{
    "success": true,
    "bookings": [
        {
            "referenceId": "MATA/2026/100001",
            "darshanDate": "2026-04-11",
            "totalMembers": 1,
            "createdAt": "2026-04-11T09:10:14Z"
        }
    ]
}
```

---

### 3. Get Full Booking Details
Retrieve complete member details for a specific registration reference ID.

- **Method**: `GET`
- **Path**: `/booking/{referenceId}`

#### Example Request
```bash
curl -X GET "https://shrimachailmatayatra.com/api/v1/external/booking/MATA/2026/100001" \
     -H "x-api-key: YOUR_API_KEY"
```

#### Success Response (200 OK)
```json
{
    "success": true,
    "data": {
        "referenceId": "MATA/2026/100001",
        "darshanDate": "2026-04-11",
        "members": [
            {
                "name": "Test User",
                "age": 30,
                "gender": "Male",
                "regNo": "MATA/2026/100001"
            }
        ]
    }
}
```

---

## 🛠 Testing Tool

To quickly verify your key and see the data structure, you can use the **API Tester Tool** included in this package (`api_tester.html`). 
Simply open the file in any modern browser, enter your key, and click **Test Connection**.

---

## ❌ Common Error Codes

| Code | Status | Meaning |
|:---|:---|:---|
| `401` | Unauthorized | Missing or invalid `x-api-key`. |
| `403` | Forbidden | Key is inactive or lacks 'read' permissions. |
| `404` | Not Found | No booking found for the provided Reference ID / Mobile. |
| `500` | Server Error | An internal error occurred. Contact infrastructure support. |

---

© 2026 Shri Machail Mata Yatra IT Support.
