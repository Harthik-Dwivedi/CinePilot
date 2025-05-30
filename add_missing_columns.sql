-- Add missing columns to Movies table
ALTER TABLE Movies 
ADD COLUMN status ENUM('NOW_SHOWING', 'COMING_SOON', 'ENDED') DEFAULT 'NOW_SHOWING',
ADD COLUMN language VARCHAR(255),
ADD COLUMN subtitles VARCHAR(255);

-- Update existing movies to have default values
UPDATE Movies 
SET status = 'NOW_SHOWING',
    language = 'English',
    subtitles = 'English'
WHERE status IS NULL; 