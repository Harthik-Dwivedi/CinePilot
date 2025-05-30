# CinePilot DBMS Project

A comprehensive database management system for planning and managing movie shows, theaters, and bookings with a modern web interface.

## Features

- Complete movie management system
- Theater and showtime scheduling
- User registration and login
- Booking system with automatic seat management
- Responsive web interface

## Database Schema

The project consists of 5 main tables:

1. **Movies** - Stores movie information including title, genre, release date, etc.
2. **Theaters** - Contains theater details like name, location, and seating capacity
3. **Showtimes** - Manages movie show schedules in different theaters
4. **Users** - Stores user information for booking management
5. **Bookings** - Handles movie ticket bookings

## Trigger

The project includes an automatic trigger:
- `after_booking_insert`: Automatically updates available seats in the Showtimes table after a new booking is made

## Setup Instructions

### Database Setup

1. Make sure you have MySQL installed on your system
2. Create a new database:
```sql
CREATE DATABASE cinepilot;
USE cinepilot;
```
3. Run the SQL script:
```sql
source cinepilot.sql
```

### Web Application Setup

1. Install Node.js and npm if not already installed
2. Clone this repository
3. Install dependencies:
```bash
npm install
```
4. Create a `.env` file in the project root with the following content:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cinepilot
SESSION_SECRET=your_session_secret
```
5. Start the application:
```bash
npm start
```
6. Access the application at http://localhost:3000

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Database**: MySQL
- **Template Engine**: EJS
- **Authentication**: Express-session

## Sample Data

The database comes pre-populated with sample data including:
- 5 movies
- 5 theaters
- 5 users
- 5 showtimes
- 5 bookings

## Database Relationships

- Each Showtime is associated with one Movie and one Theater
- Each Booking is associated with one User and one Showtime
- The trigger ensures booking consistency by updating available seats

## Screenshots

(Add screenshots of your application here)

## License

This project is open source and available under the [MIT License](LICENSE). 