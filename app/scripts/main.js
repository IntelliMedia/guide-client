//-----------------------------------------------------------------------
// Initialize Variables


/**
 * Constants
 */

const guideProtocol = 'guide-protocol-v2';
const GuideProductionServer = 'wss://guide.intellimedia.ncsu.edu';
const GuideLocalServer = 'ws://localhost:3000';

const imageUrlBase = 'http://demo.geniverse.concord.org/resources/drakes/images/';
const questionMarkImageUrl = 'http://demo.geniverse.concord.org/static/geniverse/en/16d25bc8d16599c46291ead05fd2bd8bc9192d1f/resources/images/question_mark.png';

const DefaultGroup = "Beta";
const DefaultGuideId = "2.1.1";

/**
 * Global Variables
 */

var sequenceNumber = null;
var currentUser = null;
var currentSessionId = null;
var socket = null;

var targetSpecies = BioLogica.Species.Drake;
var targetGenes = ["metallic","wings","forelimbs","hindlimbs"];
var targetOrganism = null;
var targetOrganismSex = null;
var yourInitialAlleles = null;
var yourOrganismAlleles = null;
var yourOrganismSex = null;

var minRandomAlleles = 4;
var maxRandomAlleles = 10;

var tutorFeedbackQueue = [];

var drakeAlleles = "a:T,b:t,a:m,b:m,a:w,b:W,a:h,b:h,a:C,b:C,a:B,b:B,a:Fl,b:Fl,a:Hl,b:hl,a:a,b:a,a:D,b:D,a:Bog,b:Bog,a:rh,b:rh";

/**
 * Main
 */

// Set up global error handler for uncaught exceptions
window.onerror = function(messageOrEvent, source, lineno, colno, error) {
  showError(messageOrEvent);
  return false;
}

initializeUI(targetGenes, targetSpecies);

initializeGuideConnection();

/**
 * socket.io communication and GUIDE Protocol functions
 */

function initializeGuideConnection() {

  var server = null;
  switch(window.location.protocol) {
    // Local Test Server
    case 'http:':     
    case 'file:':
      server = GuideLocalServer;
      break;
      
    // Production Server     
    default: 
      server = GuideProductionServer;
  }

  var serverUrl = server + '/' + guideProtocol;
  socket = io(serverUrl);

  // Handle socket.io state changes

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

  // Handle messages from GUIDE server

  socket.on(GuideProtocol.TutorDialog.Channel, (data) => {
    var tutorDialog = GuideProtocol.TutorDialog.fromJson(data);
    var message = tutorDialog.message.asString();
    tutorFeedbackQueue.push(message);
    displayTutorFeedback();
  });

  socket.on(GuideProtocol.Alert.Channel, (data) => {
    var alert = GuideProtocol.Alert.fromJson(data);
    switch (alert.type) {
      case GuideProtocol.Alert.Error:
        showPopup(
          'danger',
          'Server',
          alert.message
        );    
      break;

      default:
        showPopup(
          'info',
          'Server',
          alert.message
        );  
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

  socket.emit(GuideProtocol.Event.Channel, event.toJson());

  return event;
}

/**
 * UI functions
 */

function initializeUI(genes, species) {

  $('#startSessionButton').on("click", startSession);
  $('#endSessionButton').on("click", endSession);
  $('#submitOrganismButton').on("click", submitOrganism);
  $('#randomOrganismButton').on("click", randomOrganism);

  $('.modal').on('hidden.bs.modal', function () {  
      displayTutorFeedback();
  })   
  
  $('#targetOrganismHeader').text('Target ' + targetSpecies.name);
  $('#yourOrganismHeader').text('Your ' + targetSpecies.name);
  $('#submitOrganismButton').text('Submit ' + targetSpecies.name);
  $('#randomOrganismButton').text('Random ' + targetSpecies.name); 
  
  createAlleleDropdowns(genes, species);
}

function isModalOpen() {
  var isShown = false; 
  $(".modal").each(function(i, popup) { 
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

  randomOrganism();

  currentUser = getUsername();
  currentSessionId = guid();
  sequenceNumber = 0;

  var context = {
      "group" : getGroup()
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

function submitOrganism() {

  updateAllelesFromDropdowns();
  var yourOrganism = new BioLogica.Organism(targetSpecies, yourOrganismAlleles, yourOrganismSex);
  var filename = imageUrlBase + yourOrganism.getImageName();  
  $('#yourOrganismImage').attr('src', filename);

  var correct = (yourOrganism.getImageName() == targetOrganism.getImageName());

  if (correct) {
    showPopup(
      'success',
      'Good work!',
      'The drake you have created matches the target drake.');

  } else {
    showPopup(
      'danger',
      "That's not the drake!",
      "The drake you have created doesn't match the target drake. Please try again.");
  }

  var context = {
        "guideId" : getGuideId(),
        "species" : targetSpecies.name,
        "initialAlleles": yourInitialAlleles,
        "selectedAlleles": yourOrganismAlleles,
        "targetAlleles": targetOrganism.getAlleleString(),
        "targetSex": targetOrganism.sex,
        "editableGenes": targetGenes,
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
        "correct": correct,
        "incrementMoves": true
  };

  SendGuideEvent(
      "USER",
      "SUBMITTED",
      "ORGANISM",
      context);  
}

function randomOrganism() {

  targetOrganismSex = Math.floor(2 * Math.random());
  targetOrganism = new BioLogica.Organism(targetSpecies, "", yourOrganismSex);
  targetOrganism.species.makeAlive(targetOrganism);

  yourOrganismSex = targetOrganism.sex;  
  yourInitialAlleles = BiologicaX.randomizeAlleles(targetSpecies, targetGenes, targetOrganism.getAlleleString());
  yourOrganismAlleles = yourInitialAlleles; 
  updateAlleleDropdowns(yourOrganismAlleles);

  var filename = imageUrlBase + targetOrganism.getImageName();
  $('#targetOrganismImage').attr('src', filename); 
  
  $('#yourOrganismImage').attr('src', questionMarkImageUrl); 
}

function getUsername() {
  var username = $('#usernameInput').val();
  if (!username) {
    username = randomUsername();
    $('#usernameInput').val(username);
  }

  return username;
}

function getGroup() {
  var group = $('#groupInput').val();
  if (!group) {
    group = DefaultGroup;
    $('#groupInput').val(group);
  }

  return group;
}

function getGuideId() {
  var guideId = $('#guideIdInput').val();
  if (!guideId) {
    guideId = DefaultGuideId;
    $('#guideIdInput').val(guideId);
  }

  return guideId;
}

function updateSessionStatus(id) {
  if (id) {
    $("#sessionLabel").text(id);
  }

  $(".session-region").each(function(i, region) {
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

function randomUsername() {
  return 'TestUser-' + Math.floor((Math.random() * 1000) + 1).toString();
}

function createAlleleDropdowns(genes, species) {

  var openDropdownHtml = 
    `<div class="btn-group">
      <button class="btn dropdown-toggle allele-selection" type="button" data-toggle="dropdown" selected-allele="" gene="{0}">select <span class="caret"></span></button>
        <ul class="dropdown-menu">`;

  var itemHtml = `<li><a selected-allele="{1}" >{0}</a></li>`;

  var closeDropdownHtml = 
    `   </ul>
    </div>
    <p>`;
    
  var leftDropdowns = "";
  var rightDropdowns = "";
 
  var genesLength = genes.length;
  for (var i = 0; i < genesLength; i++) {

      var geneInfo = species.geneList[genes[i]];
      if (geneInfo == null || geneInfo.length == 0) {
        console.warn("Unable to find alleles for " + genes[i]);
        continue;
      }

      leftDropdowns += sprintf(openDropdownHtml, genes[i]);
      rightDropdowns += sprintf(openDropdownHtml, genes[i]);

      var allelesLength = geneInfo.alleles.length;
      for (var j = 0; j < allelesLength; ++j) {      
          var allele = geneInfo.alleles[j];
          var alleleName = species.alleleLabelMap[allele];
          leftDropdowns += sprintf(itemHtml, alleleName, 'a:' + allele);
          rightDropdowns += sprintf(itemHtml, alleleName, 'b:' + allele);
      }    

      leftDropdowns += closeDropdownHtml;
      rightDropdowns += closeDropdownHtml;      
  }

  $('#left-chromosomes').html(leftDropdowns);
  $('#right-chromosomes').html(rightDropdowns);
}

$(".dropdown-menu li a").click(function(){
  selectDropdownItem($(this).parents('.btn-group').find('.dropdown-toggle'), $(this));
});

function selectDropdownItem(dropdownToggle, selectedItem) {
  var selectedText = selectedItem.text();
  var selectedValue = selectedItem.attr('selected-allele');

  dropdownToggle.html(selectedText+' <span class="caret"></span>');
  dropdownToggle.attr('selected-allele', selectedValue);
}

function updateAllelesFromDropdowns() {
  $('button.allele-selection').each(function(i, dropdown) {
    var selectedAllele = $(dropdown).attr('selected-allele');    
    var gene = $(dropdown).attr('gene');    

    yourOrganismAlleles = BiologicaX.replaceAllele(targetSpecies, gene, yourOrganismAlleles, selectedAllele);
  });
}

function updateAlleleDropdowns(alleles) {
  $('button.allele-selection').each(function(i, dropdown) {
    var item  = getDropdownItem($(this), dropdown, alleles);
    if (item == null) {
      item = getRandomDropdownItem($(this), dropdown);
    } 
    selectDropdownItem($(dropdown), $(item));
  });
}

function getDropdownItem(context, dropdown, alleles) {
    var selectedItem = null;
    
    context.parent(dropdown).find('a').each(function(j, item) {
      if (alleles.includes($(item).attr('selected-allele'))) {
        selectedItem = item;
        return false;
    }});    

    return selectedItem;
}

function getRandomDropdownItem(context, dropdown) {
  var items = context.parent(dropdown).find('a');
  return items[ExtMath.randomInt(items.length)];
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
