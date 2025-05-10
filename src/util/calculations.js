const ObjectId = require('mongodb').ObjectId;

async function calculatePlanProgress(plans, assets, userId) {
    if (!plans || typeof plans.retirementAssets === 'undefined') {
        console.error("Invalid plan document provided to calculatePlanProgress:", plans);
        return 0;
    }
    if (!assets || typeof assets.find !== 'function') {
        console.error("Invalid assetsCollection provided to calculatePlanProgress");
        return 0;
    }

    try {
        const userAssets = await assets.find({ userId: new ObjectId(userId) }).toArray();
        const totalUserAssetValue = userAssets.reduce((total, asset) => total + asset.value, 0);
        let percentage = 0;

        if (plans.retirementAssets > 0) {
            percentage = (totalUserAssetValue / plans.retirementAssets) * 100;
        }
        return percentage;
    } catch (err) {
        console.error("Error in calculatePlanProgress:", err);
        return 0;
    }
}

async function updatePlanProgressInDB(planId, percentage, plans) {
    if (!plans || typeof plans.updateOne !== 'function') {
        console.error("Error with the plans collection");
        return;
    }
    if (typeof percentage !== 'number' || isNaN(percentage)) {
        console.error(`Error with the percentage: ${percentage}`);
        return;
    }

    try {
        await plans.updateOne({ _id: new ObjectId(planId) }, { $set: { progress: parseFloat(percentage.toFixed(2)) } });
    } catch (err) {
        console.error("Error in updatePlanProgressInDB:", err);
    }
}

module.exports = { calculatePlanProgress, updatePlanProgressInDB };