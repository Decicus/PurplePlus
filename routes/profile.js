// Modules
var express = require("express"),
    swig = require("swig"),
    config = require("../config"),
    helpers = require("../helpers"),
    router = express.Router();

// Handle Route: /profile/
router.get("/", function(req, res, next) {
    // Check User is Logged In
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            "twitch_id": req.session.loggedin.twitch_id
        }, function(err, result) {
            // Store Result for Later
            var user = result;
            // Handle Database Connection Failure
            if (err) {
                res.render("error", { title: "500 Error", code: "500", message: "The server could not contact the database. Please try again." });
            }
            else {
                req.db.collection("profiles").findOne({
                    "twitch_id": req.session.loggedin.twitch_id
                }, function(err, result) {
                    // Handle Database Connection Failure
                    if (err) {
                        res.render("error", { title: "500 Error", code: "500", message: "The server could not contact the database. Please try again." });
                    }
                    else {
                        res.render("profile", { title: "My Profile", user: user, profile: result })
                    }
                });
            }
        })
    }
    else {
        res.redirect("/auth/redirect/twitch")
    }
});

module.exports = router;