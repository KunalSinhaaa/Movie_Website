const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();
const pg = require("pg");
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const saltRounds = 10; 

const port = 3000;

var Login = false;
var Email = "";

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");


app.get("/about", (req, res) => {
    res.render("about");
})

app.get("/", (req, res) => {
    res.render("search");
});

app.post("/", async (req, res) => {
    const movieTitle = req.body.title;
    // const apiKey = "bbb68bd0";
    const apiKey = "d8a2b605";
    const URL = `http://www.omdbapi.com/?s=${movieTitle}&apikey=${apiKey}`;

    try {
        const response = await axios.get(URL);
        const data = response.data;
        res.render("home", { data: data });
    } catch (error) {
        console.error('Error fetching data from OMDB API:', error);
        res.redirect("/");
    }

});

app.post('/singleSearch/:imdbID', async (req, res) => {
    const imdbID = req.params.imdbID;
    // const apiKey = "bbb68bd0";
    const apiKey = "d8a2b605";
    const URL = `https://www.omdbapi.com/?i=${imdbID}&apikey=${apiKey}&plot=full`;

    try {
        const response = await axios.get(URL);
        const data = await response.data;
        res.render("single", { data: data });
    } catch (error) {
        console.error('Error fetching data from OMDB API:', error);
        res.redirect("/");
    }
});

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Movies",
    password: "postgres",
    port: 5432
});

db.connect();


app.get("/signup", (req, res) => {
    res.render("./Auth/signup");
});

app.post("/signup", [
    body('email', "enter a valid email").isEmail(),
    body('password', "enter a valid password").isLength({ min: 5 }),
    body('firstName', 'enter a valid name').isLength({ min: 3 }),
    body('lastName', 'enter a valid name').isLength({ min: 3 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        var fName = req.body.firstName;
        var lName = req.body.lastName;
        var eemail = req.body.email;
        var pass = req.body.password;

        const hashedPassword = await bcrypt.hash(pass,saltRounds);

        await db.query("INSERT INTO users (first_name,last_name,email,pass) values ($1,$2,$3,$4)", [fName, lName, eemail, hashedPassword,]);
        Login = true;
        Email = String(eemail);
        res.redirect("/");
    } catch (error) {
        console.error("Error Signing in :", error);
        res.redirect("/signup");
    }
});


app.get("/login", (req, res) => {
    res.render("./Auth/login");
});

app.post("/login", [
    body('email', "enter a valid email").isEmail(),
    body('password', "enter a valid password").isLength({ min: 5 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        var email = req.body.email;
        var password = req.body.password;

        const result = await db.query("SELECT pass FROM users WHERE email =$1", [email,]);

        if (result.rows.length !== 0) {
            const compare = await bcrypt.compare(password,result.rows[0].pass)
            if (compare) {
                Login = true;
                Email = email;
                res.redirect("/items");
            }
            else {
                res.send("sorry!!! unsuccessful, invalid credentials");
            }
        }
        else {
            res.send("sorry!!! unsuccessful, invalid credentials");
        }
    } catch (error) {
        console.error("Error logging in :", error);
        res.redirect("/");
    }
})

app.get("/items", async (req, res) => {
    try {
        if (Login && Email !== "") {
            const data = await db.query("SELECT * FROM movielist WHERE email = $1", [Email]);
            res.render("./Auth/YourItems", { data: data.rows });
        }
        else {
            res.redirect("/signup");
        }
    } catch (error) {
        console.error("Error displaying watchlist:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.post("/wtchList/:imdbID/:title/:year", async (req, res) => {
    try {
        if (Login && Email && Email !== "") {
            const id = req.params.imdbID;
            const title = req.params.title;
            const year = req.params.year;

            await db.query("INSERT INTO movielist (email, title, yearofrelease, imdbid) VALUES ($1, $2, $3, $4)", [Email, title, year, id]);
            res.redirect("/items");
        } else {
            res.redirect("/signup");
        }
    } catch (error) {
        console.error("Error adding movie to watchlist:", error);
        res.status(500).send("Internal Server Error");
    }
})


app.post("/delete/:imdbid", async (req, res) => {
    try {
        const id = req.params.imdbid;
        await db.query('DELETE FROM "movielist" WHERE "imdbid" = $1', [id]);
        res.redirect("/items");
    } catch (error) {
        console.error("Error deleting item from watchlist:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.listen(port, () => {
    console.log(`Server Active at port ${port}`);
})