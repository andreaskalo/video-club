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

app.get("/", (req, res) => {
  if (!req.session.tmdbSessionId) {
    return res.render("login.ejs");
  }

  return res.redirect("/homepage");
});

app.get("/homepage", (req, res) => {
  if (!req.session.tmdbSessionId) {
    return res.redirect("/");
  }

  return res.render("homepage.ejs");
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

app.get("/home", (req, res) => {
  if (!req.session.tmdbSessionId) {
    return res.redirect("/login");
  }

  res.send("Welcome to Video Club!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
