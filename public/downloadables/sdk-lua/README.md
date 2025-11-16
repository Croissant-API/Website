# Croissant API Client Library - Lua

A concise and functional Lua client for the Croissant gaming platform API. This library is designed for use in Lua environments, particularly game servers or embedded applications, and focuses on implementing the OAuth2 flow and essential API calls.

## 📦 Dependencies

This client relies on several standard and common Lua modules. Ensure your environment (like an OpenResty, LÖVE, or specialized game server environment) has them available.

| Dependency | Purpose |
| :--- | :--- |
| `ssl.https` | Secure HTTP requests (required for API communication) |
| `dkjson` | JSON encoding and decoding (for API payloads) |
| `ltn12` | Sink/Source filters for network I/O (often used with `ssl.https`) |
| `crypto` | Cryptographic functions (used for token hashing/security) |

```lua
-- Required Dependencies
local https = require("ssl.https")
local json = require("dkjson")
local ltn12 = require("ltn12")
local crypto = require("crypto")
```

-----

## 🚀 Getting Started

The client is designed to implement the **OAuth2 Authorization Code Flow** to securely obtain and manage an access token for authenticated API requests.

### 1\. Configuration

Set your OAuth2 application details directly in the script. These credentials should be obtained from the Croissant Developer Portal.

```lua
local CLIENT_ID = "your-client-id"
local CLIENT_SECRET = "your-client-secret"
local REDIRECT_URI = "your-redirect-uri"
local AUTH_URL = "https://croissant-api.fr/oauth2/authorize"
local TOKEN_URL = "https://croissant-api.fr/oauth2/token"
local TOKEN_FILE = "croissant_token.dat" -- Secure storage location for the token
```

### 2\. Authentication Workflow

#### A. Get Authorization URL

Start the OAuth2 process by directing the user to the authorization URL.

```lua
local function getAuthURL()
    -- ... implementation ...
end

print(getAuthURL())
-- User must visit this URL and authorize the app.
```

#### B. Exchange Code for Token

After the user authorizes the application, they will be redirected to your `REDIRECT_URI` with an `authorization code`. You must use this code to get the final `access_token`. The token is automatically saved to the secure `croissant_token.dat` file.

```lua
local function exchangeCodeForToken(code)
    -- ... implementation ...
end

-- Example: Read code from user input
local auth_code = io.read()
local token = exchangeCodeForToken(auth_code)
```

#### C. Load Saved Token (for subsequent runs)

For authenticated operations, the script will first attempt to load the token from the secure file.

```lua
local function loadToken()
    -- Loads and 'decrypts' (un-hashes) the token from TOKEN_FILE
end
```

-----

## 📝 API Reference

The client provides several utility functions for authenticated and public API access. **All authenticated functions require a valid `access_token`**.

### Core Utilities

| Function | Description |
| :--- | :--- |
| `handleError(response)` | Helper for logging client (4xx) and server (5xx) errors. |
| `postRequest(url, body)` | Generic helper for POST requests (form-urlencoded). |
| `getRequest(url, headers)` | Generic helper for GET requests. |
| `encryptToken(token)` | Hashes the token using SHA-256 before saving to file. |
| `saveToken(token)` | Saves the SHA-256 hash of the token to `croissant_token.dat`. |

### 👤 User and Inventory Operations

| Function | Description | Authentication |
| :--- | :--- | :--- |
| `getUserInfo(access_token)` | Retrieves the profile of the authenticated user. | **Required** |
| `getInventory(access_token)` | Retrieves the authenticated user's inventory. | **Required** |
| `addItemToInventory(access_token, item_data)` | Adds a new item to the user's inventory (typically for item creators/admins). | **Required** |
| `transferItem(access_token, item_id, target_user_id)` | Transfers a specific item to another user. | **Required** |

### 🤝 Trading and Multiplayer

| Function | Description | Authentication |
| :--- | :--- | :--- |
| `tradeItems(access_token, item_ids, target_user_id)` | Initiates a trade of specific items with a target user. | **Required** |
| `createLobby(access_token, lobby_data)` | Creates a new multiplayer game lobby. | **Required** |
| `joinLobby(access_token, lobby_id)` | Allows the user to join an existing lobby. | **Required** |
| `getActiveLobbies(access_token)` | Lists all currently active game lobbies. | **Required** |

-----

## 🛠️ Security Note on Token Handling

The provided client uses `crypto.digest("sha256", token)` to **hash** the token before writing it to `croissant_token.dat`. While this is an improvement over plain text, it's generally done to verify the token's integrity, *not* to store an access token that needs to be used for subsequent requests.

**Important:** For a real-world application, you must use a proper **encryption** mechanism with a symmetric key to store the access token securely if you need to load it back for use. The current `decryptToken` function is a placeholder and simply returns the stored hash, which cannot be used for API requests.

```lua
-- Decrypt the token (just a placeholder, as real decryption requires the right encryption key)
local function decryptToken(token)
    -- In real scenarios, use proper decryption here.
    -- Placeholder for decrypting (as we only store hashes)
    return token
end
```

For a functional client that reuses the token, this function would need to perform a true decryption, or the `saveToken` function should use proper symmetric encryption (e.g., AES) instead of a hash digest.
