# Bitespeed Identity Reconciliation API

## 🚀 Tech Stack
- Node.js
- Express.js
- MySQL (Railway Cloud)

## 📌 Endpoint
POST /identify

## 📥 Request
```json
{
  "email": "string",
  "phoneNumber": "string"
}
```


## 📤 Response
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": [],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}
```
