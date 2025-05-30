-- Movie Planner Database Schema

CREATE TABLE IF NOT EXISTS Movies (
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    release_date DATE,
    duration_minutes INT,
    rating VARCHAR(10),
    description TEXT,
    image_url VARCHAR(255),
    trailer_url VARCHAR(255),
    language VARCHAR(50),
    subtitles VARCHAR(255),
    tmdb_id VARCHAR(50),
    imdb_rating DECIMAL(3,1),
    rotten_tomatoes_rating INT,
    status ENUM('COMING_SOON', 'NOW_SHOWING', 'ENDED') DEFAULT 'NOW_SHOWING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to Movies table (if not already present)
ALTER TABLE Movies ADD COLUMN IF NOT EXISTS language VARCHAR(50);
ALTER TABLE Movies ADD COLUMN IF NOT EXISTS subtitles VARCHAR(255);
ALTER TABLE Movies ADD COLUMN IF NOT EXISTS trailer_url VARCHAR(255);
ALTER TABLE Movies ADD COLUMN IF NOT EXISTS tmdb_id VARCHAR(50);
ALTER TABLE Movies ADD COLUMN IF NOT EXISTS imdb_rating DECIMAL(3,1);
ALTER TABLE Movies ADD COLUMN IF NOT EXISTS rotten_tomatoes_rating INT;
ALTER TABLE Movies ADD COLUMN IF NOT EXISTS status ENUM('NOW_SHOWING', 'COMING_SOON', 'ENDED') DEFAULT 'NOW_SHOWING';

CREATE TABLE IF NOT EXISTS MovieGenres (
    movie_id INT,
    genre VARCHAR(50),
    PRIMARY KEY (movie_id, genre),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MovieTags (
    movie_id INT,
    tag VARCHAR(50),
    PRIMARY KEY (movie_id, tag),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Cast (
    cast_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT,
    name VARCHAR(100),
    role VARCHAR(100),
    character_name VARCHAR(100),
    image_url VARCHAR(255),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT,
    user_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Theaters (
    theater_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    total_seats INT,
    contact_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Showtimes (
    showtime_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT,
    theater_id INT,
    show_date DATE,
    show_time TIME,
    price DECIMAL(10,2),
    available_seats INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (theater_id) REFERENCES Theaters(theater_id)
);

CREATE TABLE IF NOT EXISTS Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone_number VARCHAR(20),
    profile_picture VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    showtime_id INT,
    number_of_seats INT,
    total_amount DECIMAL(10,2),
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (showtime_id) REFERENCES Showtimes(showtime_id)
);

CREATE TABLE IF NOT EXISTS Watchlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    movie_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id)
);

-- Social Features
CREATE TABLE IF NOT EXISTS Forums (
    forum_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS ForumPosts (
    post_id INT PRIMARY KEY AUTO_INCREMENT,
    forum_id INT,
    user_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (forum_id) REFERENCES Forums(forum_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS Friends (
    friendship_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    friend_id INT,
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (friend_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS WatchParties (
    party_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT,
    host_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_time DATETIME NOT NULL,
    max_participants INT DEFAULT 10,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (host_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS WatchPartyParticipants (
    participant_id INT PRIMARY KEY AUTO_INCREMENT,
    party_id INT,
    user_id INT,
    status ENUM('invited', 'accepted', 'declined') DEFAULT 'invited',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES WatchParties(party_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE IF NOT EXISTS SocialShares (
    share_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    movie_id INT,
    platform VARCHAR(50) NOT NULL,
    share_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id)
);

-- Chat Features
CREATE TABLE IF NOT EXISTS ChatMessages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'emoji', 'movie_share') DEFAULT 'text',
    movie_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id)
);

CREATE TABLE IF NOT EXISTS MessageReactions (
    reaction_id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES ChatMessages(message_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Enhanced User Features
CREATE TABLE IF NOT EXISTS UserPreferences (
    user_id INT PRIMARY KEY,
    preferred_genres JSON,
    notification_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS SocialConnections (
    connection_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    connected_user_id INT,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (connected_user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SharedBookings (
    share_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT,
    shared_by_user_id INT,
    shared_with_user_id INT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MovieRecommendations (
    recommendation_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT,
    recommended_by_user_id INT,
    recommended_to_user_id INT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (recommended_by_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (recommended_to_user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Triggers
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_booking_insert
AFTER INSERT ON Bookings
FOR EACH ROW
BEGIN
    UPDATE Showtimes
    SET available_seats = available_seats - NEW.number_of_seats
    WHERE showtime_id = NEW.showtime_id;
END//
DELIMITER ;

-- Remove Duplicates Logic
CREATE TEMPORARY TABLE movies_to_keep AS
SELECT MAX(movie_id) as movie_id, title
FROM Movies
GROUP BY title;

UPDATE Watchlist w
JOIN Movies m ON w.movie_id = m.movie_id
JOIN movies_to_keep mtk ON m.title = mtk.title AND m.movie_id != mtk.movie_id
SET w.movie_id = mtk.movie_id;

UPDATE Showtimes s
JOIN Movies m ON s.movie_id = m.movie_id
JOIN movies_to_keep mtk ON m.title = mtk.title AND m.movie_id != mtk.movie_id
SET s.movie_id = mtk.movie_id;

DELETE FROM Movies 
WHERE movie_id NOT IN (SELECT movie_id FROM movies_to_keep);

DROP TEMPORARY TABLE IF EXISTS movies_to_keep;

-- Sample data (add your own image URLs for best results)
INSERT INTO Movies (title, genre, release_date, duration_minutes, rating, description, image_url) VALUES
('Inception', 'Sci-Fi/Action', '2010-07-16', 148, 'PG-13', 'A thief who enters the dreams of others to steal secrets from their subconscious.', 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_FMjpg_UX1000_.jpg'),
('The Shawshank Redemption', 'Drama', '1994-09-23', 142, 'R', 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.', 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg'),
('The Dark Knight', 'Action/Drama', '2008-07-18', 152, 'PG-13', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_FMjpg_UX1000_.jpg'),
('Pulp Fiction', 'Crime/Drama', '1994-10-14', 154, 'R', 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.', 'https://m.media-amazon.com/images/M/MV5BYTViYTE3ZGQtNDBlMC00ZTAyLTkyODMtZGRiZDg0MjA2YThkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg'),
('Avatar', 'Sci-Fi/Action', '2009-12-18', 162, 'PG-13', 'A paraplegic Marine dispatched to the moon Pandora on a unique mission becomes torn between following his orders and protecting the world he feels is his home.', 'https://m.media-amazon.com/images/M/MV5BNmQxNjZlZTctMWJiMC00NGMxLWJjNTctNTFiNjA1Njk3ZDQ5XkEyXkFqcGc@._V1_.jpg');

-- Movie updates
-- (Paste all update_movies.sql and update_remaining_movies.sql content here)

-- Update Inception
UPDATE Movies 
SET status = 'NOW_SHOWING',
    language = 'English, Hindi',
    subtitles = 'English',
    trailer_url = 'https://www.youtube.com/watch?v=YoHD9XEInc0',
    imdb_rating = 8.8,
    rotten_tomatoes_rating = 87,
    description = 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.'
WHERE title = 'Inception';

-- (Continue with all other update statements from update_movies.sql and update_remaining_movies.sql)