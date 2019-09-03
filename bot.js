/**

	 Discord Bot that interacts with Google Sheets by Aidan Mitchell (AMitchell)

	 v 1.0

	 <!> Please read the Preface before you contact me! </!>
	 Contact: email: 	mitchellaidan2@gmail.com		|		discord: AMitchell#6193		|		bit.ly/aidanssiteofstuff


	 Preface:

	 		Please visit these sites to get a better undersanding of what is going on.
					> https://developers.google.com/sheets/api/quickstart/nodejs
					> https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#request

			Throughout the process, I did my best to call a Spreadsheet a "spread" and to call a sheet within a spread a "sheet,"
					however, I may have not done that at all times, especially in the code. Use common sense and surrounding code to
					make an inference on which meaning was intended.

			Sample Google Spreadsheet URL:
					> https://docs.google.com/spreadsheets/d/1jsAcLzr063rmD29b6vtEVVmG_WLPabSsllk1rzNKw/edit#gid=0

					The spreadID or speadsheetIDConst is the string between the "/d/" and the "edit#gid=":
						> 1jsAcLzr063rmD29b6vtEVVmG_WLPabSsllk1rzNKw

					The sheetId or specifc sheet inside of the spread is the number following "edit#gid=":
						> 0

			Sample Google Sheet Format:
	        | 0 | 1 | 2 | 3 | 4
				--|---|---|---|---|--
				0 |   |   |   |   |
				--|---|---|---|---|--
				1 |   |   |   |   |
				--|---|---|---|---|--
				2 |   |   |   |   |
				--|---|---|---|---|--
				3 |   |   |   |   |
				--|---|---|---|---|--
				4 | A |   |   |   |

				Google Sheets is Row-Major, meaning that the bottom left space (A) would be:
					> [row,column] = (4,0)


**/




/**

	Required imports for this project, make sure you have these installed!

	Install Node.js and NPM (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm),
	then run the following in Command Prompt to install the requirement:
	npm install <requirement>

	Note: you may not need to do this because the modules are included in the
	project, but I really don't know. Figure it out! Console gives enough info!

	Discord.js:
		> npm install discord.js
	Google:
		> npm install googleapis@39

**/

const config = require('./config.json');


const Discord = require('discord.js');
const bot = new Discord.Client();

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const GoogleAuth = require('google-auth-library');






/**

  Loading Bot config from config.json

**/

// Sheet config constants
const spreadsheetIDConst = config.sheets.spreadsheetIDConst;
const range = config.sheets.range;
var sheetList;
var sheetListIDs;

// Bot config constants
const botID = config.bot.botID;
const presenceName = config.bot.presenceName;
const presenceID = config.bot.presenceID;
const deleteCommands = config.bot.deleteCommands;
const showPresence = config.bot.showPresence;

// Message config constants
const sideColor = config.bot.sideColor;
const showURL = config.bot.showURL;
const showTiggeredBy = config.bot.showTiggeredBy;
const showDescription = config.bot.showDescription;

// Config on the file locations of necessary Google Authentication files
const credentialsFilePath = config.storage.credentialsFilePath;
const tokenFilePath = config.storage.tokenFilePath;

var oAuth2Client;





/**

  Necessary stuff for Google Authentication -- Don't touch unless you know what you are doing!

	*Note: 	You will need to go to https://developers.google.com/sheets/api/quickstart/nodejs and
					click "Enable The Google Sheets API" so that it can authorize you correctly.
					When "token.json" and "credentials.json" and any other files are created,
					move them to the "extra" folder, or where is specified in the config.json.

**/

fs.readFile(credentialsFilePath, (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content));
});

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = tokenFilePath;

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    //callback(oAuth2Client, message);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}






/**

  Our functions for getting data from the spreadsheet,
	if you want to do stuff different from what I have provided,
	then change it here, and not in the commands area!

	Sample functions are provided, edit wisely!

**/


/**
			This function retrieves data from the sheet and then sends it.
**/

function listUserData(auth, message)
{

  var mess = message.content;
  const args = mess.slice(1).trim().split(/ +/g);

  var pages = sheetList;

  if (args.length > 1) // specific coin
  {
    var coin = args[1].toUpperCase();
    if (!pages.includes(coin)) { message.channel.send("Unknown coin! Sending all!"); }
    else { pages = [coin]; }
  }

  for (var page in pages)
  {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetIDConst,
      range: `${pages[page]}!${range}`,
    }, (err, res) => {

      if (err) return console.log('The API returned an error: ' + err);
      const rows = res.data.values;

      if (rows.length)
      {
        var authorTotalName = message.author.username+"#"+message.author.discriminator;

        // Print columns A and E, which correspond to indices 0 and 4.
        rows.map((row) => {
          // console.log(`${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[4]}, ${row[5]}, ${row[6]}`);
          //if (row[0] != authorTotalName) { return; }

          const embed = new Discord.RichEmbed()
          	.setTitle("User data:")
          	.setColor(sideColor);
          	if (showDescription) { embed.setDescription("Returning info for: "+row[0]) }
          	if (showURL) { embed.setURL("https://docs.google.com/spreadsheets/d/1RueC7fxpbSACfzbvrsCRS0RSlEJsmyc3xLv6_d0TNl0/edit") }
          	if (showTiggeredBy) { embed.setFooter("Triggered by: "+message.author.username, message.author.avatarURL) }
          embed.addField('Previous Balance', row[2], true);
          embed.addField('Stake', row[4], true);
          embed.addField('Balance', row[5], true);
          message.channel.send({embed});

        });
      }
      else
      { console.log('No data found.'); }

    });
  }
}



/**
			This function sends a GoogleAPI batchUpdateRequest.

			For more info check out: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#request
**/

function sendRequest(auth, requests, updateSheets)
{
  const sheets = google.sheets({version: 'v4', auth});

  const batchUpdateRequest = {requests};
  sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetIDConst,
    resource: batchUpdateRequest,
  }, (err, response) => {
    if (err) {
      // Handle error
      console.log(err);
    } else {
      //const findReplaceResponse = response.replies[1].findReplace;
      //console.log(response);
    }
  });
}



/**
			This function deletes a row of a sheet.
**/

function deleteRow(auth, message, sheetId, row)
{
  let requests = [];
  // Change the spreadsheet's title.
  requests.push({

    "deleteDimension": {
      "range": {
        "sheetId": sheetId,
        "dimension": "ROWS",
        "startIndex": row,
        "endIndex": row+1
      }
    }

  });

  sendRequest(auth, requests);
}



/**
			This function adds a new sheet to the spread.
**/

function addSheet(auth, message, sheetName)
{
  let requests = [];
  // Change the spreadsheet's title.
  requests.push({

    "addSheet": {
      "properties": {
        "title": sheetName,
        "sheetType": "GRID",
        "gridProperties": {
          "rowCount": 200,
          "columnCount": 200,
          "hideGridlines": false
        },
        "hidden": false,
        "rightToLeft": false
      }
    }

  });

  message.channel.send("Ok! Sheet \""+sheetName+"\" created!");

  sendRequest(auth, requests);
}



/**
			This function deletes a sheet from the spread.
**/

function deleteSheet(auth, message, sheetId, sheetName)
{
  let requests = [];
  // Change the spreadsheet's title.
  requests.push({

    "deleteSheet": {
      "sheetId": sheetId
    }

  });

  message.channel.send("Ok! Sheet \""+sheetName+"\" deleted!");

  sendRequest(auth, requests);
}



/**
			This function updates the stored list of sheets in the spread.

			Use this function after adding or deleting sheets so that the program knows
			which sheets still exist and what their names and ID's are!
**/

function updateSheetList(auth)
{
  console.log("Updating sheet list...");

  const sheets = google.sheets({version: 'v4', auth});

  sheetList = []; sheetListIDs = [];

  var request = {
    // The spreadsheet to request.
    spreadsheetId: spreadsheetIDConst,  // TODO: Update placeholder value.

    // The ranges to retrieve from the spreadsheet.
    ranges: [],  // TODO: Update placeholder value.

    // True if grid data should be returned.
    // This parameter is ignored if a field mask was set in the request.
    includeGridData: false,  // TODO: Update placeholder value.

    auth: oAuth2Client,
  };

  sheets.spreadsheets.get(request, function(err, response) {
    if (err) {
      console.error(err);
      return;
    }

    for (var sheet in response.data.sheets)
    {
      var sheetTitle = response.data.sheets[sheet].properties.title;
      var sheetIdVal = response.data.sheets[sheet].properties.sheetId;

      sheetList.push(sheetTitle);
      sheetListIDs.push(sheetIdVal);
    }

    console.log("Done!");
    console.log(sheetList);
    console.log(sheetListIDs);
  });
}



/**
			This function searches all the sheets in the spread to find the ID of the sheet we want.
**/

function searchForSheet (titleToSearchFor)
{
  var sheets = sheetList;
  for (var sheet in sheets)
  {
    if (sheets[sheet].toLowerCase() == titleToSearchFor.toLowerCase()) { return sheetListIDs[sheet]; }
  }
}



/**
			This function deletes a specific amount of data. This is a good example of
			combining multiple functions to complete a larger end-goal!
**/

function deleteUser (auth, sheet, sheetId, user, message)
{

  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetIDConst,
    range: `${sheet}!A1:A`,
  }, (err, res) => {

    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;

    if (rows.length)
    {
      var someoneFound = false;

      // Print columns A and E, which correspond to indices 0 and 4.
      for (var row in rows) {
        //console.log(`${currentRowValue}`);
        if (rows[row] == user)
        {
          //console.log(row+" "+ (row+1));
          let requests = [];
          // Change the spreadsheet's title.
          requests.push({

            "deleteDimension": {
              "range": {
                "sheetId": sheetId,
                "dimension": "ROWS",
                "startIndex": row,
                "endIndex": (Number(row)+1)
              }
            }

          });
          someoneFound = true;
          message.channel.send("Deleting \""+user+"\" from \""+sheet+".\"");
          sendRequest(auth, requests);
        }
      }

      if (!someoneFound) { message.channel.send("No user \""+user+"\" found in \""+sheet+".\""); }
    }
    else
    { console.log('No data found.'); }

  });

}



/**
			This function adds a user. This is another good example of combining
			functions to acheieve more complex end-goals.

			<!> This code does not work right now! Please don't use this as a perfect
					example or attempt to use this code without editing it first! 				</!>
**/

function addUser(auth, sheetId, user, message)
{
  const sheets = google.sheets({version: 'v4', auth});

  var requests = [];
  // Change the spreadsheet's title.
  requests.push({

    "insertDimension": {
      "range": {
        "sheetId": sheetId,
        "dimension": "ROWS",
        "startIndex": 1,
        "endIndex": 2
      },
      "inheritFromBefore": false
    }

  });

  var batchUpdateRequest = {requests};
  sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetIDConst,
    resource: batchUpdateRequest,
  }, (err, response) => {
    if (err) {
      // Handle error
      console.log(err);
    } else {
      //const findReplaceResponse = response.replies[1].findReplace;
      //console.log(response);
    }
  });

  requests = [];

  requests.push({

    "batchUpdate": {
      "valueInputOption": "RAW",
      "data": [
        {
          "range": "A2:G2",
          "majorDimension": "ROWS",
          "values": [
            [user, "", "", "", "", "", ""]
          ]
        }
      ],
      "includeValuesInResponse": false,
      "responseValueRenderOption": "FORMATTED_VALUE",
      "responseDateTimeRenderOption": "SERIAL_NUMBER"
    }

  });

  console.log(requests);

  batchUpdateRequest = {requests};
  sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetIDConst,
    resource: batchUpdateRequest,
  }, (err, response) => {
    if (err) {
      // Handle error
      console.log(err);
    } else {
      //const findReplaceResponse = response.replies[1].findReplace;
      //console.log(response);
    }
  });
}









/**

  Bot commands code

	This is the code that makes the discord bot interperate the commands a person
	says in chat. Add new commands here, which run functions back in the
	functions area.

	Sample code for several commands are provided, and show arguments and how to use the functions you defined above

**/

bot.on('message', (message) =>
{
	var mess = message.content;

  if (mess.startsWith("!"))			//	If message begins with "!<command>"
  {
	  var command = mess.substr(1,mess.length)			//	Command is now <command>




		if (command.startsWith("balance"))			//	Sample command
    {
      if (deleteCommands) { bulkDelete(1, message.channel); }			//	Deletes user's command if config.json says to

      listUserData(oAuth2Client, message);			//	List a user's data function
    }



    if (command.startsWith("update"))
    {
      if (deleteCommands) { bulkDelete(1, message.channel); }

      updateSheetList(oAuth2Client);
    }



    if (command.startsWith("remove"))
    {
      if (deleteCommands) { bulkDelete(1, message.channel); }

      //addSheet(oAuth2Client, message, "test");
      var mess = message.content;
      const args = mess.slice(1).trim().split(/ +/g);

      if (args.length > 2)
      {
        var user = args[1];
        var searchingFor = args[2];
        var currentSheetID = searchForSheet(searchingFor);
        deleteUser(oAuth2Client, searchingFor, currentSheetID, user, message);
      }
      else
      {
        message.channel.send("You need to specify a user and a coin!")
      }
    }



    if (command.startsWith("create"))
    {
      if (deleteCommands) { bulkDelete(1, message.channel); }

      var mess = message.content;
      const args = mess.slice(1).trim().split(/ +/g);

      if (args.length > 1)
      {
        var newSheetName = args[1];
        addSheet(oAuth2Client, message, newSheetName);
      }
      else
      {
        message.channel.send("You need to specify a new sheet!")
      }
    }



    if (command.startsWith("delete"))
    {
      if (deleteCommands) { bulkDelete(1, message.channel); }

      var mess = message.content;
      const args = mess.slice(1).trim().split(/ +/g);

      if (args.length > 1)
      {
        var sheetNameToDel = args[1];
        var currentSheetID = searchForSheet(sheetNameToDel);
        deleteSheet(oAuth2Client, message, currentSheetID, sheetNameToDel);
      }
      else
      {
        message.channel.send("You need to specify a sheet!")
      }
    }



    if (command.startsWith("add"))
    {
      if (deleteCommands) { bulkDelete(1, message.channel); }

      var mess = message.content;
      const args = mess.slice(1).trim().split(/ +/g);

      if (args.length > 2)
      {
        var user = args[1];
        var sheetName = args[2];
        var currentSheetID = searchForSheet(sheetName);
        addUser(oAuth2Client, currentSheetID, user, message);
      }
      else
      {
        message.channel.send("You need to specify a user and a sheet!")
      }
    }




    if (command.startsWith("help"))			//	help command embeded message
    {
      if (deleteCommands) { bulkDelete(1, message.channel); }

			const embed = new Discord.RichEmbed()
				.setColor(sideColor)
				.setTitle("Help");
        if (showDescription) { embed.setDescription("Showing help!") }
        if (showTiggeredBy) { embed.setFooter("Triggered by: "+message.author.username, message.author.avatarURL) }
			embed.addField('!balance', "Shows your balance", true);
			embed.addField('!update', "Updates the list of sheets", true);
			embed.addField('!remove <user> <sheet>', "Removes a user from a sheet", true);
			embed.addField('!create <sheet>', "Creates a new sheet (!update)", true);
			embed.addField('!delete <sheet>', "Deletes a sheet (!update)", true);
			message.channel.send({embed});
    }

  }
});






/**

  Bot Presence stuff ("watching for !help")

	Edit this in config.json!

**/

bot.on('ready', () => {
	console.log('Logged in as:', bot.user.tag)

  if (showPresence)
  {
    	bot.user.setPresence(
    	{
    		game:
    		{
    			// Example: "Watching 5 players on server.com"
    			name: presenceName,
    			type: presenceID // Use activity type 3 which is "Watching"
    		}
    	})
  }

  updateSheetList(oAuth2Client);
})






/**

  Bot Login

	Logs bot into ID given in config.json

**/

bot.login(botID);






/**

  Extra functions, do not touch unless you know what you are doing

**/

function bulkDelete(amount, channel)
{
	channel.fetchMessages
	({
		limit: amount,
	}).then((messages) => {
		 channel.bulkDelete(messages).catch(error => console.log(error.stack));
	});
}
