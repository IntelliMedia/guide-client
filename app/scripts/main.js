//-----------------------------------------------------------------------
// Initialize Variables

var guideServer = 'wss://guide.intellimedia.ncsu.edu';
var guideProtocol = 'guide-protocol-v2'

// Session-related variables
var sequenceNumber = null;
var currentUser = null;
var currentSessionId = null;

//-----------------------------------------------------------------------
// UI Functions
document.getElementById('startSessionButton').addEventListener("click", startSession);
document.getElementById('submitDrakeButton').addEventListener("click", submitDrake);
document.getElementById('endSessionButton').addEventListener("click", endSession);

//-----------------------------------------------------------------------
// Connection Functions

var serverUrl = guideServer + '/' + guideProtocol;
var socket = io(serverUrl);

socket.on('connect_error', (err) => {
  showError('Unable to connect: ' + serverUrl);
});

socket.on('connect', () => {
  showInfo('Connected to ' + serverUrl, 3000);
});

socket.on('disconnect', () => {
  showInfo('Disconnected');
});

socket.on('reconnect', () => {
  showInfo('Disconnected!');
});

// Handle message from GUIDE server
socket.on('tutorAction', (data) => {
  var tutorAction = JSON.parse(data).tutorAction;
  console.info('Tutor says: ' + tutorAction.message.text);
  displayTutorText(replaceMessageArgs(tutorAction.message));
});

//-----------------------------------------------------------------------
// Button Handlers

function startSession() {
  currentUser = getUsername();
  currentSessionId = guid();
  sequenceNumber = 0;
  var event = {
    "event": {
      "username": currentUser,
      "session": currentSessionId,
      "time": Date.now(),
      "sequence": sequenceNumber++,
      "actor": "SYSTEM",
      "action": "STARTED",
      "target": "SESSION"
    }
  };
  // Send event to server
  socket.emit('event', JSON.stringify(event));
  updateSessionStatus(currentSessionId);
}

function endSession() {
  var event = {
    "event": {
      "username": currentUser,
      "session": currentSessionId,
      "time": Date.now(),
      "sequence": sequenceNumber++,
      "actor": "SYSTEM",
      "action": "ENDED",
      "target": "SESSION"
    }
  };
  // Send event to server
  socket.emit('event', JSON.stringify(event));
  displayTutorText('');
  updateSessionStatus(null);
}

function submitDrake() {
  var event = {
    "event": {
      "username": currentUser,
      "session": currentSessionId,
      "time": Date.now(),
      "sequence": sequenceNumber++,
      "actor": "USER",
      "action": "SUBMITTED",
      "target": "DRAKE",
      "context": {
        "correctPhenotype": {
          "armor": "Five armor",
          "tail": "Long tail",
          "forelimbs": "No forelimbs",
          "hindlimbs": "Hindlimbs",
          "horns": "Horns",
          "nose spike": "No nose spike",
          "wings": "Wings",
          "color": "Charcoal",
          "health": "Healthy",
          "liveliness": "Alive"
        },
        "submittedPhenotype": {
          "armor": "Five armor",
          "tail": "Long tail",
          "forelimbs": "No forelimbs",
          "hindlimbs": "Hindlimbs",
          "horns": "Horns",
          "nose spike": "No nose spike",
          "wings": "Wings",
          "color": "Steel",
          "health": "Healthy",
          "liveliness": "Alive"
        },
        "correct": false,
        "incrementMoves": true
      }
    }
  };
  // Send event to server
  socket.emit('event', JSON.stringify(event));
}

//-----------------------------------------------------------------------
// Helper Functions

function getUsername() {
  var username = document.getElementById("usernameInput").value;
  if (!username) {
    username = randomUsername();
    document.getElementById("usernameInput").value = username;
  }

  return username;
}

function updateSessionStatus(id) {
  if (id) {
    $("#sessionRegion").show();
    $("#sessionLabel").text('Active Session: ' + id);
  } else {
    $("#sessionRegion").hide();
  }
}

function replaceMessageArgs(msg) {
  return Mustache.render(msg.text, msg.args);
}

function displayTutorText(text) {
  var tutorResponse = document.getElementById('tutorResponse');
  tutorResponse.innerHTML = text;
}

function randomUsername() {
  return 'FiddleUser-' + Math.floor((Math.random() * 1000) + 1).toString();
}

// Create a GUID
// source: http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function showInfo(msg, delay) {
  console.info(msg);
  if (delay) {
  	$('#info').showBootstrapAlertInfo(msg, Bootstrap.ContentType.Text, true, delay);
  } else {
	  $('#info').showBootstrapAlertInfo(msg, Bootstrap.ContentType.Text, true);
  }
}

function showWarning(msg) {
  console.warn(msg);
  $('#warning').showBootstrapAlertWarning(msg, Bootstrap.ContentType.Text, false, 5000);
}

function showError(msg) {
  console.error(msg);
  $('#error').showBootstrapAlertDanger(msg, Bootstrap.ContentType.Text, false, 3000);
}

function showSuccess(msg) {
  console.info(msg);
  $('#success').showBootstrapAlertSuccess(msg, Bootstrap.ContentType.Text, true);
}
