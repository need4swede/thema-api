# Thema Subject Codes API

A REST API for accessing Thema Subject Codes and their associated metadata.

## Overview

This API provides access to Thema Subject Codes and their associated metadata, sourced from a definitive JSON file. It follows RESTful principles and returns data in JSON format.

Try the API for yourself: <a href="https://thema.odinslibrary.net" target="_blank">Thema API - WebUI</a>

## API Documentation

### Base URL

```
/api/v1
```

### Authentication

This version of the API does not require authentication.

### Data Format

All requests and responses are in JSON format. API responses use camelCase for field names. Dates from the source JSON (originally in YYYYMMDD format) are returned in ISO 8601 format (YYYY-MM-DD).

### Endpoints

#### 1. Get API Metadata

Provides metadata about the Thema CodeList itself.

- **Endpoint**: `GET /api/v1/metadata`
- **Method**: GET
- **Description**: Retrieves high-level information about the Thema Subject Code list, such as its description, version, issue date, etc.
- **Response Example**:
  ```json
  {
    "codeListNumber": 214,
    "codeListDescription": "Thema Subject Codes",
    "issueNumber": 1.6,
    "versionNumber": "v1.6.0",
    "issueDate": "2024-10-31",
    "lastUpdated": "2025-04-10",
    "totalCodes": 9187
  }
  ```

#### 2. Get All Codes

Retrieves a paginated list of all Thema Subject Codes.

- **Endpoint**: `GET /api/v1/codes`
- **Method**: GET
- **Query Parameters**:
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Number of codes per page (default: 100)
- **Response Example**:
  ```json
  {
    "pagination": {
      "total": 9187,
      "page": 1,
      "limit": 100,
      "pages": 92
    },
    "data": [
      {
        "codeValue": "A",
        "codeDescription": "The Arts",
        "codeNotes": "Use all A* codes for: specialist and general adult titles...",
        "codeParent": "",
        "issueNumber": 1,
        "modified": 1.4
      },
      // More codes...
    ]
  }
  ```

#### 3. Get a Specific Code

Retrieves details for a specific Thema Subject Code.

- **Endpoint**: `GET /api/v1/codes/:codeValue`
- **Method**: GET
- **URL Parameters**:
  - `codeValue`: The value of the code to retrieve
- **Response Example**:
  ```json
  {
    "codeValue": "AB",
    "codeDescription": "The arts: general topics",
    "codeNotes": null,
    "codeParent": "A",
    "issueNumber": 1,
    "modified": 1.5
  }
  ```

#### 4. Search for Codes

Searches for Thema Subject Codes based on query parameters.

- **Endpoint**: `GET /api/v1/codes/search`
- **Method**: GET
- **Query Parameters**:
  - `query` (optional): Search term to match against code values and descriptions
  - `parent` (optional): Filter codes by parent code value
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Number of codes per page (default: 100)
- **Response Example**:
  ```json
  {
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 100,
      "pages": 1
    },
    "data": [
      {
        "codeValue": "ABC",
        "codeDescription": "Conservation, restoration and care of artworks",
        "codeNotes": "Use with: other A* codes for works about...",
        "codeParent": "AB",
        "issueNumber": 1,
        "modified": 1.5
      },
      // More codes...
    ]
  }
  ```

#### 5. Get Children of a Code

Retrieves all direct children of a specific Thema Subject Code.

- **Endpoint**: `GET /api/v1/codes/:codeValue/children`
- **Method**: GET
- **URL Parameters**:
  - `codeValue`: The value of the parent code
- **Response Example**:
  ```json
  {
    "parent": "A",
    "count": 26,
    "children": [
      {
        "codeValue": "AB",
        "codeDescription": "The arts: general topics",
        "codeNotes": null,
        "codeParent": "A",
        "issueNumber": 1,
        "modified": 1.5
      },
      // More codes...
    ]
  }
  ```

### Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request. Error responses will be in JSON format and include a message detailing the error.

**Common Error Response Structure**:
```json
{
  "error": {
    "status": 404,
    "message": "Code with value 'XYZ' not found",
    "code": "CODE_NOT_FOUND"
  }
}
```

**Common Status Codes**:
- 200 OK: The request was successful.
- 400 Bad Request: The request was malformed or contained invalid parameters.
- 404 Not Found: The requested resource could not be found.
- 500 Internal Server Error: An unexpected error occurred on the server.

## Running the API

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Docker and Docker Compose (for containerized deployment)

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd thema-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The API will be available at http://localhost:3000/api/v1

### Production Deployment with Docker

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd thema-api
   ```

2. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

   The API will be available at http://localhost:3000/api/v1

3. To stop the container:
   ```bash
   docker-compose down
   ```

## License

[ISC](LICENSE)
