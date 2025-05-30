-- Create a temporary table to store the IDs of movies to keep, along with their titles
CREATE TEMPORARY TABLE movies_to_keep AS
SELECT MAX(movie_id) as movie_id, title
FROM Movies
GROUP BY title;

-- Update Watchlist to point to the kept movie IDs
UPDATE Watchlist w
JOIN Movies m ON w.movie_id = m.movie_id
JOIN movies_to_keep mtk ON m.title = mtk.title AND m.movie_id != mtk.movie_id
SET w.movie_id = mtk.movie_id;

-- Update Showtimes to point to the kept movie IDs
UPDATE Showtimes s
JOIN Movies m ON s.movie_id = m.movie_id
JOIN movies_to_keep mtk ON m.title = mtk.title AND m.movie_id != mtk.movie_id
SET s.movie_id = mtk.movie_id;

-- Delete movies that are not in the movies_to_keep table
DELETE FROM Movies 
WHERE movie_id NOT IN (SELECT movie_id FROM movies_to_keep);

-- Drop the temporary table
DROP TEMPORARY TABLE IF EXISTS movies_to_keep; 