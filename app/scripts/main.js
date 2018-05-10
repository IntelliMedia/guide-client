//-----------------------------------------------------------------------
// Initialize Variables


/**
 * Constants
 */

const ClientVersion = '3.0.0';
const guideProtocol = 'guide-protocol-v3';
const GuideLocalServer = 'ws://localhost:3000';

const imageUrlBase = 'https://geniverse-resources.concord.org/resources/drakes/images/';
const questionMarkImageUrl = 'images/question_mark.png';

const DefaultGroupId = "Test-v3";
const DefaultItsDBEndpoint = "1/userState/https%3A%2F%2Flearn%2Econcord%2Eorg%2Fapi%2Fv1%2Fclasses%2F325/https%3A%2F%2Flearn%2Econcord%2Eorg%2F71692/itsData";

const DefaultClassId = 123456789;

/**
 * Global Variables
 */

var sequenceNumber = null;
var currentUser = null;
var currentSessionId = null;
var socket = null;

var targetSpecies = BioLogica.Species.Drake;

var tutorFeedbackQueue = [];

var isConnected = false;

/**
 * Main
 */

// Set up global error handler for uncaught exceptions
window.onerror = function (messageOrEvent, source, lineno, colno, error) {
  showError(messageOrEvent);
  return false;
}

initializeUI();

initializeGuideConnection();

/**
 * socket.io communication and GUIDE Protocol functions
 */

function initializeGuideConnection() {

  var server = null;
  switch (window.location.protocol) {
    // Local Test Server
    case 'http:':
    case 'file:':
      server = GuideLocalServer;
      break;

    // Production Server     
    default:
      // When running on production, the client assumes its path is under the server. 
      // E.g. https://guide.intellimedia.ncsu.edu/v3/client
      server = document.head.baseURI.replace("https:", "wss:");
  }

  updateConnectionStatus(false);

  var serverUrl = server + '/' + guideProtocol;
  socket = io(serverUrl);

  // Handle socket.io state changes

  socket.on('error', (err) => {
    showError('Communication error: ' + err + "\n" + serverUrl);
  });

  socket.on('connect_error', (err) => {
    if (isConnected) {
      showError('Unable to connect: ' + serverUrl);
    }
  });

  socket.on('reconnect_error', (err) => {
    if (isConnected) {
      showError('Unable to reconnect: ' + serverUrl);
    }
  });

  socket.on('reconnect_failed', (err) => {
    if (isConnected) {
      showError('Reconnect failed: ' + serverUrl);
    }
  });

  socket.on('connect_timeout', (err) => {
    showError('Connection timed out: ' + serverUrl);
  });

  socket.on('connect', () => {
    showInfo('Connected to ' + serverUrl, 3000);
    updateConnectionStatus(true, serverUrl);
  });

  socket.on('disconnect', () => {
    showInfo('Disconnected');
    updateConnectionStatus(false);
  });

  socket.on('reconnect', () => {
    showInfo('Reconnected!');
  });

  // Handle messages from GUIDE server

  socket.on(GuideProtocol.Event.Channel, (data) => {
    var event = GuideProtocol.Event.fromJson(data);
    console.info("Received from ITS:", event);

    if (event.action === "HINT") {
      var message = event.context.hintDialog;
      tutorFeedbackQueue.push(message);
      displayTutorFeedback();
    } else if (event.action === "SPOKETO") {
      var message = event.context.dialog;
      tutorFeedbackQueue.push(message);
      displayTutorFeedback();
    } else {
      showPopup(
        'info',
        'Server',
        event.action + " " + event.context.conceptId
      );
    }
  });

  socket.on(GuideProtocol.Alert.Channel, (data) => {
    var alert = GuideProtocol.Alert.fromJson(data);
    
    switch (alert.type) {
      case GuideProtocol.Alert.Error:
        console.error("ITS Error: " + alert.message);
        showPopup(
          'error',
          'Server',
          alert.message
        );
        break;

      case GuideProtocol.Alert.Warning:
        console.warn("ITS Warning: " + alert.message);
        showPopup(
          'warning',
          'Server',
          alert.message
        );
        break;

      case GuideProtocol.Alert.Info:
        console.info("ITS Info: " + alert.message);
        showPopup(
          'info',
          'Server',
          alert.message
        );
        break;

      //case GuideProtocol.Alert.Debug:
      default:
        console.log("ITS Debug: " + alert.message);
    }
  });
}

function SendGuideEvent(actor, action, target, context) {
  var event = new GuideProtocol.Event(
    currentUser,
    currentSessionId,
    sequenceNumber++,
    actor,
    action,
    target,
    context);

  console.info("Send to ITS:", event);
  socket.emit(GuideProtocol.Event.Channel, event.toJson());

  return event;
}

/**
 * UI functions
 */

function initializeUI() {

  var title = $('#title').text();
  $('#title').text(title + ' ' + ClientVersion);
  $('#startSessionButton').on("click", startSession);
  $('#endSessionButton').on("click", endSession);

  $('.modal').on('hidden.bs.modal', function () {
    displayTutorFeedback();
  });

  $(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
    if (e.target) {
      var url = e.target.toString();
      console.info("tab target: " + url);
      var anchor = url.substring(url.indexOf("#") + 1);
      if (anchor) {
        onTabSelected(anchor);
      }
    }
  });
}

function onTabSelected(tabName) {

}

function userNavigatedChallenge(challengeId) {

  var context = {};
  context.challengeId = challengeId;

  if (context.challengeId) {
    SendGuideEvent(
      "USER",
      "NAVIGATED",
      "CHALLENGE",
      context);
  }
}

function isModalOpen() {
  var isShown = false;
  $(".modal").each(function (i, popup) {
    if (($(popup).data('bs.modal') || {}).isShown) {
      isShown = true;
      return;
    }
  });

  return isShown;
}

function showPopup(type, title, message) {
  var popup = $('#' + type + 'Modal').modal('show');
  popup.find('.modal-title').text(title);
  popup.find('.modal-body').text(message);

  return popup;
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

function startSession() {

  currentUser = getStudentId();
  currentSessionId = guid();
  sequenceNumber = 0;

  var context = {
    "classId": getClassId(),
    "groupId": getGroupId(),
    "itsDBEndpoint": getItsDBEndpoint()
  };

  SendGuideEvent(
    "SYSTEM",
    "STARTED",
    "SESSION",
    context);

  updateSessionStatus(currentSessionId);
}

function endSession() {

  SendGuideEvent(
    "SYSTEM",
    "ENDED",
    "SESSION");

  tutorFeedbackQueue = [];
  updateSessionStatus(null);
}

function getStudentId() {
  var studentId = $('#studentIdInput').val();
  if (!studentId) {
    studentId = randomStudentId();
    $('#studentIdInput').val(studentId);
  }

  return studentId;
}

function getClassId() {
  var classId = $('#classIdInput').val();
  if (!classId) {
    classId = DefaultClassId;
    $('#classIdInput').val(classId);
  }

  return classId;
}

function getGroupId() {
  var groupId = $('#groupIdInput').val();
  if (!groupId) {
    groupId = DefaultGroupId;
    $('#groupIdInput').val(groupId);
  }

  return groupId;
}

function getItsDBEndpoint() {
  var itsDBEndpoint = $('#itsDBEndpointInput').val();
  if (!itsDBEndpoint) {
    itsDBEndpoint = DefaultItsDBEndpoint;
    $('#itsDBEndpointInput').val(itsDBEndpoint);
  }

  return itsDBEndpoint;
}

function updateConnectionStatus(connected, serverUrl) {
  isConnected = connected;
  if (isConnected) {
    $("#connectedLabel").show();
    $("#disconnectedLabel").hide();
    $("#serverUrl").text(serverUrl);
  } else {
    $("#connectedLabel").hide();
    $("#disconnectedLabel").show();
    $("#serverUrl").text("");
  }
}

function updateSessionStatus(id) {
  if (id) {
    $("#sessionLabel").text(id);
  }

  $(".session-region").each(function (i, region) {
    if (id) {
      $(region).show();
    } else {
      $(region).hide();
    }
  });
}

function displayTutorFeedback() {
  if (tutorFeedbackQueue.length == 0 || isModalOpen()) {
    return;
  }

  var message = tutorFeedbackQueue.shift();
  if (message != null) {
    showPopup(
      'info',
      'Tutor',
      message
    );
  }
}

function randomStudentId() {
  return 'TestUser-' + Math.floor((Math.random() * 1000) + 1).toString();
}

function sprintf(format) {
  var args = Array.prototype.slice.call(arguments, 1);
  return format.replace(/{(\d+)}/g, function (match, number) {
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
      ;
  });
}


/**
 * Helper functions
 */

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

// http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

