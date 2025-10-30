# Profile API

This API endpoint handles user profile management, including personal information, contacts, and addresses.

## Endpoints

### GET `/api/profile`

Retrieves the complete user profile including all related data.

**Authentication**: Required (Bearer token or session cookie)

**Response**:
```json
{
  "profile": {
    "id": "uuid",
    "authUserId": "auth-user-id",
    "email": "user@example.com",
    "emailVerified": true,
    "status": "Active",
    "profiles": {
      "firstName": "John",
      "lastName": "Doe",
      "middleName": "Smith",
      "dateOfBirth": "1990-01-01"
    },
    "contacts": [
      {
        "id": "uuid",
        "contactType": "phone",
        "contactValue": "+1234567890",
        "isPrimary": true,
        "isVerified": true
      }
    ],
    "addresses": [
      {
        "id": "uuid",
        "addressType": "primary",
        "streetAddress": "123 Main St",
        "addressLine2": "Apt 4B",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "countryCode": "US",
        "isPrimary": true
      }
    ],
    "memberships": {
      "joinDate": "2024-01-01",
      "tenure": "0",
      "verificationStatus": "PENDING"
    }
  }
}
```

### POST `/api/profile`
### PUT `/api/profile`

Updates the user profile. Both POST and PUT methods are supported for compatibility.

**Authentication**: Required (Bearer token or session cookie)

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "middleName": "Smith",
  "dateOfBirth": "1990-01-01",
  "contacts": [
    {
      "id": "existing-contact-uuid",  // Include ID to update existing contact
      "contactType": "phone",
      "contactValue": "+1234567890",
      "isPrimary": true,
      "isVerified": false
    },
    {
      // Omit ID to create new contact
      "contactType": "email",
      "contactValue": "alternative@example.com",
      "isPrimary": false,
      "isVerified": false
    }
  ],
  "addresses": [
    {
      "id": "existing-address-uuid",  // Include ID to update existing address
      "addressType": "primary",
      "streetAddress": "123 Main St",
      "addressLine2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "countryCode": "US",
      "isPrimary": true
    },
    {
      // Omit ID to create new address
      "addressType": "billing",
      "streetAddress": "456 Oak Ave",
      "city": "Boston",
      "state": "MA",
      "postalCode": "02101",
      "countryCode": "US",
      "isPrimary": false
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

## Field Details

### Profile Fields (userProfiles)
- `firstName` (string, optional): User's first name
- `lastName` (string, optional): User's last name
- `middleName` (string, optional): User's middle name
- `dateOfBirth` (string, optional): User's date of birth (YYYY-MM-DD format)

### Contact Fields (userContacts)
- `id` (string, optional): Contact ID (required for updates, omit for new contacts)
- `contactType` (string, required): Type of contact ('phone', 'email', 'emergency')
- `contactValue` (string, required): The actual contact value
- `isPrimary` (boolean, optional): Whether this is the primary contact (default: false)
- `isVerified` (boolean, optional): Whether this contact has been verified (default: false)

### Address Fields (userAddresses)
- `id` (string, optional): Address ID (required for updates, omit for new addresses)
- `addressType` (string, optional): Type of address ('primary', 'billing', 'shipping', etc.) (default: 'primary')
- `streetAddress` (string, optional): Street address line 1
- `addressLine2` (string, optional): Street address line 2
- `city` (string, optional): City name
- `state` (string, optional): State/Province
- `postalCode` (string, optional): ZIP/Postal code
- `countryCode` (string, optional): 2-letter country code (default: 'US')
- `isPrimary` (boolean, optional): Whether this is the primary address (default: false)

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "User record not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Update Behavior

- **Profile**: Updates existing profile or creates a new one if it doesn't exist
- **Contacts**:
  - Include `id` field to update an existing contact
  - Omit `id` field to create a new contact
- **Addresses**:
  - Include `id` field to update an existing address
  - Omit `id` field to create a new address

## Notes

- Only provided fields will be updated; omitted fields retain their existing values
- The endpoint automatically links profile data to the authenticated user
- All timestamps are automatically managed (createdAt, updatedAt)
- The user must be authenticated via Better Auth session
