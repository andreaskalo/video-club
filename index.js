import express from "express";
import axios from "axios";
import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;
const API_URL = "https://api.themoviedb.org/3";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    name: "videoClub.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);

const tmdb = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

function findTrailer(videos = []) {
  // Prefer an official YouTube trailer
  const officialTrailer = videos.find(
    (video) =>
      video.site === "YouTube" &&
      video.type === "Trailer" &&
      video.official === true,
  );

  if (officialTrailer) {
    return officialTrailer;
  }

  // Otherwise, use any YouTube trailer
  const trailer = videos.find(
    (video) => video.site === "YouTube" && video.type === "Trailer",
  );

  if (trailer) {
    return trailer;
  }

  // Final fallback: use a teaser
  return videos.find(
    (video) => video.site === "YouTube" && video.type === "Teaser",
  );
}

app.get("/", (req, res) => {
  if (!req.session.tmdbSessionId) {
    return res.render("login.ejs");
  }

  return res.redirect("/homepage");
});

app.get("/homepage", async (req, res) => {
  if (!req.session.tmdbSessionId) {
    return res.redirect("/");
  }

  let isMovie = false;

  const upcomingMoviesResult = await tmdb.get(
    "/movie/upcoming?language=en-US&page=1",
  );
  let upcomingMovies = upcomingMoviesResult.data.results;

  const topRatedMoviesResult = await tmdb.get(
    "/movie/top_rated?language=en-US&page=1",
  );
  let topRatedMovies = topRatedMoviesResult.data.results;

  const nowPlayingMoviesResult = await tmdb.get(
    "/movie/now_playing?language=en-US&page=1",
  );
  let nowPlayingMovies = nowPlayingMoviesResult.data.results;

  const topRatedTvShowsResult = await tmdb.get(
    "/tv/top_rated?language=en-US&page=1",
  );
  let topRatedTvShows = topRatedTvShowsResult.data.results;

  const onTheAirResult = await tmdb.get("/tv/on_the_air?language=en-US&page=1");
  let onTheAirTvShows = onTheAirResult.data.results;

  const popularTvShowsResult = await tmdb.get(
    "/tv/popular?language=en-US&page=1",
  );
  let popularTvShows = popularTvShowsResult.data.results;

  return res.render("homepage.ejs", {
    username: req.session.tmdbUsername,
    movies: [upcomingMovies, nowPlayingMovies, topRatedMovies],
    tvShows: [topRatedTvShows, onTheAirTvShows, popularTvShows],
  });
});

app.get("/movieDetails/:cardId", async (req, res) => {
  const { cardId } = req.params;

  try {
    const cardDetailsResult = await tmdb.get(`/movie/${cardId}`, {
      params: {
        append_to_response: "videos",
      },
    });

    const cardDetails = cardDetailsResult.data;

    const trailer = findTrailer(cardDetails.videos?.results || []);

    console.log("Movie details:", cardDetails);
    console.log("Selected trailer:", trailer);

    return res.render("cardDetails.ejs", {
      username: req.session.tmdbUsername,
      details: cardDetails,
      trailer,
      mediaType: "movie",
    });
  } catch (error) {
    console.error(
      "Movie details error:",
      error.response?.data || error.message,
    );

    return res.status(500).send("Could not load movie details");
  }
});
app.get("/tvShowDetails/:cardId", async (req, res) => {
  const { cardId } = req.params;

  try {
    const cardDetailsResult = await tmdb.get(`/tv/${cardId}`, {
      params: {
        append_to_response: "videos",
      },
    });

    const cardDetails = cardDetailsResult.data;

    const trailer = findTrailer(cardDetails.videos?.results || []);

    console.log("TV-show details:", cardDetails);
    console.log("Selected trailer:", trailer);

    return res.render("cardDetails.ejs", {
      username: req.session.tmdbUsername,
      details: cardDetails,
      trailer,
      mediaType: "tv",
    });
  } catch (error) {
    console.error(
      "TV-show details error:",
      error.response?.data || error.message,
    );

    return res.status(500).send("Could not load TV-show details");
  }
});

app.post("/login", async (req, res) => {
  const { username, password, rememberMe } = req.body;

  try {
    // STEP 1: Create a temporary request token
    const tokenResult = await tmdb.get("/authentication/token/new");

    const requestToken = tokenResult.data.request_token;

    // STEP 2: Validate the user's TMDB username and password
    await tmdb.post("/authentication/token/validate_with_login", {
      username: username,
      password: password,
      request_token: requestToken,
    });

    // STEP 3: Create a TMDB session
    const sessionResult = await tmdb.post("/authentication/session/new", {
      request_token: requestToken,
    });

    const sessionId = sessionResult.data.session_id;

    req.session.tmdbSessionId = sessionId;
    req.session.tmdbUsername = username;

    const shouldRememberUser = rememberMe === "on";

    if (shouldRememberUser) {
      // Keep the Express login for 30 days
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    // Make sure the session is saved before redirecting
    req.session.save((error) => {
      if (error) {
        console.error("Could not save session:", error);
        return res.status(500).send("Could not save login session");
      }

      res.redirect("/");
    });
  } catch (error) {
    console.log("STATUS:", error.response?.status);
    console.log("TMDB ERROR:", error.response?.data);
    console.log("MESSAGE:", error.message);

    res.status(500).send("Login failed");
  }
});

app.post("/logout", async (req, res) => {
  try {
    await tmdb.delete("/authentication/session", {
      data: {
        session_id: req.session.tmdbSessionId,
      },
    });

    req.session.destroy((error) => {
      if (error) {
        console.log("@Logout session error:", error);
        return res.status(500).send("Could not log out");
      }

      res.clearCookie("videoClub.sid");

      res.redirect("/");
    });
  } catch (error) {
    console.log("@Logout error:", error.response?.data || error.message);

    res.status(500).send("Logout failed");
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
