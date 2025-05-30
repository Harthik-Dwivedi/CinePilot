require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = '3b055051';
const TMDB_API_URL = 'https://api.themoviedb.org/3';
const OMDB_API_URL = 'https://www.omdbapi.com/';

console.log('TMDB_API_KEY:', process.env.TMDB_API_KEY);

async function fetchMovies(endpoint, page = 1) {
  const url = `${TMDB_API_URL}/movie/${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
  const res = await axios.get(url);
  return res.data.results;
}

async function fetchMovieDetails(movieId) {
  const url = `${TMDB_API_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await axios.get(url);
  return res.data;
}

async function fetchMovieVideos(movieId) {
  const url = `${TMDB_API_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await axios.get(url);
  return res.data.results;
}

async function fetchExternalIds(movieId) {
  const url = `${TMDB_API_URL}/movie/${movieId}/external_ids?api_key=${TMDB_API_KEY}`;
  const res = await axios.get(url);
  return res.data;
}

async function fetchOmdbRatings(imdbId) {
  if (!imdbId) return { imdbRating: null, rtRating: null };
  const url = `${OMDB_API_URL}?i=${imdbId}&apikey=${OMDB_API_KEY}`;
  const res = await axios.get(url);
  const data = res.data;
  let rtRating = null;
  if (data.Ratings) {
    const rt = data.Ratings.find(r => r.Source === 'Rotten Tomatoes');
    rtRating = rt ? rt.Value : null;
  }
  return {
    imdbRating: data.imdbRating ? parseFloat(data.imdbRating) : null,
    rtRating
  };
}

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cinepilot',
  });

  const endpoints = ['popular', 'upcoming'];
  const pages = 5;
  const seenIds = new Set();

  for (const endpoint of endpoints) {
    for (let page = 1; page <= pages; page++) {
      console.log(`Fetching ${endpoint} movies, page ${page}...`);
      let movies = [];
      try {
        movies = await fetchMovies(endpoint, page);
      } catch (err) {
        console.error(`Failed to fetch ${endpoint} page ${page}:`, err.message);
        continue;
      }
      for (const movie of movies) {
        if (seenIds.has(movie.id)) continue;
        seenIds.add(movie.id);
        try {
          const details = await fetchMovieDetails(movie.id);
          const genres = details.genres.map(g => g.name).join(', ');
          const poster = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;
          const backdrop = details.backdrop_path ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}` : null;
          const spokenLanguages = details.spoken_languages ? details.spoken_languages.map(l => l.english_name).join(', ') : null;

          // Fetch trailer (YouTube)
          let trailerUrl = null;
          try {
            const videos = await fetchMovieVideos(movie.id);
            const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) {
              trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
            }
          } catch (e) { /* ignore */ }

          // Fetch external IDs (IMDb)
          let imdbId = null;
          try {
            const extIds = await fetchExternalIds(movie.id);
            imdbId = extIds.imdb_id;
          } catch (e) { /* ignore */ }

          // Fetch IMDb and Rotten Tomatoes ratings from OMDb
          let imdbRating = null;
          let rtRating = null;
          try {
            const ratings = await fetchOmdbRatings(imdbId);
            imdbRating = ratings.imdbRating;
            rtRating = ratings.rtRating;
          } catch (e) { /* ignore */ }

          const sql = `INSERT IGNORE INTO Movies (title, genre, release_date, image_url, overview, original_language, popularity, vote_average, vote_count, backdrop_url, spoken_languages, trailer_url, imdb_id, imdb_rating, rotten_tomatoes_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await db.execute(sql, [
            details.title,
            genres,
            details.release_date,
            poster,
            details.overview,
            details.original_language,
            details.popularity,
            details.vote_average,
            details.vote_count,
            backdrop,
            spokenLanguages,
            trailerUrl,
            imdbId,
            imdbRating,
            rtRating
          ]);
          console.log(`Inserted: ${details.title}`);
        } catch (err) {
          console.error(`Failed to insert movie ID ${movie.id}:`, err.message);
          continue;
        }
      }
    }
  }
  await db.end();
  console.log('Done importing movies!');
}

main().catch(console.error); 