// Modules
var express = require("express"),
    config = require("../../config"),
    restler = require("restler"),
    router = express.Router();

// Handle Route: /auth/login
router.get("/", function(req, res, next) {
    // Check for Access Denied Error
    if (req.query.error != "access_denied") {
        // Check State String is Correct
        if (req.query.state == req.session.twitch_state) {
            // Get OAuth Token
            restler.post("https://id.twitch.tv/oauth2/token", {
                data: {
                    client_id: config.twitch.auth.id,
                    client_secret: config.twitch.auth.secret,
                    grant_type: "authorization_code",
                    redirect_uri: config.twitch.auth.redirect,
                    code: req.query.code
                }
            }).on("complete", function(auth) {
                restler.get("https://api.twitch.tv/helix/users", {
                    headers: {
                        "User-Agent": "Purple+",
                        "Authorization": "Bearer " + auth.access_token,
                        "Client-ID": config.twitch.auth.id
                    }
                }).on("complete", function(resp) {
                    // Check for API Failure
                    if (resp && resp.data) {
                        // Get User from Payload
                        var user = resp.data[0];

                        // Handle Empty API Fields
                        if (!user.type) {
                            user.type = "user";
                        }
                        if (!user.broadcaster_type) {
                            user.broadcaster_type = "user";
                        }

                        // Search for User in Database
                        req.db.collection("users").findOne({ 
                            "twitch_id": user.id 
                        }, function(err, result) {
                            // Handle Database Connection Failure
                            if (err) {
                                res.render("error", { title: "500 Error", code: "500", message: "The server could not contact the database. Please try again." });
                            }
                            else {
                                if (result) {
                                    // Update User Object (Handle Name Changes, Partnership Changes and Twitch Job Changes)
                                    req.db.collection("users").updateOne({ 
                                        "twitch_id": user.id 
                                    }, {
                                        "$set": {
                                            "twitch_name": user.display_name,
                                            "twitch_username": user.login,
                                            "user_types.twitch": user.type,
                                            "user_types.partnership": user.broadcaster_type,
                                            "last_login": Date.now()
                                        }
                                    }, function(err, result) {
                                        // Handle Database Connection Failure
                                        if (err) {
                                            res.render("error", { title: "500 Error", code: "500", message: "The server could not contact the database. Please try again." });
                                        }
                                        else {
                                            req.db.collection("users").findOne({ 
                                                "twitch_id": user.id 
                                            }, function(err, result) {
                                                // Handle Database Connection Failure
                                                if (err) {
                                                    res.render("error", { title: "500 Error", code: "500", message: "The server could not contact the database. Please try again." });
                                                }
                                                else {
                                                    // Store Login in Session
                                                    req.session.loggedin = result;

                                                    // Stop Redirect Loops, Profile Creating Errors & Returning to Index
                                                    if (req.session.return.indexOf("/auth/") > -1 || req.session.return.indexOf("/profile/") > -1 || req.session.return == config.app.base + "/") {
                                                        req.session.return = "/profile/";
                                                    }

                                                    // Redirect User
                                                    res.redirect(req.session.return);
                                                }
                                            });
                                        }
                                    });
                                }
                                else {
                                    // Create New User Object
                                    req.db.collection("users").insertOne({
                                        "twitch_id": user.id,
                                        "twitch_name": user.display_name,
                                        "twitch_username": user.login,
                                        "reddit_id": null,
                                        "reddit_name": null,
                                        "reddit_username": null,
                                        "discord_id": null,
                                        "discord_name": null,
                                        "discord_discriminator": null,
                                        "balance": 0,
                                        "last_login": Date.now(),
                                        "user_types": {
                                            admin: false,
                                            site: "user",
                                            twitch: user.type,
                                            partnership: user.broadcaster_type,
                                            subreddit: "user",
                                            profile: "other",
                                            ama: false,
                                            beta: false
                                        },
                                        bans: {
                                            profiles: false,
                                            twoos: false,
                                            requests: false
                                        }
                                    }, function(err, result) {
                                        // Handle Database Connection Failure
                                        if (err) {
                                            res.render("error", { title: "500 Error", code: "500", message: "The server could not contact the database. Please try again." });
                                        }
                                        else {
                                            // Store Login in Session
                                            req.session.loggedin = {
                                                "twitch_id": user.id,
                                                "twitch_name": user.display_name,
                                                "twitch_username": user.login,
                                                "reddit_id": null,
                                                "reddit_name": null,
                                                "reddit_username": null,
                                                "discord_id": null,
                                                "discord_name": null,
                                                "discord_discriminator": null,
                                                "user_types": {
                                                    admin: false,
                                                    site: "user"
                                                }
                                            }

                                            // Stop Redirect Loops & Returning to Index
                                            if (req.session.return.indexOf("/auth/") > -1 || req.session.return.indexOf("/profile/") > -1 || req.session.return == config.app.base + "/") {
                                                        req.session.return = "/profile/";
                                                    }

                                            // Redirect User
                                            res.redirect(req.session.return);
                                        }
                                    });
                                }
                            }
                        });
                    }
                    else {
                        res.render("error", { title: "503 Error", code: "503", message: "Something went wrong with the Twitch API. Please try again." });
                    }
                });
            });
        }      
        else {
            res.render("error", { title: "403 Error", code: "403", message: "An invalid state parameter was returned. Please try again." });
        }
    }
    else {
        res.render("error", { title: "401 Error", code: "401", message: "Access to your account was denied." });
    }
});

module.exports = router;