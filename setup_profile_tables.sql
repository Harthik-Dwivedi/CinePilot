-- Add profile picture column to Users table
ALTER TABLE Users ADD COLUMN profile_picture VARCHAR(255);
ALTER TABLE Users ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE Users ADD COLUMN reset_token_expires DATETIME;
ALTER TABLE Users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE Users ADD COLUMN email_verification_token VARCHAR(255);

-- Create UserPreferences table
CREATE TABLE IF NOT EXISTS UserPreferences (
    user_id INT PRIMARY KEY,
    preferred_genres JSON,
    notification_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Create Notifications table
CREATE TABLE IF NOT EXISTS Notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    type ENUM('BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'SYSTEM', 'PROMOTION'),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
); 