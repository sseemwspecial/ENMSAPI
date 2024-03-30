require("dotenv").config();
const express = require("express");
let cors = require('cors');
let MongoClient = require('mongodb').MongoClient;
const axios = require('axios');

let url = "mongodb+srv://"+process.env.DBUSERNAME+":"+process.env.DBPASSWD+"@cluster0."+process.env.DBURL+".mongodb.net/";
const app = express();

app.use(cors())

async function pushdata(collectionname,jsonData)
{
    //console.log("pushdata function");
    const client = new MongoClient(url); // Create client - Think of it as a live connection
    await client.connect(); // Connect client to server
    const database = client.db(process.env.DBNAME); // Access the database on server
    let dbCollection = null; // Initial value of sounds collection

    let dbCollectiondata = await database.listCollections({}, { nameOnly: true }).toArray();
    //console.log(gtplenergydata);
    dbCollectiondata.filter((collectionName) => { return collectionName === collectionname; });

    if (dbCollectiondata.length == 0) 
    {
        //console.log("collection does not exist");
        dbCollection = await database.createCollection(collectionname);
        await dbCollection.insertOne(jsonData);
        console.log("data insert success");
        client.close();
    } 
    else 
    {
        //console.log("collection already exists");
        dbCollection = await database.collection(collectionname);
        await dbCollection.insertOne(jsonData);
        console.log("data insert success");
        client.close();
    }
}
async function finddata(collectionname,queryfind,projvalue,sortvalue,noofitems)
{
    //console.log("pushdata function");
    const client = new MongoClient(url); // Create client - Think of it as a live connection
    await client.connect(); // Connect client to server
    const database = client.db(process.env.DBNAME); // Access the database on server
    let dbCollection = await database.collection(collectionname);

    try 
    {
        const data = await dbCollection.find(queryfind).project(projvalue).sort(sortvalue).limit(noofitems).toArray();
        //console.log(data);
        client.close();
        return data;
        
    } 
    catch (error) 
    {
        console.error("Failed to retrieve documents:", error);
        client.close();
    }
}

app.get("/", function(request,response)
{
    //console.log("get request recieved");
	//response.send("app running.get request recieved");
    //let jsondata={name:"asdas"};
    //pushdata("gtplenergydata",jsondata);

    //  let queryfind = {};
    //  let projvalue = {};
    //  let sortvalue = {};
    //  let noofitems =  1;
    //  queryfind["username"] = "admin";
	//  queryfind["password"] = "admin";
    //  finddata("users",queryfind,projvalue,sortvalue,noofitems);

    let paramname="SH_COMP_01_TEN";

    let queryfind = {};
    let value = {$exists:true};
    queryfind[paramname] = value;

    let projvalue = {};
	projvalue[paramname]=1;
	projvalue["DATE"]=1;
	projvalue["_id"]=0;

    let sortvalue = {DATE:-1};
    let noofitems =  3;

    let recieveddata=finddata("gtplenergydata",queryfind,projvalue,sortvalue,noofitems);
    recieveddata.then(function(result) 
    {
        //console.log(result)
        response.send(result);
    })
   
});
		
app.listen(process.env.PORT || 3000,function()
{
    console.log("server running at port 3000");
});