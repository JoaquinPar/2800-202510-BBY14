const MongoClient = require("mongodb").MongoClient;

/**
 * connectMongo returns a database connection to MongoDB
 * @param {string} mongoURI 
 * @param {string} databaseName
 * @return {MongoClient}
 */
const connectMongo = async (mongoURI, databaseName) => {
    const database = await MongoClient.connect(mongoURI, { connectTimeoutMS: 1000 });
    const dbo = database.db(databaseName);
    return dbo;
}

/**
 * getCollection object to interact with MongoDB
 * @param {MongoClient} dbo
 * @param {string} collection 
 * @return {MongoClient.collection}
 */
const getCollection = async (dbo, collection) => {
    return await dbo.collection(collection);
}

module.exports = {
    connectMongo: connectMongo,
    getCollection: getCollection,
}
