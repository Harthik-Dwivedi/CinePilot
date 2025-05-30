-- Create Forums table
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

-- Create Forum Posts table
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

-- Create Reviews table
CREATE TABLE IF NOT EXISTS Reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT,
    user_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Create Friends table
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

-- Create Watch Parties table
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

-- Create Watch Party Participants table
CREATE TABLE IF NOT EXISTS WatchPartyParticipants (
    participant_id INT PRIMARY KEY AUTO_INCREMENT,
    party_id INT,
    user_id INT,
    status ENUM('invited', 'accepted', 'declined') DEFAULT 'invited',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES WatchParties(party_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Create Social Shares table
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

-- Create Chat Messages table
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

-- Create Message Reactions table
CREATE TABLE IF NOT EXISTS MessageReactions (
    reaction_id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES ChatMessages(message_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
); 