# GasHub - Smart LPG Supply & Distribution Management System

## Overview

GasHub is a Smart LPG Supply & Distribution Management System developed as a final-year Higher National Diploma (HND) project. The system is designed to streamline the entire LPG cylinder ordering and distribution process for business clients by integrating warehouse management, inventory tracking, intelligent order allocation, delivery management, and AI-based demand forecasting.

The system improves operational efficiency by automatically assigning customer orders to the nearest suitable warehouse, monitoring inventory in real time, supporting partial deliveries, and providing separate dashboards for each user role.

---

## Features

### Customer Module
- Customer registration and login
- Admin approval for new registrations
- Business profile management
- LPG cylinder ordering
- Multiple cylinder type support
- Empty cylinder return management
- Receipt upload for payment verification
- Order tracking
- Delivery OTP verification
- Order history

### Admin Module
- Dashboard with analytics
- Employee management
- Warehouse management
- Cylinder type management
- Client approval
- Manager assignment
- Driver monitoring
- AI demand prediction dashboard
- AI warehouse stock prediction
- Reports and statistics

### Warehouse Manager Module
- Warehouse inventory management
- Stock updates
- Stock history
- Order approval
- Driver assignment
- Partial delivery management
- Warehouse performance monitoring

### Driver Module
- Assigned deliveries
- Accept delivery requests
- View customer details
- Load cylinder quantities
- Delivery status updates
- OTP verification
- GPS location sharing
- Return remaining stock to warehouse
- Delivery history

---

## AI Features

The system includes a Python Flask microservice that provides machine learning functionality.

### Demand Prediction
Predicts future LPG demand using historical order data.

### Warehouse Stock Prediction
Predicts future stock requirements for each warehouse individually.

Machine Learning Algorithm:
- Linear Regression (Scikit-Learn)

---

## Technology Stack

### Frontend
- React
- Vite

### Backend
- Laravel 13
- PHP 8+
- Laravel Sanctum Authentication
- REST API

### Database
- MySQL

### AI Service
- Python
- Flask
---

## System Architecture

```
React Frontend
        │
        ▼
Laravel REST API
        │
        ├──────────► MySQL Database
        │
        ▼
Flask AI Service
```

---

## User Roles

### Admin
- Manage employees
- Manage warehouses
- Manage managers
- View reports
- View AI predictions
- Monitor deliveries
- Approve clients

### Warehouse Manager
- Manage warehouse stock
- Assign drivers
- Process orders
- Monitor warehouse operations

### Driver
- Accept assigned deliveries
- Deliver LPG cylinders
- Verify OTP
- Update delivery status
- Return remaining stock

### Client
- Register account
- Place orders
- Upload payment receipts
- Track deliveries
- View order history

---

## Project Structure

```
GasHub/
│
├── backend/          # Laravel Backend
│
├── frontend/         # React Frontend
│
├── gashub-ai/        # Flask AI Service
│
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/GasHub.git
cd GasHub
```

---

## Backend Setup

```bash
cd backend

composer install

cp .env.example .env

php artisan key:generate

php artisan migrate

php artisan storage:link

php artisan serve
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

## AI Service Setup

```bash
cd gashub-ai

pip install -r requirements.txt

python app.py
```

---

## Default Ports

| Service | Port |
|----------|------|
| React | 5173 |
| Laravel | 8000 |
| Flask AI | 5001 |
| MySQL | 3306 |

---

## Main Functionalities

- Business client registration
- Role-based authentication
- Warehouse management
- Inventory management
- Smart warehouse allocation
- Partial delivery handling
- Driver assignment
- OTP-based delivery verification
- Stock reconciliation
- AI demand prediction
- AI warehouse stock prediction
- Dashboard analytics
- Notification system

---

## Business Rules

- Only approved clients can place orders.
- Orders are automatically assigned to the nearest warehouse with sufficient stock.
- If stock is unavailable in one warehouse, orders can be split across multiple warehouses.
- When multiple nearby warehouses are available, the less busy warehouse is prioritized.
- Partial deliveries are supported when stock is insufficient.
- Managers can assign additional deliveries as stock becomes available.
- Drivers must verify delivery using OTP before completing an order.
- Remaining loaded stock is automatically returned to the warehouse inventory.

---

## Validation

- Sri Lankan NIC validation
- Sri Lankan phone number validation
- Email validation
- Minimum order quantity validation
- Stock availability validation
- Receipt upload validation

---

## Security

- Laravel Sanctum Authentication
- Role-based authorization
- Protected REST APIs
- Password hashing
- Input validation
- File upload validation
- Secure session management

---

## Future Enhancements

- Online payment gateway integration
- Mobile application
- Push notifications
- QR code cylinder tracking
- AI route optimization
- IoT-enabled smart cylinder monitoring
- Advanced business analytics

---

## Author

**Developer:** Yaswini  
---

## License

This project was developed for educational purposes as a final-year HNDIT project.
