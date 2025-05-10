const status = require("../util/statuses");
const session = require("express-session");
const bcrypt = require('bcrypt');
const joi = require("joi");
const salt = 12;

/**
 * @param {MongoClient.collection} users db collection
 * @returns {express.Router} authentication router
 */
module.exports = (users) => {
    const router = require("express").Router();

    router.get("/logout", (req, res) => {
        req.session.destroy();
        return res.redirect('/login');
    });
    
    router.post("/login", async (req, res) => {
      
        const credentialSchema = joi.object({
            email: joi.string().email().required(),
            password: joi.string().alphanum().max(20).required(),
        });

        const valid = credentialSchema.validate(req.body);

        if (valid.err) {
            req.session.errMessage = "Invalid input";
            res.status(status.BadRequest);
            return res.redirect("/login");
        }

        users.findOne({ "email": req.body.email }).then((user) => {
            if (!user) {
                req.session.errMessage = "User not found";
                res.status(status.NotFound);
                return res.redirect("/login");
            }

            if (!bcrypt.compareSync(req.body.password, user.password)) {
                req.session.errMessage = "Incorrect password";
                res.status(status.Unauthorized);
                return res.redirect("/login");
            }

            req.session.authenticated = true;
            req.session.userId = user._id;
            req.session.email = req.body.email;
            req.session.errMessage = "";
            res.redirect("/home");
            return res.status(status.Ok);
        });
    });

    router.post("/signup", async (req, res) => {
        const userSchema = joi.object({
            email: joi.string().email().required(),
            name: joi.string().pattern(new RegExp('^[a-zA-Z]+$')).max(20).required(),
            password: joi.string().alphanum().max(20).min(8).required(),
            repassword: joi.string().alphanum().max(20).min(8).required(),
        });

        const valid = userSchema.validate(req.body);

        if (valid.err) {
            req.session.errMessage = "Invalid input",
            res.status(status.BadRequest);
            return res.redirect("/signup");
        }

        let exists = await users.findOne({ email: req.body.email }).then((exists) => exists);
        if (exists) {
            req.session.errMessage = "Email already in use";
            res.status(status.BadRequest);
            return res.redirect("/signup");                
        }

        if (req.body.password != req.body.repassword) {
            req.session.errMessage = "Passwords must match";
            res.status(status.BadRequest);
            return res.redirect("/signup");
        }

        let hashedPassword = await bcrypt.hashSync(req.body.password, salt);

        users.insertOne({
            email: req.body.email,
            name: req.body.name,
            password: hashedPassword,
            financialData: false,
        }).then((results, err) => {
            if (err) {
                console.error("Error creating user on signup: ", err);
                res.session.errMessage = "Internal server error";
                return res.status(status.InternalServerError).redirect("/signup");
            }

            req.session.authenticated = true;
            req.session.email = req.body.email;
            req.session.userId = results.insertedId;

            req.session.errMessage = "";
            return res.status(status.Ok).redirect("/home");
        });
    });

    return router;
}
