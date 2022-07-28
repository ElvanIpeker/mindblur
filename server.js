const express = require("express");
const bcrypt = require("bcrypt");
const BookModel = require("./models/Book.model");

const mongoose = require("mongoose");
const UserModel = require("./models/User.model");

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost/mindblur";
// falsy && string -> false
// truthy && string -> string
// falsy || string -> string
// truthy || string -> truthy

mongoose.connect(MONGO_URL).then((connection) => {
  console.log(
    `Connected to Mongo!! Database name is "${connection.connections[0].name}"`
  );
});

const app = express();

require("./config")(app);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/auth/register", (req, res) => {
  res.render("auth/register");
});

app.post("/auth/register", (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username) {
    return res.status(400).render("auth/register", {
      usernameError: "Please add a username",
      ...req.body,
    }); // eventuallty show an error
  }

  if (!email) {
    return res.status(400).render("auth/register", {
      emailError: "Please add an email",
      ...req.body,
    });
  }

  if (!password) {
    return res.status(400).render("auth/register", {
      passwordError: "Please add a password",
      ...req.body,
    });
  }

  // ideally we should do some validation of emails and password. i wont do it now, we can do later

  if (username.length < 4) {
    return res.status(400).render("auth/register", {
      usernameError: "Please choose something with more than 4 characters",
      ...req.body,
    });
  }

  if (!email.includes("@")) {
    // @email andre@ || @
    return res.status(400).render("auth/register", {
      emailError:
        "Please add, at the very least an @ symbol. We dont ask for THAT much",
      ...req.body,
    });
  }

  if (password.length < 8) {
    return res.status(400).render("auth/register", {
      passwordError: "Could you at least pretend like you give a damn?",
      ...req.body,
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).render("auth/register", {
      passwordError:
        "Could you at least pretend like you give a damn?. Could these AT LEAST be the same? For once?... Could you not? We've been through this... It is written... Are you that dumb? You must be... Otherwise you would have done what we ask you to do... So could you, for once in your miserable life, do what youre told? Thank you",
      ...req.body,
    });
  }

  UserModel.findOne({ $or: [{ username }, { email }] })
    .then((possibleUser) => {
      // {User document} | null
      // if possible user is defined (truthy)
      if (possibleUser) {
        return res.render("auth/register", {
          generalError:
            "Either email or username already taken. Please try a new thing",
          ...req.body,
        }); // we know that there is a user already with at least one of those two credentials
      }

      // 1st - create something called a salt
      const salt = bcrypt.genSaltSync(15);

      const hashedPassword = bcrypt.hashSync(password, salt);

      UserModel.create({
        email,
        username,
        password: hashedPassword,
      })
        .then((createdUser) => {
          console.log("createdUser:", createdUser);
          res.redirect("/");
        })
        .catch((err) => {
          console.log("error failing creating a user", err);
          res.status(500).render("auth/register", {
            generalError:
              "Something got royally screwed up. Please try again later",
            ...req.body,
          });
        });
    })
    .catch((err) => {
      console.log(err);

      res.status(500).render("auth/register", {
        generalError:
          "Something got royally screwed up. Please try again later",
        ...req.body,
      });
    });
});

app.get("/auth/login", (req, res) => {
  res.render("auth/login");
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    res.status(400).render("auth/login", {
      usernameError: "No username provided",
    });
    return;
  }

  if (!password) {
    return res.status(400).render("auth/login", {
      passwordError: "No password provided",
    });
  }

  UserModel.findOne({ username })
    .then((possibleUser) => {
      if (!possibleUser) {
        return res.status(400).render("auth/login", {
          generalError: "Wrong credentials",
        });
      }

      // Here we know that there is a user
      const isSamePassword = bcrypt.compareSync(
        password,
        possibleUser.password
      );

      if (!isSamePassword) {
        return res.status(400).render("auth/login", {
          generalError: "Wrong credentials",
        });
      }

      // the user exists. the password is the same. you must be the right person
      res.redirect("/");
    })
    .catch((err) => {
      console.log("Something failed whilst reaching for a user", err);
      res.status(500).render("auth/login", { generalError: "oopsie daisy" });
    });
});

// CREATE BOOK
app.get("/book/add", (req, res) => {
  res.render("book/add-book");
});

app.post("/book/add", (req, res) => {
  const { title, description, authors, publisher, genre, nsfw, year } =
    req.body;

  const authorArray = authors.split(",").map((author) => author.trim());

  BookModel.create({
    title,
    authors: authorArray,
    publisher,
    nsfw,
    year,
    description,
    // genre,
  })
    .then((createdBook) => {
      res.render("book/add-book", { createdBook });
    })
    .catch((err) => {
      console.log("Oopsie", err);
      // TODO: Do better error handling
      res.redirect("/");
    });
});

app.get("/book/:bookId", (req, res) => {
  const { bookId } = req.params;

  BookModel.findById(bookId).then((book) => {
    res.render("book/single-book", { book });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
