local https = require("ssl.https")
local json = require("dkjson")
local ltn12 = require("ltn12")
local crypto = require("crypto")

-- OAuth2 Configuration
local CLIENT_ID = "your-client-id"
local CLIENT_SECRET = "your-client-secret"
local REDIRECT_URI = "your-redirect-uri"
local AUTH_URL = "https://croissant-api.fr/oauth2/authorize"
local TOKEN_URL = "https://croissant-api.fr/oauth2/token"

-- Secure token storage location (encrypted)
local TOKEN_FILE = "croissant_token.dat"

-- Error Handling Helper Function
local function handleError(response)
    if response.status >= 400 and response.status < 500 then
        print("Client Error: " .. response.body)
    elseif response.status >= 500 then
        print("Server Error: " .. response.body)
    else
        print("Error: Unexpected response")
    end
end

-- Helper function to perform a POST request
local function postRequest(url, body)
    local response_body = {}
    local _, code, headers, status = https.request{
        url = url,
        method = "POST",
        headers = {
            ["Content-Type"] = "application/x-www-form-urlencoded",
            ["Content-Length"] = tostring(#body)
        },
        source = ltn12.source.string(body),
        sink = ltn12.sink.table(response_body)
    }
    if code ~= 200 then
        handleError({status = code, body = table.concat(response_body)})
        return nil
    end
    return json.decode(table.concat(response_body))
end

-- Helper function to perform a GET request
local function getRequest(url, headers)
    local response_body = {}
    local _, code, headers, status = https.request{
        url = url,
        method = "GET",
        headers = headers,
        sink = ltn12.sink.table(response_body)
    }
    if code ~= 200 then
        handleError({status = code, body = table.concat(response_body)})
        return nil
    end
    return json.decode(table.concat(response_body))
end

-- Encrypt the token using SHA-256
local function encryptToken(token)
    return crypto.digest("sha256", token)
end

-- Decrypt the token (just a placeholder, as real decryption requires the right encryption key)
local function decryptToken(token)
    -- In real scenarios, use proper decryption here.
    -- Placeholder for decrypting (as we only store hashes)
    return token
end

-- Save OAuth2 token securely (hashed)
local function saveToken(token)
    local encrypted_token = encryptToken(token)
    local file = io.open(TOKEN_FILE, "w")
    file:write(encrypted_token)
    file:close()
end

-- Load OAuth2 token (hashed) from file
local function loadToken()
    local file = io.open(TOKEN_FILE, "r")
    if not file then return nil end
    local encrypted_token = file:read("*all")
    file:close()
    return decryptToken(encrypted_token)
end

-- Get authorization URL (step 1 of OAuth2 flow)
local function getAuthURL()
    local url = string.format("%s?client_id=%s&redirect_uri=%s&response_type=code&scope=read",
                              AUTH_URL, CLIENT_ID, REDIRECT_URI)
    return url
end

-- Exchange authorization code for access token (step 2 of OAuth2 flow)
local function exchangeCodeForToken(code)
    local body = string.format("client_id=%s&client_secret=%s&code=%s&redirect_uri=%s&grant_type=authorization_code",
                               CLIENT_ID, CLIENT_SECRET, code, REDIRECT_URI)
    local response = postRequest(TOKEN_URL, body)
    if response and response.access_token then
        saveToken(response.access_token)
        return response.access_token
    end
    return nil
end

-- Refresh the access token if expired
local function refreshToken(refresh_token)
    local body = string.format("client_id=%s&client_secret=%s&refresh_token=%s&grant_type=refresh_token",
                               CLIENT_ID, CLIENT_SECRET, refresh_token)
    local response = postRequest(TOKEN_URL, body)
    if response and response.access_token then
        saveToken(response.access_token)
        return response.access_token
    end
    return nil
end

-- Get user information from Croissant API
local function getUserInfo(access_token)
    local url = "https://croissant-api.fr/v1/me"
    local headers = {
        ["Authorization"] = "Bearer " .. access_token
    }
    return getRequest(url, headers)
end

-- Get user inventory
local function getInventory(access_token)
    local url = "https://croissant-api.fr/v1/inventory"
    local headers = {
        ["Authorization"] = "Bearer " .. access_token
    }
    return getRequest(url, headers)
end

-- Add an item to inventory (if you are a creator)
local function addItemToInventory(access_token, item_data)
    local url = "https://croissant-api.fr/v1/inventory/items"
    local body = json.encode(item_data)
    local headers = {
        ["Authorization"] = "Bearer " .. access_token,
        ["Content-Type"] = "application/json",
        ["Content-Length"] = tostring(#body)
    }
    return postRequest(url, body, headers)
end

-- Transfer item to another user
local function transferItem(access_token, item_id, target_user_id)
    local url = string.format("https://croissant-api.fr/v1/inventory/items/%s/transfer", item_id)
    local body = json.encode({target_user_id = target_user_id})
    local headers = {
        ["Authorization"] = "Bearer " .. access_token,
        ["Content-Type"] = "application/json",
        ["Content-Length"] = tostring(#body)
    }
    return postRequest(url, body, headers)
end

-- Trade items with another user
local function tradeItems(access_token, item_ids, target_user_id)
    local url = "https://croissant-api.fr/v1/trades"
    local body = json.encode({
        item_ids = item_ids,
        target_user_id = target_user_id
    })
    local headers = {
        ["Authorization"] = "Bearer " .. access_token,
        ["Content-Type"] = "application/json",
        ["Content-Length"] = tostring(#body)
    }
    return postRequest(url, body, headers)
end

-- Create a lobby (multiplayer session)
local function createLobby(access_token, lobby_data)
    local url = "https://croissant-api.fr/v1/lobbies"
    local body = json.encode(lobby_data)
    local headers = {
        ["Authorization"] = "Bearer " .. access_token,
        ["Content-Type"] = "application/json",
        ["Content-Length"] = tostring(#body)
    }
    return postRequest(url, body, headers)
end

-- Join a lobby (multiplayer session)
local function joinLobby(access_token, lobby_id)
    local url = string.format("https://croissant-api.fr/v1/lobbies/%s/join", lobby_id)
    local headers = {
        ["Authorization"] = "Bearer " .. access_token
    }
    return postRequest(url, "", headers)
end

-- Get active lobbies
local function getActiveLobbies(access_token)
    local url = "https://croissant-api.fr/v1/lobbies/active"
    local headers = {
        ["Authorization"] = "Bearer " .. access_token
    }
    return getRequest(url, headers)
end

-- Example usage: authenticate and fetch user data
local function authenticateAndFetchUserData()
    -- Load the token if available
    local token = loadToken()

    if not token then
        print("No valid token found. Please authenticate.")
        return
    end

    -- Make a request with the token
    local user_info = getUserInfo(token)
    if user_info then
        print("User Info: " .. json.encode(user_info))
    else
        print("Failed to retrieve user info.")
    end
end

-- Main function: Start the OAuth2 flow
local function startOAuth2Flow()
    print("Please visit the following URL to authorize the application:")
    print(getAuthURL())
    print("After authorizing, paste the authorization code here:")


    local auth_code = io.read()

    local token = exchangeCodeForToken(auth_code)
    if token then
        print("Authentication successful. Access token saved.")
    else
        print("Authentication failed.")
    end
end

-- Uncomment the appropriate block to start OAuth2 or fetch user data
-- startOAuth2Flow()  -- Use this to initiate OAuth2 flow
authenticateAndFetchUserData()  -- Use this to fetch user data if already authenticated
