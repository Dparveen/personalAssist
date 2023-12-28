const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var os = require("os");
// npm i express os http socket.io mysql firebase-admin crypto agora-access-token apn uuid
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mysql = require('mysql');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole} = require('agora-access-token')
var apn = require("apn");
const {v4 : uuidv4} = require('uuid')
const otpGenerator = require('otp-generator')
var config = require("./config.json");
var tambola = require('./tam');
const cron = require('node-cron');
const axios = require('axios');
//import myJson from './example.json' assert {type: 'json'};

/// START chat message user status
const STATUS_UNRECEIVED=1;
const STATUS_RECEIVED=2;
const STATUS_UNREAD=3;
const STATUS_READ=4;
const STATUS_DELETED=0;

/// END chat message user status

/// START main chat message status
const CURRENT_STATUS_SEND=1;
const CURRENT_STATUS_DELIVERED=2;
const CURRENT_STATUS_SEEN=3;
/// END chat message user status


/// START chatt room user
const CHAT_ROOM_USER_STATUS_ACTIVE=10;
const CHAT_ROOM_USER_STATUS_REMOVED=2;
const CHAT_ROOM_USER_STATUS_LEFT=3;

/// END chat message user status

const CHAT_ROOM_TYPE_PRIVATE=1;
const CHAT_ROOM_TYPE_GROUP=2;

const COMMON_NO=0;
const COMMON_YES=1;


const STATUS_LIVE_CALL_ONGOING=1;
const STATUS_LIVE_CALL_COMPLETED=2;


const STORAGE_URL = config.storageUrl;


let db;
var hostname = os.hostname();
console.log(hostname);
var serviceAccount;
if(hostname =='DESKTOP-MRLV3Q3'){ // localhost
  

  db = mysql.createConnection({
    host: config.db.dev.host,
    user: config.db.dev.user,
    password: config.db.dev.password,
    database: config.db.dev.database,
  });
   //serviceAccount = require("E:/wamp64/www/media_selling/chat/serviceAccountKey.json");
  
}else{ // live
    
  db = mysql.createConnection({
    host: config.db.live.host,
    user: config.db.live.user,
    password: config.db.live.password,
    database: 'personalAssist'
  });
  
   //serviceAccount = require("/var/www/html/fwdtechnology.co/media_selling/chat/serviceAccountKey.json");
  
}

serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.pushNotification.databaseURL
});


// Log any errors connected to the db
db.connect(function(err){
  if (err) console.log(err)
})

app.use(bodyParser.urlencoded({ extended: false }));

// Parse application/json
app.use(bodyParser.json());

app.get('/', (req, res) => {
console.log("working");
  res.sendFile(__dirname + '/index.html');
});


app.post('/login', (req, res) => {
console.log("working", req.body);

let sql = 'SELECT * FROM tbl_admin WHERE email=? and password=?';
		db.query(sql, [req.body.email, req.body.password], function (err, admin, fields) {
        	if(err) console.log(err)
        	else{
            if(admin.length>0){
            	res.send(admin[0]);
            }else{
            	res.send({status:false, mas:'User not found'});
            }
            }
        })


});


app.get('/agora-tokan', (req, res) => {


  var currentTime =new Date().getTime();
  var currentTimeStr = currentTime.toString();
  var channelString = crypto.createHash('sha256').update(currentTimeStr, 'utf8').digest('hex');
  

    // Rtc Examples
  const appID = config.agora.appId;
  const appCertificate = config.agora.appCertificate;
  
  const channelName = channelString;
  const uid = 0;
  const account = "0";
  const role = RtcRole.PUBLISHER;
  
  const expirationTimeInSeconds = 3600
  
  const currentTimestamp = Math.floor(Date.now() / 1000)
  
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
  
  // IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.
  
  // Build token with uid
  const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
  //console.log("Token With Integer Number Uid: " + tokenA); 
  
  
  res.end(JSON.stringify({ channelName: channelName , token: tokenA}));

});

app.get('/voiptest', (req, res) => {
  
  
  ///let deviceToken = "0484BAE5FB3650AC012A8EA009DE0CAF5C1420DD534D96D0C3687BA8761F59D5" // simple token 
  let deviceToken = "79f2dd9dc247c30e1ab488bf352eb7c88eee0d519d1347fa99453e8ed2d5dcfd" // voip token
  
  
  var options = {
    token: {
      key: config.voipNotification.key,
      keyId: config.voipNotification.keyId,
      teamId: config.voipNotification.teamId

    },
    production: false
  };
   
  var apnProvider = new apn.Provider(options);

  var note = new apn.Notification();

  var id=2;
  var callType =2;
  var username ="Parveen";
  var userImageUrl='skjfksd.jpg';
  var userId =2;
  var channelName="sdfsjhfjsahfjshfjsd";
  var tokenA = "sdjfsjhflkasjfsdfkjsdftokenA";


  const uuid = uuidv4();
  
  var payloadData = {
    id:id,
    callType: callType,
    username: username,
    userImage:userImageUrl,
    callerId :userId,
    channelName:channelName,
    token:tokenA,
    uuid:uuid 
  }
  

 
  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.badge = 3;
  note.sound = "ping.aiff";
  note.alert = "New call";

  //note.payload = {'messageFrom': 'John Appleseed'};
  note.payload = payloadData;
  
  
  note.topic = config.voipNotification.bundleId+".voip";

  apnProvider.send(note, deviceToken).then( (err,result) => {
    console.log(result)
    if(err){ 
          console.log(JSON.stringify(err));
          res.end(JSON.stringify(err));
    } else{
      console.log(JSON.stringify(result))
      res.end(JSON.stringify(result));
     }   
    
    // see documentation for an explanation of result
    //res.end(JSON.stringify({ channelName: 'tess'}));
  });



  

});




// var server = app.listen(4060, listen);



async function isOtp(x) {
    return await otpGenerator.generate(x, { lowerCaseAlphabets: false,upperCaseAlphabets: false, specialChars: false });
};

async function isGame(x) {
    return await otpGenerator.generate(x, { lowerCaseAlphabets: true,upperCaseAlphabets: true, specialChars: false });
};

async function isRef(x) {
    return await otpGenerator.generate(x, { lowerCaseAlphabets: false,upperCaseAlphabets: true, specialChars: false });
};
// This call back just tells us that the server has started


// function listen() {
//   var host = server.address().address;
//   var port = server.address().port;
//   console.log('Example app listening at http://kittyclub.in:' + port);
// }

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Headers", "Content-Type");
        res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
        next();
    });

app.use(express.static('public'));

// WebSocket Portion
// WebSockets work with the HTTP server

// var io = require('socket.io')(server, {
//   pingTimeout: 60000
// });
let time = 90; // 1 hour in seconds

// cron.schedule('* * * * * *', async() => {
//   // Send data to the client every second
  

//   // Convert remaining time to minutes and seconds
//   const minutes = Math.floor(time / 60);
//   const seconds = time % 60;
// let back=0;let control=1;
// 	if(minutes === 0 && seconds <= 30){
//     back=1;
//     }
// 	if(minutes === 0 && seconds <= 30){
//     control=0;
//     }
// // console.log({ minute: minutes, second:seconds, back:back, control:control })
//  io.emit('time', JSON.stringify({ minute: minutes, second:seconds, back:back, control:control }));
//   // console.log(`Remaining Time: ${minutes} minutes ${seconds} seconds`);

//   // Decrement time by 1 second
//   time--;

//   if (time < 0) {
//     // Reset time to 1 hour if it becomes negative
//     time = 90;
//   	let gameid = await isGame(30);
//   // // Create an array with results, including numbers with no amounts
// // // const resultArray = ['j-c', 'j-e', 'j-h', 'j-p', 'q-c', 'q-e', 'q-p', 'q-h', 'k-c', 'k-e', 'k-p', 'k-h']
// 		const availableNumbers = ['j-c', 'j-e', 'j-h', 'j-p', 'q-c', 'q-e', 'q-p', 'q-h', 'k-c', 'k-e', 'k-p', 'k-h'];

// // // Generate a random number array with unique numbers from 0 to 11
// 		const uniqueRandomNumbers = Array.from({ length: 12 }, (_, i) => i);
// 		const shuffledNumbers = uniqueRandomNumbers.sort(() => Math.random() - 0.5);

// // // Create a final array with values assigned from the given array
// 		const finalArray = shuffledNumbers.map((num) => (availableNumbers[num]));
//   // console.log(finalArray[0])
//   		let sql = 'SELECT * FROM tbl_game WHERE status=?';
// 		db.query(sql, [1], function (err, results, fields) {
//         	if(err) console.log(err)
//         	else{
//             // console.log(results)
//             db.query("update tbl_game set status = 0", function (err, results, fields) {if(err)console.log(err)})
//   			sql = "INSERT INTO `tbl_game`(`game_id`) VALUES ("+db.escape(gameid)+")";
//       		db.query(sql, function (err, results) {if (err) throw err;})
            
//             sql = 'SELECT * FROM tbl_bet WHERE game_id=?';
// 			db.query(sql, [results[0].game_id], function (err, bets, fields) {
//         	if(err) console.log(err)
//         	else{
//             // console.log("bets list",bets)
            
//             if(bets.length>0){
//             // console.log(bets)
// //             // Initialize an object to store the sums
// 				const sumByNumber = {};

// // // Iterate over the array and sum amounts by number
// 				bets.forEach((item) => {
//   					const { amount, number } = item;
//   				sumByNumber[number] = (sumByNumber[number] || 0) + amount;
// 				});


//   				const resultArray =finalArray.map((number) => ({ number, amount: sumByNumber[number] || 0 }));
            	
//  				const minAmountObject = resultArray.reduce((min, obj) => (obj.amount < min.amount ? obj : min), { amount: Infinity });
//             	console.log('result arrray', resultArray, 'minimum amount object ',minAmountObject )
// 				// console.log('Number with Minimum Amount:', minAmountObject.number);
//             let sql = 'SELECT * FROM tbl_bet WHERE number=? and game_id=?';
// 			db.query(sql, [minAmountObject.number, results[0].game_id], function (err, users, fields) {
//         	if(err) console.log(err)
//         	else{
 		  		
//     				let resp = {
//     					status:true,
//     					msg:'Result',
//     					result:minAmountObject.number,
//     					myResult:users,
//     					}
//     			// console.log('result',resp);
//     			io.emit('result', JSON.stringify(resp));
//             if(bets.length>0){
            	
//             bets.forEach(function (number, index) {
//             			console.log(number.number, ' result is :  '+minAmountObject.number);
//             			if(number.number === minAmountObject.number){
//                         let sql = 'SELECT * FROM tbl_user WHERE id=?';
// 							db.query(sql, [number.user_id], function (err, single, fields) {
// 							if(err) console.log(err)
// 							else{
//                             	db.query("update tbl_user set wallet = '"+ (single[0].wallet + number.amount*10) +"' WHERE id="+single[0].id, function (err, results, fields) {if(err)console.log(err)})
//                             	sql = "INSERT INTO `tbl_transection`( `token`, `user_id`, `amount`, `p_type`,`des`) VALUES ("+db.escape(single[0].token)+","+db.escape(single[0].id)+","+db.escape(number.amount*10)+","+1+",'bet winning')";
//       							db.query(sql, function (err, results) {if (err) throw err;})
// 								io.to(single[0].socket).emit('myResult', JSON.stringify({msg: 'from socket id', status: true, resp:'You Win the bet !!!'}))
//                             	// io.emit('myResult',  JSON.stringify({msg: 'from io.emit', status: true, resp:'Win'}))
// 							}})
//                         // console.log('yes found', number.amount, )
                        
//                         }else{
                        
//                         let sql = 'SELECT * FROM tbl_user WHERE id=?';
// 							db.query(sql, [number.user_id], function (err, single, fields) {
// 							if(err) console.log(err)
// 							else{
//                         io.to(single[0].socket).emit('myResult', JSON.stringify({msg: 'from socket id', status: false, resp:'You Lose the bet !!!'}))
//                             console.log('not found', number.game_id, number.bet_date,number.user_id)
//                         // io.emit('myResult',  JSON.stringify({msg: 'from io.emit', status: true, resp:'Loose'}))
//                             }
//                             })
//                         }
    						
// 					})
//             }
                        
//             }
            
//             })
//             }else{
            
//             let resp = {
//     					status:true,
//     					msg:'Result',
//     					result:finalArray[0],
//     					myResult:[],
//     					}
//     			console.log('result',resp);
//     			io.emit('result', JSON.stringify(resp));
            
//             }
            
            
//             }
//             })
            
            
//             }
        
//         })
//   }
// });


// cron.schedule('0 0 * * *', async() => {
// 							let sql = 'SELECT * FROM tbl_user WHERE status =?';
// 							db.query(sql, [1], function (err, single, fields) {
// 							if(err) console.log(err)
// 							else{
// 							if(single.length>0){
//                             for(i=0; i<single.length; i++){
// 							db.query("update tbl_user set wallet = '"+ (single[i].wallet + 1000) +"' WHERE id="+single[i].id, function (err, results, fields) {if(err)console.log(err)})
// 							sql = "INSERT INTO `tbl_transection`( `token`, `user_id`, `amount`, `p_type`,`des`) VALUES ("+db.escape(single[i].token)+","+db.escape(single[i].id)+","+db.escape(1000)+","+1+",'Daily Bonus')";
// 							db.query(sql, function (err, results) {if (err) throw err;})
//                             }
// 							}
// 							}
// 							})
// // console.log('herer')
// })





// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection',
  // We are given a websocket object in our function
  function (socket) {
    console.log("We have a new client: " + socket.id);
    // When this user emits, client side: socket.emit('otherevent',some data);
	

socket.on('token', (data) => {
    console.log('Received token and socket for update socket:', data, socket.id);
let sendData ='';
    // Broadcast the location to all connected clients except the sender
	const sql = 'SELECT * FROM tbl_user WHERE token=?';
		db.query(sql, [data], function (err, results, fields) {
  			if (err) {
    // Handle the error
    			console.error(err);
  				} else {
                if(results.length>0){
                db.query("update tbl_user set socket='"+socket.id+"' where token ='"+data+"'", function (err, results, fields) {if(err)console.log(err)})
                const sql = 'SELECT * FROM tbl_user WHERE token=?';
				db.query(sql, [data], function (err, results, fields) {
                		if (err) {
    						console.error(err);
  						}
            			sendData = {
      						status: true,
      						msg: "User List",
      						elements: results
    					}
                })
            }else{
            sendData = {
      			status: false,
      			msg: "User not found",
    			}
            }
    		io.to(socket.id).emit('token', JSON.stringify(sendData));
  			}
		});
  });
      socket.on('checkUser', (data) => {
      console.log("hsdjhkdsj",data)
      var sendData = '';
      	// const sql = 'SELECT tbl_game_join.user_id, tbl_game_join.ticket_id, tbl_game_join.user_type, tbl_game_join.game_id, user.username, user.device_token, user.image FROM tbl_game_join INNER JOIN user ON tbl_game_join.user_id = user.id WHERE tbl_game_join.game_id = ?';
      	const sql = 'SELECT * FROM tbl_user WHERE username=?';
		db.query(sql, [data.username], function (err, results, fields) {
  			if (err) {
    // Handle the error
    			console.error(err);
  				} else {
                if(results.length>0){
    		sendData = {
      			status: true,
      			msg: "User List",
      			elements: results
    			}
            }else{
            sendData = {
      			status: false,
      			msg: "User not found",
    			}
            }
    		io.to(socket.id).emit('checkUser', JSON.stringify(sendData));
    			console.log("checkUser",sendData);
  			}
		});
	})

	
socket.on('Number', async(data) => {
    console.log('Received Number:', data);
	socket.phone = data.phone;
	// var otp = await isOtp(4);
	var otp =1234;
	
	
		const url = "https://getwaysms.com/vendorsms/pushsms.aspx";
		const user = "harshithsr";
		const password = "KFUPYSJ5";
		const sid = "DIOEXX";
		const receiver = data.phone;
		const params = {user: user,password: password,msisdn: receiver,sid: sid,msg: `${otp} Is Your Otp For Dioex Login Otp. Don't Share This Otp With Anyone.`,fl: 0,gwid: 2};
		axios.get(url, { params }).then(response => {console.log(response.data);}).catch(error => {console.error(error);});

	socket.phone = data.phone;
	socket.otp = otp;
	let resp = '';
				db.query("update tbl_phone_verify set status=1 where phone ="+data.phone, function (err, results, fields) {if(err)console.log(err)})
				let sql = "INSERT INTO `tbl_phone_verify`(`phone`, `otp`) VALUES ("+db.escape(data.phone)+","+db.escape(otp)+")";
      				db.query(sql, function (err, results) {
        			if (err) throw err;
                    })
						sql = "SELECT * FROM tbl_user WHERE phone = ?";
        				db.query(sql, [data.phone], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            if(results.length>0 && results[0].ref ===null){
                            resp = {
    							status:false,
    							otp:otp,
    							msg:'Enter Sponcer ID'
    							}
                            }else if(results.length ===0){
                            resp = {
    							status:false,
    							otp:otp,
    							msg:'Enter Sponcer ID'
    							}
                            }else {
                            resp = {
    							status:true,
    							otp:otp,
    							msg:'Sponcr Exist'
    							}
                            }
                            console.log(resp)
                            io.to(socket.id).emit('Number',JSON.stringify(resp));
                            }
  })
});
	 
socket.on('Ref', async (data) => {
    console.log('Received ref:', data);
	var token = await isGame(32);
	let ref='';
	if(data.Ref === ''){ref='admin'}else{ref=data.ref}
	let sql = '';
				sql = "INSERT INTO `tbl_user`(`token`,`phone`,`socket`,`ref`) VALUES ("+db.escape(token)+","+db.escape(data.phone)+","+db.escape(socket.id)+","+db.escape(ref)+")";
      			db.query(sql, function (err, results) {
        		if (err) throw err;
                
                    })
	//// check the user and set the user is present or not with ref
	let resp = {
    status:true,
    msg:'Sponcer inserted',
    }
		io.to(socket.id).emit('Ref',JSON.stringify(resp));
  });


let udata = [];
socket.on('task', async (data) => {
    console.log('Received ref:', data);
	var token = await isGame(10);
data = {
date:data.date,
time:data.time,
task:data.task,
key:token
}
		udata = [...udata, data]
	let resp = {
    status:true,
    msg:'Task Added Succesfull',
    data:udata
    }
		io.to(socket.id).emit('task',JSON.stringify(resp));
  });


socket.on('remove', async (data) => {
    console.log('Received remove:', data);
const keyToRemove = data.key;

udata = udata.filter(item => item.key !== keyToRemove);
	let resp = {
    status:true,
    msg:'Task Added Succesfull',
    data:udata
    }
		io.to(socket.id).emit('remove',JSON.stringify(resp));
  });

socket.on('otp', (data) => {
let resp ='';
    console.log('Received otp:', data);
// 	const sql = "SELECT * FROM tbl_phone_verify WHERE phone = ? and status=0";
// 		db.query(sql, [data.phone], function (err, results, fields) {
//   			if (err) {console.error("error",err);}
//         	else {
//             if(results.length>0){
//             console.log("otp verify request",data, results[0])
//             if(parseInt(data.otp) === results[0].otp){
            
//             const sql = "SELECT * FROM tbl_user WHERE phone = ?";
// 		db.query(sql, [data.phone], function (err, results, fields) {
//   			if (err) {console.error("error",err);}
//         	else {
//             let sts=true;
//             if(results[0].username==null || results[0].username ==''){sts=false}
            		resp = {
    				status:true,
						// data:{
						// userId:results[0].id,
						// token:results[0].token,
						// username:results[0].username,
						// status:sts,
						// },
   						 msg:'OTP Matched',
    				}
//             db.query("update tbl_phone_verify set status=1 where phone ="+data.phone, function (err, results, fields) {if(err)console.log(err)})
            io.to(socket.id).emit('otp',JSON.stringify(resp));
//             }
//         })
//         }else{
        // console.log("otp not matched")
    				// resp = {
    				// status:false,
    				// msg:'OTP not matched',
    				// }
    				// io.to(socket.id).emit('otp',JSON.stringify(resp));
//             }
            
//             }
//         }
//         });
});

socket.on('Profile', (data) => {
    console.log('Received Profile:', data);
    db.query("update tbl_user set `status`=1, `f_name`="+db.escape(data.fname)+", `l_name`= "+db.escape(data.lname)+",`username`="+db.escape(data.username)+" where token ='"+data.token+"'", function (err, results, fields) {if(err)console.log(err)})
	let resp = {
    status:true,
    msg:'Profile Updated Successfully'
    }
		io.to(socket.id).emit('Profile',JSON.stringify(resp));
	
	const sql = "SELECT * FROM tbl_user WHERE token = ?";
		db.query(sql, [data.token], function (err, results, fields) {
  			if (err) {
    // Handle the error
    			console.error("error",err);
  				} else {
                	
                	const sql = "SELECT * FROM tbl_user WHERE username = ?";
		db.query(sql, [results[0].ref], function (err, sponcer, fields) {
  			if (err) {
    // Handle the error
    			console.error("error",err);
  				} else {
                	db.query("update tbl_user set `wallet`="+db.escape(sponcer[0].wallet + parseInt(5000))+" where id ="+sponcer[0].id, function (err, results, fields) {if(err)console.log(err)})
                	var sql = "INSERT INTO `tbl_transection`(`user_id`, `token`, `amount`, `p_type`, `des`) VALUES ("+db.escape(sponcer[0].id)+", "+db.escape(sponcer[0].token)+","+db.escape(5000)+", 1 ,'Referal Income' )";
					db.query(sql, function (err, results) {if (err) throw err;})
                }
        })
                	
                	
                
                }
        })

  });

    socket.on('login',
      async function(data) {
        var otp = await isOtp(4);
        socket.phone = data.phone;
        socket.otp = otp;
    	console.log(data)
    let resp="";
        const sql = "SELECT * FROM tbl_user WHERE phone = ?";
		db.query(sql, [data.phone], function (err, results, fields) {
  			if (err) {
    // Handle the error
    			console.error("error",err);
  				} else {
                
//                 var sql = "INSERT INTO `tbl_phone_verify`(`phone`, `otp`) VALUES ("+db.escape(data.phone)+","+db.escape(otp)+")";
//       				db.query(sql, function (err, results) {
//         			if (err) throw err;
//                     })
//                 if(results.length === 0 ){
//                 var sql = "INSERT INTO `tbl_user`(`phone`,`socket`) VALUES ("+db.escape(data.phone)+","+db.escape(socket.id)+")";
//       				db.query(sql, function (err, results) {
//         			if (err) throw err;
                    
                    resp = {
							otp: otp,
							status:false
							}
					io.to(socket.id).emit('login',JSON.stringify(resp));
                    
                    // })
                
//                 }else{
                	
//                 	const sql = "SELECT * FROM tbl_user WHERE phone = ?";
//         				db.query(sql, [data.phone], function (err, results, fields) {
//             			if (err) {
//                 			console.error("error",err);
//                 			} else {
                            
//                             if(results[0].ref ===null){
//                             	resp = {
// 									otp: otp,
// 									ref:'',
// 									status:false
// 								}
//                                 }else{
//                                 resp = {
// 									otp: otp,
// 									ref:results[0].ref,
// 									status:true
// 								}
//                                 }
                                
// 								io.to(socket.id).emit('ret',resp);
//                 			}
//                 })
//   			}
                }
		});
		});











socket.on('viewProfile', (data) => {
    console.log('Received profileView:', data);
    // Broadcast the location to all connected clients except the sender
    // socket.emit('some_event', data);
	
	const sql = "SELECT * FROM tbl_user WHERE token = ?";
        				db.query(sql, [data.token], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            if(results.length>0){
                            
                            	let resp = {
    									status:true,
    									msg:'Profile found Successfully',
    									userdetails:[{fname:results[0].f_name,lname:results[0].l_name,sponcer_id:results[0].ref,user_id:results[0].id,ref_earning:100,username:results[0].username}]
                                		}
								io.to(socket.id).emit('viewProfile',JSON.stringify(resp));
                            }else{
                            	let resp = {
    								status:false,
    								msg:'Authauntication token failed',
    									}
                            	io.to(socket.id).emit('viewProfile',JSON.stringify(resp));
                            }
                           
                            }
                        })
  });

socket.on('wallet', (data) => {
    console.log('Received wallet:', data);
let wallet = 0;
    // Broadcast the location to all connected clients except the sender
    // socket.emit('some_event', data);
let sql = "SELECT * FROM tbl_user WHERE token = ?";
        				db.query(sql, [data.token], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            if(results.length>0){ wallet= results[0].wallet;
	sql = "SELECT * FROM tbl_transection WHERE token = ?";
        				db.query(sql, [data.token], function (err, statement, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            if(statement.length>0){
                            
                            	let resp = {
                                		amount:wallet,
    									status:true,
    									msg:'Transections',
    									statement:statement,
                                		}
                                console.log(results)
								io.to(socket.id).emit('wallet',JSON.stringify(resp));
                            }else{
                            	let resp = {
                                		amount:wallet,
    									status:true,
    									msg:'Transections',
    									statement:statement,
                                		}
                            	io.to(socket.id).emit('wallet',JSON.stringify(resp));
                            }
                           
                            }
                        })
                                                }
                            }})
		
  });




socket.on('kyc', (data) => {
    console.log('Received Kyc:', data);
   

	const sql = "SELECT * FROM tbl_user WHERE token = ?";
        				db.query(sql, [data.token], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            const sql = "SELECT * FROM tbl_kyc WHERE token = ?";
        				db.query(sql, [data.token], function (err, user, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            if(user.length>0){
                            let resp = {
    										status:true,
    										msg:'Kyc already exixt if want to edit then contact admin'
    										}
									io.to(socket.id).emit('kyc',JSON.stringify(resp));
                            
                            }else{
                            	var sql = "INSERT INTO `tbl_kyc`(`user_id`, `token`, `account_holder`, `account_number`, `ifsc`, `upi`, `wallet_address`) VALUES ("+db.escape(results[0].id)+", "+db.escape(data.token)+","+db.escape(data.account_holder)+","+db.escape(data.account_number)+","+db.escape(data.ifsc)+","+db.escape(data.upi)+","+db.escape(data.wallet_address)+")";
      										db.query(sql, function (err, results) {if (err) throw err;})

									let resp = {
    										status:true,
    										msg:'Kyc Updated Successfully'
    										}
									io.to(socket.id).emit('kyc',JSON.stringify(resp));
                            
                            }
                            
                            }})

                            }
                        })
  });

socket.on('kyc_check', (data) => {
    console.log('Received Kyc check:', data);
   

	const sql = "SELECT * FROM tbl_user WHERE token = ?";
        				db.query(sql, [data.token], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            const sql = "SELECT * FROM tbl_kyc WHERE token = ?";
        				db.query(sql, [data.token], function (err, user, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            if(user.length>0){
                            let resp = {
    										status:true,
    										msg:'Kyc already exixt if want to edit then contact admin'
    										}
									io.to(socket.id).emit('kyc_check',JSON.stringify(resp));
                            
                            }else{
									let resp = {
    										status:false,
    										msg:'Kyc Updated Successfully'
    										}
									io.to(socket.id).emit('kyc_check',JSON.stringify(resp));
                            
                            }
                            
                            }})

                            }
                        })
  });

socket.on('withdrawal', (data) => {
    console.log('Received withdrawl:', data);

   	sql = "SELECT * FROM tbl_user WHERE token = ?";
        				db.query(sql, [data.token], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            if(results.length >0){
                            	
                            	if(results[0].wallet >= parseInt(data.amount)){
									console.log(results[0].wallet, data.amount, (results[0].wallet- parseInt(data.amount)))
                                		db.query("update tbl_user set `wallet`="+(results[0].wallet- parseInt(data.amount))+" where token ='"+data.token+"'", function (err, results, fields) {if(err)console.log(err)})
                                		var sql = "INSERT INTO `tbl_withdrawal`(`user_id`, `token`, `amount`) VALUES ("+db.escape(results[0].id)+", "+db.escape(data.token)+","+db.escape(data.amount)+")";
								      	db.query(sql, function (err, results) {if (err) throw err;})
                                		
                                		var sql = "INSERT INTO `tbl_transection`(`user_id`, `token`, `amount`, `p_type`, `des`) VALUES ("+db.escape(results[0].id)+", "+db.escape(data.token)+","+db.escape(data.amount)+", 0 ,'Withdrawl Request' )";
								      	db.query(sql, function (err, results) {if (err) throw err;})
                                		
                                let resp = {
    								status:true,
    								amount: (results[0].wallet- parseInt(data.amount)),
    								msg:'withdrawal successfull'
    									}
									io.to(socket.id).emit('withdrawal',JSON.stringify(resp));
                                }else{
                                
                                let resp = {
    								status:false,
    								amount: data.amount,
    								msg:'Low wallet Balance'
    									}
									io.to(socket.id).emit('withdrawal',JSON.stringify(resp));
                                }
                            	
                            }else{
								
                            		let resp = {
    								status:false,
    								amount: data.amount,
    								msg:'Auth failed'
    								}
								io.to(socket.id).emit('withdrawal',JSON.stringify(resp));
                            }
                            
                            }
                        })
  });


socket.on('deposit', (data) => {
    console.log('Received deposit:', data);
   

	const sql = "SELECT * FROM tbl_user WHERE token = ?";
        				db.query(sql, [data.token], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            if(results.length >0){
                            
                            var sql = "INSERT INTO `tbl_deposit`(`user_id`,`token`,  `amount`, `utr`, `p_type`, `p_date`) VALUES VALUES ("+db.escape(results[0].id)+", "+db.escape(data.token)+","+db.escape(data.amount)+","+db.escape(data.utr)+","+db.escape(data.p_type)+","+db.escape(data.p_date)+")";
      						db.query(sql, function (err, results) {if (err) throw err;})
                            
                            let resp = {
    							status:true,
    							msg:'Request Send Successfully'
    							}
								io.to(socket.id).emit('deposit',JSON.stringify(resp));
                            }else{
                            let resp = {
    							status:false,
    							msg:'Auth Failed'
    							}
								io.to(socket.id).emit('deposit',JSON.stringify(resp));
                            }
                            }
                        
                        })
  });


socket.on('bet_place', (data) => {
    console.log('Received bet place:', data);
   

	const sql = "SELECT * FROM tbl_user WHERE token = ?";
        				db.query(sql, [data.token], function (err, users, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            if(users[0].id !== null && users[0].id !== undefined && users[0].wallet >= parseInt(data.amount)){
						const sql = "SELECT * FROM tbl_game WHERE status = ?";
        				db.query(sql, [1], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            
                            var sql = "INSERT INTO `tbl_bet`( `user_id`, `game_id`, `amount`, `number`) VALUES ("+db.escape(users[0].id)+", "+db.escape(results[0].game_id)+","+db.escape(data.amount)+","+db.escape(data.betOn)+")";
      						db.query(sql, function (err, results) {if (err) throw err;})
                            
                            var sql = "INSERT INTO `tbl_transection`(`user_id`, `token`, `amount`, `p_type`, `des`) VALUES ("+db.escape(users[0].id)+", "+db.escape(data.token)+","+db.escape(data.amount)+", 0 ,'Bet Placed' )";
								      	db.query(sql, function (err, results) {if (err) throw err;})
                            
                            
                            db.query("update tbl_user set `wallet`="+(users[0].wallet- parseInt(data.amount))+" where token ='"+data.token+"'", function (err, results, fields) {if(err)console.log(err)})
                            let resp = {
    										status:true,
    										msg:'Bet Placed Successfully'
    									}
								io.to(socket.id).emit('bet_place',JSON.stringify(resp));
                            }
                        
                        
                        })
                            }else{
                            	
                            if( users[0].wallet <= parseInt(data.amount)){
                            		let resp = {
    										status:false,
    										msg:'Low wallet amount'
    									}
								io.to(socket.id).emit('bet_place',JSON.stringify(resp));
                            }else{
                            	let resp = {
    										status:false,
    										msg:'Auth failed'
    									}
								io.to(socket.id).emit('bet_place',JSON.stringify(resp));
                            }                            	
                            }
                        }
                        
                        })

  });




// function convertSecondsToMinutesAndSeconds(seconds) {
//   const minutes = Math.floor(seconds / 60);
//   const remainingSeconds = seconds % 60;

//   return {
//     minutes: minutes,
//     seconds: remainingSeconds,
//   };
// }

// cron.schedule('* * * * * *', () => {

// 	const result = convertSecondsToMinutesAndSeconds(time);
//   // console.log('running every sec');
// 	io.emit('time', { minute: result.minutes, second: result.seconds });
// 	console.log(`Minutes: ${result.minutes}, Seconds: ${result.seconds}`);
// 	if(time=== 0 ){
    
//     let resp = {
//     status:true,
//     msg:'wait for game result',
//     result:'k-c',
//     myResult:[1,2,4,5],
//     }
//     console.log('result'+ resp);
//     io.emit('result', resp)
    
//     time = 100;
//     }else{
//     time --;
//     }
// });














// socket.on('some_event', (data) => {
//     console.log('Received location:', data);
//     // Broadcast the location to all connected clients except the sender
//     socket.broadcast.emit('some_event', data);
//   });



// socket.on('sendLocation', (data) => {
//     console.log('Received location:', data);
//     // Broadcast the location to all connected clients except the sender
//     socket.broadcast.emit('receiveLocation', data);
// 	socket.broadcast.emit('userList',[1,2,3])
//   });
// let udata=[];
// let sdata='';
// socket.on('location', (data) => {
//     // Broadcast the location to all connected clients
// 	console.log('recieved data', data)
// sdata = {socket:socket.id, latitude:data.latitude, longitude:data.longitude}
//     socket.broadcast.emit('locationUpdate', sdata);
// 	udata = [...udata, sdata]
// 	io.emit('userList', udata);
//   });

// socket.on('initialLocation', (data) => {
//     console.log('Initial Location received:', data);
//     // Handle initial location, e.g., store in a list of users
//     // Broadcast the updated list of users to all connected clients

// 						let sql = "SELECT * FROM tbl_nearme WHERE socket = ?";
//         				db.query(sql, [socket.id], function (err, results, fields) {
//             			if (err) {
//                 			console.error("error",err);
//                 			} else {
//                             	if(results.length ===0){
//                                 sql = "INSERT INTO `tbl_nearme`(`socket`, `longitude`, `lati`, `os`, `altitude`, `accuracy`) VALUES (" + db.escape(socket.id) + "," + db.escape(data.longitude) + "," + db.escape(data.latitude) + "," + db.escape(data.os) + "," + db.escape(data.altitude) + "," + db.escape(data.accuracy) + ")";
//       							db.query(sql, function (err, results) {if (err) throw err;	})
//                                 }else{
//                                 db.query("update tbl_nearme set longitude='"+data.longitude+"', lati='"+data.latitude+"', os='"+data.os+"', altitude='"+data.altitude+"', accuracy='"+data.accuracy+"' where socket ='"+socket.id +"' and status=1", function (err, results, fields) {if(err)console.log(err)})
//                                 }
//                       	sql = "SELECT * FROM tbl_nearme WHERE status = 1";
//         				db.query(sql, [socket.id], function (err, results, fields) {
//             			if (err) {console.error("error",err);}
//                         else {io.emit('userList', results);} })
//                             }
//                         })
//   });

//   socket.on('updateLocation', (data) => {
//     console.log('Updated Location received:', data);
// 						let sql = "SELECT * FROM tbl_nearme WHERE socket = ?";
//         				db.query(sql, [socket.id], function (err, results, fields) {
//             			if (err) {
//                 			console.error("error",err);
//                 			} else {
//                             	if(results.length ===0){
//                                 sql = "INSERT INTO `tbl_nearme`(`socket`, `longitude`, `lati`) VALUES (" + db.escape(socket.id) + "," + db.escape(data.longitude) + "," + db.escape(data.latitude) + ")";
//       							db.query(sql, function (err, results) {if (err) throw err;	})
//                                 }else{
//                                 db.query("update tbl_nearme set longitude='"+data.longitude+"', lati='"+data.latitude+"' where socket ='"+socket.id +"' and status=1", function (err, results, fields) {if(err)console.log(err)})
//                                 }
//                       	// sql = "SELECT * FROM tbl_nearme WHERE status = 1";
//                             sql = "SELECT * FROM tbl_nearme";
//         				db.query(sql, [socket.id], function (err, results, fields) {
//             			if (err) {console.error("error",err);}
//                         else {io.emit('updateLocation', results);
//                         	  function calculateDistance(lat1, lon1, alt1, lat2, lon2, alt2) {
//   const R = 6371; // Earth radius in kilometers

//   // Convert latitude and longitude from degrees to radians
//   const lat1Rad = (lat1 * Math.PI) / 180;
//   const lon1Rad = (lon1 * Math.PI) / 180;
//   const lat2Rad = (lat2 * Math.PI) / 180;
//   const lon2Rad = (lon2 * Math.PI) / 180;

//   // Differences in coordinates
//   const dLat = lat2Rad - lat1Rad;
//   const dLon = lon2Rad - lon1Rad;
//   const dAlt = alt2 - alt1;

//   // Haversine formula
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   // Distance in kilometers, considering altitude
//   const distance = R * c + Math.abs(dAlt);

//   return distance;
// }

// function isWithinRange(lat1, lon1, alt1, lat2, lon2, alt2, range) {
//   const distance = calculateDistance(lat1, lon1, alt1, lat2, lon2, alt2);
//   return distance <= range;
// }
//                               const range = 0.1; // 100 meters
// 								for(let i=0; i<results.length; i++){
// 									if (isWithinRange(data.latitude, data.longitude, data.altitude, results[i].lati, results[i].long, results[i].altitude, range)) {
//   										console.log('User '+ i +' is within 100 meters of User 1');
// 									} else {
//   										console.log('User '+ i +' is outside the 100 meters range of User 1');
// 									}
//                              	}
                             
//                              }
//                         })
//                             }
//                         })
    
//   });




	socket.on('ref',
      async function(data) {
    	let resp ="";
    
        console.log(data, socket.id)
    	const sql = "SELECT * FROM tbl_user WHERE username = ?";
        				db.query(sql, [data.ref], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            console.log(results)
								if(results.length === 0){
                                if(data.ref === 'admin' || data.ref==='Admin'){
                                	db.query("update tbl_user set socket='"+socket.id+"', ref='"+data.ref+"' where phone ="+data.phone, function (err, results, fields) {
                                    if(err)console.log(err)
                      					})
                                	socket.ref=data.ref;
                                	resp = {
        							ref: data.ref,
        							msg:"Sponcer found",
        							status:true
        							}
                                }else{
                            	resp = {
        							ref: data.ref,
        							msg:"Sponcer is not found",
        							status:false
        							}
                                }}else{
                                db.query("update tbl_user set socket='"+socket.id+"', ref='"+data.ref+"' where phone ="+data.phone, function (err, results, fields) {
                                if(err)console.log(err)
                      					})
                                	socket.ref=data.ref;
                                	resp = {
        							ref: data.ref,
        							msg:"Sponcer found",
        							status:true
        							}
                                }
                                
								io.to(socket.id).emit('ref',JSON.stringify(resp));
                			}
                })
    
      }
    );

    socket.on('verify',
      function(data) {
    let resp = '';
     console.log(data,'otp vwrify request')
    	const sql = "SELECT * FROM tbl_phone_verify WHERE phone = ? and otp=? and status=?";
        				db.query(sql, [data.phone, data.otp, 0], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                // console.log(data, socket.id)
                            if(results.length===0){
               						resp = {
                  						status: false,
                  						msg:'OTP is not match. Try again with a different one',
                						}
                            }else{
                            db.query("update tbl_phone_verify set status=1 where phone ="+data.phone, function (err, results, fields) {
                                if(err)console.log(err)
                      					})
                            db.query("update tbl_user set socket='"+socket.id+"', status=1 where phone ="+data.phone, function (err, results, fields) {
                                if(err)console.log(err)
                      					})
                            let user = false;
                            const sql = "SELECT * FROM tbl_user WHERE phone = ?";
        				db.query(sql, [data.phone], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            	if(results[0].username !== null){
                                	resp = {
                  						status: true,
                                    	user:true,
                                    	info:results[0],
                  						msg:'Welcome to you in kitty club',
                  						phone:results[0].phone
               					 		}
                                }else{
                                	resp = {
                  						status: true,
                                    	user:false,
                  						msg:'Welcome to you in kitty club',
                  						phone:results[0].phone
               					 		}
                                }
                            console.log(resp)
                            io.to(socket.id).emit('verify',JSON.stringify(resp));
                            }})
                            		
                            }
            }
      }
    );
    });

	socket.on('checkUsername', async function(data) {
    let resp = '';
    let check = data.split(' ')
    if(check.length>1){
    resp={
    status:false,
    msg:'Please remove the space from username'
    }
    console.log("space found", data)
    io.to(socket.id).emit('checkUsername',JSON.stringify(resp));
    }else{
    					const sql = "SELECT * FROM tbl_user WHERE username = ?";
        				db.query(sql, [data], function (err, results, fields) {
            			if (err) {
                			console.error("error",err);
                			} else {
                            if(results.length===0){
                            	resp={
    								status:true,
    								msg:'username is valid'
    								}
                            console.log('username is valid')
                            }else{
                            	resp={
    								status:false,
    								msg:'username is already used'
    								}
                            console.log('username is invalid')
                            }
                            io.to(socket.id).emit('checkUsername',JSON.stringify(resp));
                            }
                        })
    }
    })

	socket.on('prereg', async function(data) {
    console.log(data, socket.id)
    let user = true;
    let rdata='';
    
    db.query("update tbl_user set socket='"+socket.id+"', username="+db.escape(data.username)+", f_name="+db.escape(data.firstname)+", l_name="+db.escape(data.lastname)+" where phone ="+db.escape(data.phone), function (err, results, fields) {
                                if(err)console.log(err)
    							else{
                                const sql = "SELECT * FROM tbl_user WHERE username = ?";
                        			db.query(sql, [data.username], function (err, results, fields) {
                        			if (err) {console.error("error",err);}
                                    else {
                                    console.log(results[0])
                                			io.to(socket.id).emit('prereg', JSON.stringify({status:true,mag:'Welcome to you in KittyClub !!!...',data:results[0]}))
                                		}
                                    })
                                }
                      					})
    });


	socket.on('welcome', async function(data) {
      if(socket.phone === data.phone) {
        // console.log(data)
        page='index.html'
      }else{
        // console.log(data)
        page='login.html'
      }
      var data = {
        page:page
      }
      io.to(socket.id).emit('loggedin', data);
      // fetch the response from the server and database
    });

    socket.on('joinGame', async function(room) {
      socket.join(room.game);
      resp = {
        status: 'success',
        msg:"Some One enter the room"
      }
      io.to(room.game).emit("joinGame",resp);
      console.log(room);
    });
    
    socket.on('leaveGame', async function(room) {
      socket.leave(room.game);
      resp = {
        status: 'success',
        msg:"Some One leave the room"
      }
      io.to(room.game).emit("leaveGame", resp);
      console.log(room);
    });
	
	const sendNotification = (room, notification, delay, numbers) => {
    	for (let i = 0; i < numbers.length; i++) {
      		setTimeout(() => {
      			let respData = {success:true, msg:'Game Started', previousNumber: numbers[i-1] || '?', currentNumber:numbers[i], currentPosition:i}
        		io.to(room).emit('requestNumber',respData);
      			console.log(respData)
      		}, i * delay);
    	}
  	};

  // Send 90 notifications with a 5-second delay between each
  socket.on('startGame', (room ) => {
  	let number = tambola.getDrawSequence();
  	let numbers = number.join();
  	socket.join(room.game)
  	// var sql = "INSERT INTO tbl_tambola_number (`game_id`, `user_id`, `game_number`, `start_time`, `status`) VALUES ("+db.escape(room.game_id)+","+db.escape(room.user_id)+","+db.escape(numbers)+","+Date.now()+",1)";
  	// db.query(sql, function (err, results) {
  	// if (err) throw err;
  	// })
  	// console.log(numbers, number)
    sendNotification(room.game,'Game Started', 5000, number);
  });

    socket.on('disconnect', function() {
      console.log("Client has disconnected"+ socket.id);
    });
  }
);




//     socket.on('sendNotificationTest', (data) => {
//       console.log('typing')
      
//       // This registration token comes from the client FCM SDKs.
//     const registrationToken = 'eUzWru_LqrDO28TPywKTj5:APA91bFKpKN6qy6q3IXgO8Mkxy7bf22CrUO7mqyddT_MwKXLw4YHkaGrxkU03e1suVMwSGlV4cn9ek8ziM7Y1Rkv-lz3x5ZymzbLg6FsbgAuSRvPOJGsnh9TEKWSVTQ-ZY8pOVqSHAl4';
//     //const registrationToken = 'fwKUWuzH3UehqKs-TdXET-:APA91bHr6n_xhPqEcNrQKaz_g6R2FI495jA7d-5kVDsIQBMVbUNATefeL6Sj8fmW48WgVApyzuvWFKS32BThsXujfDEXRGARcnxfoBgNQX0zRA7tKIhKo4dRSrepcOkQXWu2mwVm444Y';
    

//     const message = {
//       data: {
//         score: '8520',
//         time: '2:43'
//       },
//       token: registrationToken
//     };

//     // Send a message to the device corresponding to the provided
//     // registration token.
//     admin.messaging().send(message)
//       .then((response) => {
//         // Response is a message ID string.
//         console.log('Successfully sent message:', response);
//       })
//       .catch((error) => {
//         console.log('Error sending message:', error);
//       });
        
//     });




  function getMessageBody(data){
    /*
    case MessageContentType.text:
      return 1;
    case MessageContentType.photo:
      return 2;
    case MessageContentType.video:
      return 3;
    case MessageContentType.audio:
      return 4;
    case MessageContentType.gif:
      return 5;
    case MessageContentType.sticker:
      return 6;
    case MessageContentType.contact:
      return 7;
    case MessageContentType.location:
      return 8;
    case MessageContentType.reply:
      return 9;
    case MessageContentType.forward:
      return 10;
    case MessageContentType.post:
      return 11;
    case MessageContentType.story:
      return 12;*/
   
   // messageData = JSON.parse(messageData);
    var response={};

    var messageString='';
    response['messageString']='';
    response['image']='';
    
    //console.log(data);
   // console.log(messageData.messageType);
    var messageType=data.messageType;
   // console.log(messageType);
    if(messageType==1){
      response['messageString'] =data.message;

      

    }else if(messageType==2){
      response['messageString'] ='Sent an image';
     // response['image'] =data.message.image;

    }else if(messageType==3){
      response['messageString'] ='Sent a video';
    }else if(messageType==4){
      response['messageString'] ='Sent and audio';
    }else if(messageType==5){
      response['messageString'] ='Sent a gif file';
    }else if(messageType==6){
      response['messageString'] ='Sent a stiker';
    }else if(messageType==7){
      response['messageString'] ='Shared the contact';
    }else if(messageType==8){
      response['messageString'] ='Shared the location';
    }else if(messageType==9){
        var jsonMessageData = JSON.parse(data.message);
       // console.log('message under reply',jsonMessageData);
        var bodyResponse = getMessageBody(jsonMessageData.reply);
        var body = bodyResponse['messageString'];
        //response['messageString'] ='Sent reply';
        response['messageString'] =body;
    }else if(messageType==10){
      response['messageString'] ='forword the message';
    }else if(messageType==11){
      response['messageString'] ='Sent a  post';
    }else if(messageType==12){
      response['messageString'] ='Sent a story';
    }else if(messageType==13){
      response['messageString'] ='Sent a drawing';
    }else if(messageType==14){
      response['messageString'] ='Sent a profile';
    }else if(messageType==15){
      response['messageString'] ='Sent a group';
    }else if(messageType==16){
      response['messageString'] ='Sent a file';
    }else if(messageType==20){
      response['messageString'] ='Reacted on your message';
    }else{
      response['messageString'] ='Sent a message';
    }


    return response;





  }

  
  function sendPushNotification(deviceToken,dataPush) {

    /*"data": {
      "title": data.title,
      "body": data.body,
      "notification_type": '100',
      "room":data.room.toString(),
      "sound" 		:  "default",
      "content_available":  "true",
      "priority": "high"
      
     
    },*/

    dataPush["sound"]               = "default";
    dataPush["content_available"]   = "true";
    dataPush["priority"]            = "priority";


    console.log(dataPush.body);

    var body = dataPush.body;
   
    if(body.length > 100){

      body = body.substring(0,100);
    }
    dataPush["body"]            = body



    var message = {
      
      "notification":{
        "title":dataPush.title,
        "body":body
        
      },
      "data":dataPush,
      token: deviceToken
      
    };
    console.log(message);

    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
      .then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
    
    

  }

  function sendIosVoipPushNotification(deviceToken,data) {
    console.log(data)

    //let deviceToken = "79f2dd9dc247c30e1ab488bf352eb7c88eee0d519d1347fa99453e8ed2d5dcfd" // voip token
    var options = {
      token: {
        key: config.voipNotification.key,
        keyId: config.voipNotification.keyId,
        teamId: config.voipNotification.teamId
      },
      production: false
    };
     
    var apnProvider = new apn.Provider(options);
    var note = new apn.Notification();
   
    note.expiry = Math.floor(Date.now() / 1000) + 60; // Expires 60 sec. from now. //3600 = 1 hrs
    note.badge = 1;
    note.sound = "ping.aiff";
    note.alert = "New call";
  
    //note.payload = {'messageFrom': 'John Appleseed'};
    note.payload = data;
    
    note.topic = config.voipNotification.bundleId+".voip";
  
    apnProvider.send(note, deviceToken).then( (err,result) => {
      console.log(result)
      if(err){ 
            console.log(JSON.stringify(err));
           // res.end(JSON.stringify(err));
      } else{
        console.log(JSON.stringify(result))
       // res.end(JSON.stringify(result));
       }   
      
      // see documentation for an explanation of result
      //res.end(JSON.stringify({ channelName: 'tess'}));
    });

  }

  function createToken() { //agora token

    var  channelName = uuidv4()
       // Rtc Examples
     const appID = config.agora.appId;
     const appCertificate = config.agora.appCertificate;
     const uid = 0;
     const account = "0";
     const role = RtcRole.PUBLISHER;
     const expirationTimeInSeconds = 3600
     
     const currentTimestamp = Math.floor(Date.now() / 1000)
     
     const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
     
     // IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.
     
     // Build token with uid
     const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);

     return {"channelName":channelName,"token":tokenA};
//     


  }


server.listen(4071, () => {
  console.log('listening on *:'+4071);
});