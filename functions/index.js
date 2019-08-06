const functions = require('firebase-functions');
const admin = require('firebase-admin');
//const cors = require('cors')({ origin: true });

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
const adminUserKey = functions.config().adminUserKey; //This is set prior to deploying through firebase functions:config:set adminUserKey=<keyValue>
admin.initializeApp(functions.config().firebase);
exports.exportPlayers = functions.https.onRequest((req,response)=>{
	var players = req.body.players;

	for(var i=0;i<players.length;i++)
	    {

		var player = {}

		player.id=players[i].id;
		player.name=players[i].name;
		player.salary = players[i].salary;
		player.category = players[i].category;
		player.team = players[i].team;
		console.log(player);

		admin.firestore().collection('players').doc(players[i].name).set(player).then(function(ref){console.log(ref.id);response.status(200).send("GOOD");}).catch(function(error){console.log(error)});

	    }
});

exports.endCurrentAuction = functions.https.onRequest((req,response)=>{
	//const player = req.query.player;
	const user = req.query.user;
	const owner = req.query.owner;
	if(user==adminUserKey && owner!="viewer")
	{
		var dbRef = admin.firestore().collection('users');
		dbRef.doc(owner).get().then(doc=>{
			if(!doc.exists)
			{
				console.log(owner+" doesn't exist");
				response.status(400).send("owner doesn't exist");
			}
			else {
				var ownerObject = doc.data();
				admin.firestore().collection('results').doc("currentPlayer").get().then(doc=>{
					var currentPlayer = doc.data();
					if(currentPlayer.owner!=owner)
					{
						console.log(owner+" is not same as bid winner:"+currentPlayer.owner);
						response.status(400).send("Invalid owner in bid");
					}
					else {
						if(ownerObject.player1==null)
						{
							ownerObject.player1 = currentPlayer;
						}
						else if (ownerObject.player2==null) {
							ownerObject.player2 = currentPlayer;
						}
						dbRef.doc(owner).update(ownerObject).then(
							(ref)=>{response.status(201).send("Closed");}).catch(
								(err)=>{console.log(err);response.status(404).send("Error, check logs");});
					}
				});
			}
		})
	}
	else {
		response.status(404).send("bad request");
	}
});

exports.startNewAuction = functions.https.onRequest((req,response)=>{
	//console.log(req);
	const player = req.query.player;
	const user = req.query.user;
	const owner = req.query.owner;
	//console.log("User:"+user);
	if(user==adminUserKey)
	{
		admin.firestore().collection('players').doc(player).get().then(doc=>{
				if(!doc.exists)
				{
					console.log("No player"+player);
					response.status(400).send("no player");
				}
				else {
					var playerObj = doc.data();
					playerObj.owner = owner;
					playerObj.state ="new";
					playerObj.bidPrice = 5;
					playerObj.updatedAt = admin.firestore.FieldValue.serverTimestamp();
					admin.firestore().collection('results').doc('currentPlayer').set(playerObj).then(
						function(ref){response.status(201).send("Started");}).catch(
							function(err){console.log(err);response.status(400).send("error");});
				}
		});
	}
	else {
		response.status(404).send("bad request");
	}
});

exports.bidAction = functions.https.onCall((data,context)=>{
	var update = {};
	update.price = data.price;
	update.owner = data.owner;
	update.lastUpdate = data.lastUpdate;
	update.state = data.state;
	update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
	return admin.firestore().collection("results").doc('currentPlayer').update(update);
});
