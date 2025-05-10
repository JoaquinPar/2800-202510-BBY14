const getRates = require("../util/exchangeRate");
const { calculatePlanProgress, updatePlanProgressInDB } = require("../util/calculations");
const status = require("../util/statuses");
const ObjectId = require('mongodb').ObjectId;
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const joi = require("joi");
const fs = require("fs");
const salt = 12;

/**
 * getAssetSchema returns correct joi object
 * to validate req.body depending on asset type
 * @param {string} type of asset
 * @returns {joi.object} schema
 */
const getAssetSchema = (type) => {
    let assetSchema;

    switch (type) {
        case "other":
            assetSchema = joi.object({
                type: joi.string().valid("other", "stock", "saving").required(),
                icon: joi.string().alphanum().required(),
                name: joi.string().alphanum().min(3).max(30).required(),
                value: joi.number().min(0).required(),
                purchaseDate: joi.date().required(),
                description: joi.string().alphanum().max(240),
                id: joi.string().alphanum(), // May be passed when updating existing asset
            });
            break;
        case "saving":
            assetSchema = joi.object({
                type: joi.string().valid("other", "stock", "saving").required(),
                name: joi.string().alphanum().min(3).max(30).required(),
                value: joi.number().min(0).required(),
                id: joi.string().alphanum(), // May be passed when updating existing asset
            });
            break;
        case "stock":
            assetSchema = joi.object({
                type: joi.string().valid("other", "stock", "saving").required(),
                ticker: joi.string().alphanum().min(3).max(5).required(),
                price: joi.number().min(0).required(),
                quantity: joi.number().min(1).required(),
                purchaseDate: joi.date().required(),
                id: joi.string().alphanum(), // May be passed when updating existing asset
            });
            break;
        default:
            return null;
    };

    return assetSchema;
}

/**
 * @param {function} middleware handler
 * @param {MongoClient.collection} users db collection
 * @param {MongoClient.collection} assets db collection
 * @returns {express.Router} user protected routes router
 */
module.exports = (middleware, users, plans, assets) => {
    const router = require("express").Router();

    // Create list of icon filenames
    let icons = fs.readdirSync(path.join(__dirname, "../public/svgs/icons"));
    icons = icons.map((icon) => icon.split(".")[0]);

    router.use(middleware);

    router.get('/home', async (req, res) => {
        // if no session with geoData
        if (!req.session.geoData) {
            req.session.geoData = {
                country: null,
                toCurrencyRates: [],
            };
        }

        res.render('dashboard', { user: req.user, geoData: req.session.geoData });

        return res.status(status.Ok);
    });

    router.get('/assets', async (req, res) => {
        let userAssets = await assets.find({ userId: new ObjectId(req.session.user._id) }).toArray();
        res.render('assets', {
            user: req.session.user,
            errMessage: req.session.errMessage,
            assets: userAssets,
            geoData: req.session.geoData,
            icons: icons,
        });
        return res.status(status.Ok);
    });

    router.get('/plans', async (req, res) => {
        try {
            const userPlansFromDB = await plans.find({ userId: new ObjectId(req.session.user._id) }).toArray();

            // Use a for...of loop for proper async/await behavior in series for updates
            for (const plan of userPlansFromDB) {
                const percentage = await calculatePlanProgress(plan, assets, req.session.user._id);
                await updatePlanProgressInDB(plan._id, percentage, plans); // Pass the 'plans' collection
            }

            // Re-fetch plans to get updated progress for rendering
            const updatedUserPlans = await plans.find({ userId: new ObjectId(req.session.user._id) }).toArray();

            res.render('plans', {
                user: req.session.user,
                plans: updatedUserPlans, // Send the most up-to-date plans
                geoData: req.session.geoData
            });
        } catch (err) {
            console.error("Error fetching plans:", err);
            req.session.errMessage = "Could not load your plans. Please try again.";
            res.status(status.InternalServerError).redirect('/home');
        }
    });

    router.get('/plans/:id', async (req, res) => {

        try {
            const planId = req.params.id;
            let userAssets = await assets.find({ userId: new ObjectId(req.session.user._id) }).toArray();


            if (!ObjectId.isValid(planId)) {
                req.session.errMessage = "Invalid plan ID format.";
                return res.status(status.BadRequest).redirect('/plans');
            }

            const plan = await plans.findOne({ userId: new ObjectId(req.session.user._id), _id: new ObjectId(planId) });

            if (!plan) {
                console.log(`Plan not found with ID: ${planId} for user: ${req.session.user.email}`);
                req.session.errMessage = "Plan not found or you do not have permission to view it.";
                return res.status(status.NotFound).redirect('/plans');
            }

            // The plan.progress should be up-to-date from the database as it was updated in the /plans route
            // or when assets/plans are modified. If an immediate recalculation for this specific view is absolutely needed,
            // (e.g., if assets were modified without an immediate plan progress update elsewhere),
            // you could do it here:
            // const currentProgress = await calculatePlanProgress(plan, assets, req.session.user._id);
            // plan.progress = currentProgress; // This would only update the 'plan' object for this render, not in DB

            res.render('planDetail', {
                user: req.session.user,
                plan: plan, // This plan object will have the progress from the database
                geoData: req.session.geoData,
                assets: userAssets,
            });

        } catch (err) {
            console.error("Error fetching plan:", err);
            req.session.errMessage = "Could not load your plan. Please try again.";
            res.status(status.InternalServerError).redirect('/home');
        }
    });

    router.get('/newPlan', (req, res) => {
        if (!req.session.user.financialData || !req.session.user) {
            req.session.errMessage = "Please complete your financial data before creating a plan.";
            return res.status(status.Unauthorized).redirect('/questionnaire');
        }
        const errMessage = req.session.errMessage;
        req.session.errMessage = "";
        res.render('newPlan', {
            user: req.session.user,
            errMessage: errMessage,
            geoData: req.session.geoData
        });
    });

    router.post('/newPlan', async (req, res) => {
        const planSchema = joi.object({
            name: joi.string().min(3).max(100).required(),
            retirementAge: joi.number().min(18).max(120).required(),
            retirementExpenses: joi.number().min(0).required(),
            retirementAssets: joi.number().min(0).required(),
            retirementLiabilities: joi.number().min(0).required(),
        });

        const validationOptions = { convert: true, abortEarly: false };
        const { error, value } = planSchema.validate(req.body, validationOptions);

        if (error) {
            console.error("Plan validation error:", error.details);
            req.session.errMessage = "Invalid input: " + error.details.map(d => d.message.replace(/"/g, '')).join(', ');
            res.status(status.BadRequest).redirect("/newPlan");
            return;
        }
        const newPlan = {
            userId: new ObjectId(req.session.user._id),
            name: value.name,
            retirementAge: value.retirementAge,
            retirementExpenses: value.retirementExpenses,
            retirementAssets: value.retirementAssets,
            retirementLiabilities: value.retirementLiabilities,
            progress: "0"
        };

        try {
            await plans.insertOne({ userId: new ObjectId(req.session.user._id), ...newPlan });
            req.session.errMessage = "";
            res.redirect('/plans');
        }
        catch (err) {
            console.error("Error saving plan:", err);
            req.session.errMessage = "An error occurred while saving your plan. Please try again.";
            res.status(status.InternalServerError).redirect("/newPlan");
        }
    });

    router.get('/more', (req, res) => {
        res.render('more', {
            user: req.session.user,
            geoData: req.session.geoData
        });
        return res.status(status.Ok);
    });

    router.get('/profile', (req, res) => {
        res.render('profile', {
            user: req.session.user,
            errMessage: req.session.errMessage,
            geoData: req.session.geoData
        });
        return res.status(status.Ok);
    });

    router.get('/settings', (req, res) => {
        res.render('settings', {
            user: req.session.user,
            geoData: req.session.geoData
        });
        return res.status(status.Ok);
    });

    router.get('/questionnaire', (req, res) => {
        const errMessage = req.session.errMessage;
        req.session.errMessage = "";
        res.render('questionnaire', {
            user: req.session.user,
            errMessage: errMessage,
            geoData: req.session.geoData
        });
    });

    router.post('/questionnaire', (req, res) => {
        const questionnaireSchema = joi.object({
            dob: joi.date().required(),
            education: joi.string().valid('primary', 'secondary', 'tertiary', 'postgraduate').required(),
            maritalStatus: joi.string().valid('single', 'married', 'divorced', 'widowed').required(),
            income: joi.number().min(0).required(),
            expenses: joi.number().min(0).required(),
            assets: joi.number().min(0).required(),
            liabilities: joi.number().min(0).required(),
        });

        const validationOptions = { convert: true, abortEarly: false };
        const { error, value } = questionnaireSchema.validate(req.body, validationOptions);

        if (error) {
            console.error("Questionnaire validation error:", error.details);
            req.session.errMessage = "Invalid input: " + error.details.map(d => d.message.replace(/"/g, '')).join(', ');
            res.status(status.BadRequest).redirect("/questionnaire");
            return;
        }

        users.updateOne(
            { _id: new ObjectId(req.session.user._id) },
            {
                $set: {
                    financialData: true,
                    dob: value.dob,
                    education: value.education,
                    maritalStatus: value.maritalStatus,
                    income: value.income,
                    expenses: value.expenses,
                    assets: value.assets,
                    liabilities: value.liabilities,
                }
            }
        ).then((result) => {
            if (result.matchedCount === 0) {
                console.log(`User not found during questionnaire update: ${req.session.user.email}`);
                req.session.errMessage = "User session invalid. Please log in again.";
                res.status(status.NotFound).redirect("/login");
                return;
            }
            if (result.modifiedCount === 0 && result.matchedCount === 1) {
                console.log(`User questionnaire data unchanged (already up-to-date): ${req.session.user.email}`);
            }

            req.session.user.financialData = true;
            req.session.errMessage = "";

            req.session.save(err => {
                if (err) {
                    res.status(status.InternalServerError).redirect("/plans");
                }
                res.status(status.Ok).redirect("/plans");
            });

        }).catch(err => {
            console.error("Error updating questionnaire in database:", err);
            req.session.errMessage = "An error occurred while saving your information. Please try again.";
            res.status(status.InternalServerError).redirect("/questionnaire");
        });
    });

    router.post("/updateAccount", async (req, res) => {
        const accountSchema = joi.object({
            email: joi.string().email(),
            name: joi.string().pattern(new RegExp('^[a-zA-Z]+$')).max(20),
            password: joi.string().alphanum().max(20).min(8),
            repassword: joi.string().alphanum().max(20).min(8),
        });

        const valid = accountSchema.validate(req.body);

        if (valid.err) {
            req.session.errMessage = "Invalid input",
                res.status(status.BadRequest);
            return res.redirect("/profile");
        }

        let update = {
            name: req.body.name,
        };

        if ((req.body.password != "") && (req.body.password != req.body.repassword)) {
            req.session.errMessage = "New passwords must match";
            res.status(status.BadRequest);
            return res.redirect("/profile");
        } else if (req.body.password != "") {
            let hashedPassword = await bcrypt.hashSync(req.body.password, salt);
            update.password = hashedPassword;
        }

        users.updateOne(
            { email: req.session.email },
            { $set: update }
        ).then((result) => {
            if (result.matchedCount === 0) {
                console.log(`User not found during account update: ${req.session.email}`);
                req.session.errMessage = "User session invalid. Please log in again.";
                res.status(status.NotFound).redirect("/login");
                return;
            }
            if (result.modifiedCount === 0 && result.matchedCount === 1) {
                console.log(`User account data unchanged (already up-to-date): ${req.session.email}`);
            }

            req.session.errMessage = "";
            return res.status(status.Ok).redirect("/profile");
        }).catch(err => {
            console.error("Error updating account in database:", err);
            req.session.errMessage = "An error occurred while saving your information. Please try again.";
            return res.status(status.InternalServerError).redirect("/profile");
        });
    });

    router.post("/createAsset", async (req, res) => {
        // Create asset, each asset has different data structure based on type
        const type = req.body.type;
        const assetSchema = getAssetSchema(type);

        if (!assetSchema) {
            console.error("Modified asset type, rejected");
            req.session.errMessage = "Invalid input";
            return res.status(status.BadRequest).redirect("/assets");
        }

        const valid = assetSchema.validate(req.body);

        if (valid.err) {
            req.session.errMessage = "Invalid input",
                res.status(status.BadRequest);
            return res.redirect("/assets");
        }

        let newAsset = {
            userId: new ObjectId(req.session.user._id),
            ...req.body,
            updatedAt: new Date(),
        };

        if (type == "stock") {
            newAsset.quantity = parseInt(newAsset.quantity);
            newAsset.price = parseFloat(newAsset.price)
            newAsset.value = newAsset.quantity * newAsset.price;
            newAsset.name = `${newAsset.ticker} Stock`;
        }
        newAsset.value = parseFloat(newAsset.value);
        newAsset.icon = type == "stock" ? "Stock" : type == "saving" ? "Coins" : newAsset.icon;

        assets.insertOne(newAsset, (err, _) => {
            if (err) {
                console.error("Error creating asset: ", err);
                req.session.errMessage = "Internal server error";
                return res.status(status.InternalServerError).redirect("/assets");
            }
        });

        req.session.errMessage = "";
        return res.status(status.Ok).redirect("/assets");
    });

    router.post("/updateAsset", async (req, res) => {
        const type = req.body.type;
        const assetSchema = getAssetSchema(type);

        if (!assetSchema) {
            console.error("Modified asset type, rejected");
            req.session.errMessage = "Invalid input";
            return res.status(status.BadRequest).redirect("/assets");
        }

        const valid = assetSchema.validate(req.body);

        if (valid.err) {
            req.session.errMessage = "Invalid input",
                res.status(status.BadRequest);
            return res.redirect("/assets");
        }

        if (req.body.userId != req.session.user._id) {
            req.session.errMessage = "Cannot change asset owner",
                res.status(status.BadRequest);
            return res.redirect("/assets");
        }

        let update = { ...req.body, updatedAt: new Date() };
        if (type == "stock") {
            update.quantity = parseInt(update.quantity);
            update.price = parseFloat(update.price)
            update.value = update.quantity * update.price;
            update.name = `${update.ticker} Stock`;
        }
        update.value = parseFloat(update.value);
        delete update.id;
        delete update.userId;

        assets.updateOne(
            { "_id": new ObjectId(req.body.id) },
            { $set: update },
        ).then((result) => {
            if (result.matchedCount === 0) {
                console.log(`Asset not found: ${req.body.id}`);
                req.session.errMessage = "Unable to update asset";
                return res.status(status.NotFound).redirect("/assets");
            }
            if (result.modifiedCount === 0 && result.matchedCount === 1) {
                console.log(`Asset data unchanged (already up-to-date): ${req.body.id}`);
            }

            req.session.errMessage = "";
            return res.status(status.Ok).redirect("/assets");

        }).catch((err) => {
            console.error("Error updating asset: ", err);
            req.session.errMessage = "An error occurred while saving your information. Please try again.";
            return res.status(status.InternalServerError).redirect("/assets");
        });
    });

    router.post("/deleteAsset", (req, res) => {
        const id = new ObjectId(req.body.id);

        assets.deleteOne(
            { "_id": id }
        ).then((result) => {
            if (result.deletedCount === 0) {
                console.error(`Asset not found: ${req.body.id}`);
                req.session.errMessage = "Unable to delete asset. Please try again.";
                return res.status(status.NotFound).redirect("/assets");
            }

            if (!result.acknowledged) {
                console.error("Error deleting asset: ", err);
                req.session.errMessage = "An error occurred while deleting an asset. Please try again.";
                return res.status(status.InternalServerError).redirect("/assets");
            }

            req.session.errMessage = "";
            return res.status(status.Ok).redirect("/assets");

        }).catch((err) => {
            console.error("Error deleting asset: ", err);
            req.session.errMessage = "An error occurred while deleting an asset. Please try again.";
            return res.status(status.InternalServerError).redirect("/assets");
        });
    });

    router.post("/deleteUser", (req, res) => {
        // not as critical if results aren't as expected only if crashing
        assets.deleteMany({ userId: new ObjectId(req.session.user._id) }).catch((err) => {
            console.error("Error deleting user assets: ", err);
            req.session.errMessage = "An error occured while deleting your account. Please try again.";
            return res.status(status.InternalServerError).redirect("/profile");
        });

        plans.deleteMany({ userId: new ObjectId(req.session.user._id) }).catch((err) => {
            console.error("Error deleting user assets: ", err);
            req.session.errMessage = "An error occured while deleting your account. Please try again.";
            return res.status(status.InternalServerError).redirect("/profile");
        });

        users.deleteOne(
            { _id: new ObjectId(req.session.user._id) },
        ).then((result) => {
            if (result.deletedCount === 0) {
                console.error(`User not found: ${req.body.id}`);
                req.session.errMessage = "Unabled to delete account. Please try again.";
                return res.status(status.NotFound).redirect("/profile");
            }

            if (!result.acknowledged) {
                console.error("Error deleting user: ", err);
                req.session.errMessage = "An error occured while deleting your account. Please try again.";
                return res.status(status.InternalServerError).redirect("/profile");
            }

            // Direct to logout to destroy session
            req.session.destroy();
            return res.status(status.Ok).redirect("/signup");
        }).catch((err) => {
            console.error("Error deleting user: ", err);
            req.session.errMessage = "An error occured while deleting your account. Please try again.";
            return res.status(status.InternalServerError).redirect("/profile");
        });
    });

    router.get("/exRates/:lat/:lon", async (req, res) => {
        if (!req.session.geoData.country) {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${req.params.lat},${req.params.lon}&result_type=country&key=${process.env.GEOLOCATION_API}`);
            const data = await response.json();

            country = data.results[0].formatted_address;
            let results = await getRates(country);
            req.session.geoData = {
                country: results.abbreviation,
                toCurrencyRates: results.exRates,
                geoData: req.session.geoData
            }
        }

        return res.status(status.Ok).send({ data: req.session.geoData });
    })

    return router;
};
