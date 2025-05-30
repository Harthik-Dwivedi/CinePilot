-- Create Chat Messages table
CREATE TABLE IF NOT EXISTS chatmessages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'emoji', 'movie_share') DEFAULT 'text',
    movie_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id)
);

-- Create Message Reactions table
CREATE TABLE IF NOT EXISTS messagereactions (
    reaction_id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chatmessages(message_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
); 