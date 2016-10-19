//-----------------------------------------------------------------------
// Initialize Variables

var guideServer = 'wss://guide.intellimedia.ncsu.edu';
var guideProtocol = 'guide-protocol-v2';
var imageUrlBase = 'http://demo.geniverse.concord.org/resources/drakes/images/';
var questionMarkImageUrl = 'http://demo.geniverse.concord.org/static/geniverse/en/16d25bc8d16599c46291ead05fd2bd8bc9192d1f/resources/images/question_mark.png';

// Session-related variables
var sequenceNumber = null;
var currentUser = null;
var currentSessionId = null;

var targetDrake = null;
var targetDrakeSex = null;
var yourDrakeSex = null;
var yourDrake = null;

var drakeAlleles = "a:T,b:t,a:m,b:M,a:w,b:W,a:h,b:h,a:C,b:C,a:B,b:B,a:Fl,b:Fl,a:Hl,b:hl,a:a,b:a,a:D,b:D,a:Bog,b:Bog,a:rh,b:rh";

//-----------------------------------------------------------------------
// UI Functions
$(".dropdown-menu li a").click(function(){
  var selText = $(this).text();

  $(this).parents('.btn-group').find('.dropdown-toggle').html(selText+' <span class="caret"></span>');

  var selectedValue = $(this).attr('data-value');
  console.info('selected value:' + selectedValue);

  var allele = yourDrake.genetics.getAlleleStringForTrait("wings");
  console.info("before trait: " + allele);
  yourDrake.genetics.genotype.replaceAlleleChromName(1, "a", "w", "w");
  yourDrake.genetics.genotype.replaceAlleleChromName(1, "b", "W", "w");

  yourDrake = new BioLogica.Organism(BioLogica.Species.Drake,
                                      yourDrake.getAlleleString(), yourDrakeSex);

  allele = yourDrake.genetics.getAlleleStringForTrait("wings");
  console.info("after trait: " + allele);
});

document.getElementById('startSessionButton').addEventListener("click", startSession);
document.getElementById('submitDrakeButton').addEventListener("click", submitDrake);
document.getElementById('endSessionButton').addEventListener("click", endSession);

//-----------------------------------------------------------------------
// Connection Functions

var traitsArray = ["metallic","wings","forelimbs","hindlimbs","nose"];
createChromosomeDropdowns(traitsArray, new BioLogica.Organism(BioLogica.Species.Drake, ""));

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

  //targetDrake = new BioLogica.Organism(BioLogica.Species.Drake, "");

  targetDrakeSex = Math.floor(2 * Math.random());
  targetDrake = new BioLogica.Organism(BioLogica.Species.Drake,
                                        drakeAlleles, targetDrakeSex);

  yourDrakeSex = targetDrakeSex; //Math.floor(2 * Math.random());
  yourDrake = new BioLogica.Organism(BioLogica.Species.Drake,
                                      targetDrake.getAlleleString(), yourDrakeSex);  

  var filename = imageUrlBase + targetDrake.getImageName();
  console.info('target image:' + filename);
  document.getElementById('targetDrakeImage').src = filename;  
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

  //var mother = new BioLogica.Organism(BioLogica.Species.Drake, "a:H,b:H", BioLogica.FEMALE);
  //var father = new BioLogica.Organism(BioLogica.Species.Drake, "a:H,b:H", BioLogica.MALE);
  //var child = BioLogica.breed(mother, father);

  //yourDrake.genetics.genotype.replaceAlleleChromName(1, "a", prevAllele, $('#vl').val($(this).attr('data-value')));

  console.info('alles:' + yourDrake.getAlleleString());
  var filename = imageUrlBase + yourDrake.getImageName();
  console.info('image:' + filename);
  document.getElementById('yourDrakeImage').src = filename;

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
          "scales": "Five armor",
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
          "scales": $('.parent1-scales-select').text(),
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

function createChromosomeDropdowns(traitsArray, organism) {

  var openDropdownHtml = 
    `<div class="btn-group">
      <button class="btn dropdown-toggle chromsomeA-scales-select" type="button" data-toggle="dropdown">{0}<span class="caret"></span></button>
        <ul class="dropdown-menu">`;

  var itemHtml = `<li><a data-value="{1}" href="#">{0}</a></li>`;

  var closeDropdownHtml = 
    `   </ul>
    </div>
    <p>`;
    
  var leftDropdowns = "";
  var rightDropdowns = "";
 
  var traitsLength = traitsArray.length;
  for (var i = 0; i < traitsLength; i++) {
      
      leftDropdowns += sprintf(openDropdownHtml, traitsArray[i]);
      rightDropdowns += sprintf(openDropdownHtml, traitsArray[i]);

      var alleleLabels = organism.getAllelesAndLabels(traitsArray[i]);
      console.info("alleleLabels: " + JSON.stringify(alleleLabels));
      Object.keys(alleleLabels).forEach(function(key) {
          leftDropdowns += sprintf(itemHtml, key, alleleLabels[key]);
          rightDropdowns += sprintf(itemHtml, key, alleleLabels[key]);
      });    

      leftDropdowns += closeDropdownHtml;
      rightDropdowns += closeDropdownHtml;      
  }

  document.getElementById("left-chromosomes").innerHTML = leftDropdowns;
  document.getElementById("right-chromosomes").innerHTML = rightDropdowns;
}

function sprintf(format) {
  var args = Array.prototype.slice.call(arguments, 1);
  return format.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number] 
      : match
    ;
  });
}
