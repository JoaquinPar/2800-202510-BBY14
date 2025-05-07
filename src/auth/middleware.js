const status = require("../util/statuses");
const session = require("express-session");

// Get all user routes names
let userRouter = require("../router/user")((req, res, next) => next(), null, null, null);
userRouter.stack.shift();
const userRoutes = userRouter.stack.map((layer) => layer.route.path.split("/")[1]);

/**
 * @param {MongoClient.collection} users db collection
 * @returns {async function} middleware handler function
*/
const createMiddleware = (users) => {
    return async (req, res, next) => {
        // Redirect not found pages to 404 page
        if (!userRoutes.includes(req.url.substring(1))) {
            return res.status(status.NotFound).redirect("/notFound");
        }

        if (!req.session.authenticated || !req.session.email) {
            req.session.errMessage = "Please login to view that resource";
            res.redirect("/login");
            return res.status(status.Unauthorized);
        }
    
        if (!req.session.user) {
            let user = await users.findOne({ "email": req.session.email }).then((user) => user);
        
            if (!user) {
                req.session.errMessage = "User not found";
                res.redirect("/login");
                return res.status(status.Unauthorized);
            }
        
            req.session.user = user;
        }

        next();
    };
}

module.exports = createMiddleware;
