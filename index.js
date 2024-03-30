require("dotenv").config();
let mqtt    = require('mqtt');
const express = require("express");
let cors = require('cors');
let MongoClient = require('mongodb').MongoClient;
const axios = require('axios');

let url = "mongodb+srv://"+process.env.DBUSERNAME+":"+process.env.DBPASSWD+"@cluster0."+process.env.DBURL+".mongodb.net/";
const app = express();
let client  = mqtt.connect("mqtt://broker.hivemq.com:1883",{clientId:"gtplapilistenserv"});


async function pushdata(jsonData)
{
    //console.log("pushdata function");
    const client = new MongoClient(url); // Create client - Think of it as a live connection
    await client.connect(); // Connect client to server
    const database = client.db(process.env.DBNAME); // Access the database on server
    let gtplenergydataCollection = null; // Initial value of sounds collection

    let gtplenergydata = await database.listCollections({}, { nameOnly: true }).toArray();
    //console.log(gtplenergydata);
    gtplenergydata.filter((collectionName) => { return collectionName === "gtplenergydata"; });

    if (gtplenergydata.length == 0) 
    {
        //console.log("collection does not exist");
        gtplenergydataCollection = await database.createCollection("gtplenergydata");
        await gtplenergydataCollection.insertOne(jsonData);
        console.log("data insert success");
    } 
    else 
    {
        //console.log("collection already exists");
        gtplenergydataCollection = await database.collection("gtplenergydata");
        await gtplenergydataCollection.insertOne(jsonData);
        console.log("data insert success");
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

//handle incoming messages
client.on('message',function(topic, message, packet)
{
	//console.log("inside on mqtt message");
	//console.log("message is "+ message);
	//console.log("topic is "+ topic);
	pushdata(JSON.parse(message));
});

client.on("connect",function()
{	
	console.log("connected  "+ client.connected);
})
//handle errors
client.on("error",function(error)
{
	console.log("Can't connect" + error);
	process.exit(1)
});

var options={retain:true, qos:1};
var topic="GTPLIOTENMS";
client.subscribe(topic,{qos:1}); //single topic
console.log("end of script");
app.use(cors())

app.get("/",function(request,response)
{
    //console.log("get request recieved");
	response.send("app running.get request recieved");
});

app.get("/:paramname/:noofitems",function(request,response)
{
	console.log("inside get params latest");
	let paramname=request.params.paramname;

	let noofitems=parseInt(request.params.noofitems);

    let queryfind = {};
    let value = {$exists:true};
    queryfind[paramname] = value;

    let projvalue = {};
	projvalue[paramname]=1;
	projvalue["DATE"]=1;
	projvalue["_id"]=0;

    let sortvalue = {DATE:-1};

    let recieveddata=finddata("gtplenergydata",queryfind,projvalue,sortvalue,noofitems);
    recieveddata.then(function(result) 
    {
        //console.log(result)
        response.send(result);
    })
});

app.get("/:paramname/:fromdate/:todate",function(request,response)
{
	console.log("inside get params periodic");

	let paramname=request.params.paramname;
	let fromdate=parseInt(request.params.fromdate);
	let todate=parseInt(request.params.todate);
	
	let fromdatenew = new Date(fromdate*1000);
	let todatenew = new Date(todate*1000);
	let addMinutes = 330;
	fromdatenew.setTime(fromdatenew.getTime() + (addMinutes * 60 * 1000));
	todatenew.setTime(todatenew.getTime() + (addMinutes * 60 * 1000));
	let newfromdatestring=fromdatenew.toISOString();
	let newtodatestring=todatenew.toISOString();
	newfromdatestring = newfromdatestring.substring(0, newfromdatestring.length - 1);
	newtodatestring = newtodatestring.substring(0, newtodatestring.length - 1);

	let queryfind = {};
    let value = {$exists:true};
    queryfind[paramname] = value;
	queryfind["DATE"] = {$lt:newtodatestring,$gte:newfromdatestring};

    let projvalue = {};
	projvalue[paramname]=1;
	projvalue["DATE"]=1;
	projvalue["_id"]=0;

    let sortvalue = {DATE:-1};
	let noofitems=10000;

    let recieveddata=finddata("gtplenergydata",queryfind,projvalue,sortvalue,noofitems);
    recieveddata.then(function(result) 
    {
        //console.log(result)
        response.send(result);
    })

});

app.get("/login/now/:usernameentered/:passwordentered",function(request,response)
{
	var usernameentry=request.params.usernameentered;
	var passwordentry=request.params.passwordentered;
	var queryfind = {};
	let projvalue = {};
	let sortvalue = {};
	let noofitems=2;
	queryfind["username"] = usernameentry;
	queryfind["password"] = passwordentry;

	let recieveddata=finddata("users",queryfind,projvalue,sortvalue,noofitems);
    recieveddata.then(function(result) 
    {
        //console.log(result)
        if(result.length==1)
		{
			//response.send("true");
			let sendresp={};
			sendresp.username=result[0].username;
			response.send(sendresp);
		}
		else
		{
			response.send("false");
		}
    })

});

app.listen(process.env.PORT || 3000,function()
{
    console.log("server running at port 3000");
});