//-----------------------------------------------------------------------
// Initialize Variables


/**
 * Constants
 */

const guideProtocol = 'guide-protocol-v3';
const GuideProductionServer = 'wss://guide.intellimedia.ncsu.edu';
const GuideLocalServer = 'ws://localhost:3000';

const imageUrlBase = 'http://demo.geniverse.concord.org/resources/drakes/images/';
const questionMarkImageUrl = 'http://demo.geniverse.concord.org/static/geniverse/en/16d25bc8d16599c46291ead05fd2bd8bc9192d1f/resources/images/question_mark.png';

const DefaultGroupId = "verticalBite";
const DefaultChromosomeChallengeIdInput = "chromosome-picking-01";
const DefaultEggDropChallengeIdInput = "egg-drop-01";

const DefaultClassId = 123456789;

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
var yourInitialAlleles = null;
var yourOrganismAlleles = null;
var yourOrganismSex = null;
var basketGeneIndex = 0;

var minRandomAlleles = 4;
var maxRandomAlleles = 10;

var tutorFeedbackQueue = [];

var drakeAlleles = "a:T,b:t,a:m,b:m,a:w,b:W,a:h,b:h,a:C,b:C,a:B,b:B,a:Fl,b:Fl,a:Hl,b:hl,a:a,b:a,a:D,b:D,a:Bog,b:Bog,a:rh,b:rh";

var isConnected = false;

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
  $('.randomOrganismButton').each(function() {
    $(this).on("click", randomOrganism);
  });

  $('.modal').on('hidden.bs.modal', function () {  
      displayTutorFeedback();
  })   
  
  $('#targetOrganismHeader').text('Target ' + targetSpecies.name);
  $('#yourOrganismHeader').text('Your ' + targetSpecies.name);
  $('#submitOrganismButton').text('Submit ' + targetSpecies.name);
  $('.randomOrganismButton').each(function() {
    $(this).text('Random ' + targetSpecies.name);
  });
 
  $('#chromosomes').tab('show');
  
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

  currentUser = getStudentId();
  currentSessionId = guid();
  sequenceNumber = 0;

  var context = {
      "classId" : getClassId(),
      "groupId" : getGroupId()
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

function sexToString(sex) {
  return (sex == 0 ? "Male" : "Female");
}

function submitOrganism() {

  updateAllelesFromDropdowns();
  updateSexFromDropdown();
  var yourOrganism = new BioLogica.Organism(targetSpecies, yourOrganismAlleles, yourOrganismSex);
  yourOrganism.species.makeAlive(yourOrganism);
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
        "challengeId" : getChromosomeChallengeId(),
        "challengeCriteria": {
          "sex": sexToString(targetOrganism.sex),
          "phenotype": targetOrganism.phenotype.characteristics
        },
        "userSelections": {
            "alleles": yourOrganismAlleles,
            "sex": sexToString(yourOrganism.sex)
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

function submitEgg(sex, gene, characteristic) {

  updateAllelesFromDropdowns();
  updateSexFromDropdown();
  var yourOrganism = new BioLogica.Organism(targetSpecies, yourOrganismAlleles, yourOrganismSex);
  yourOrganism.species.makeAlive(yourOrganism);
  var filename = imageUrlBase + yourOrganism.getImageName();  
  $('#yourOrganismImage').attr('src', filename);

  var organismSex = sexToString(targetOrganism.sex);
  var correct = (organismSex == sex 
      && BiologicaX.getCharacteristic(targetOrganism, gene) == characteristic);

  if (correct) {
    showPopup(
      'success',
      'Good work!',
      'The basket you selected matches the egg.');

  } else {
    showPopup(
      'danger',
      "That's not the drake!",
      "The basket you selected doesn't match the egg. Please try again.");
  }

  var context = {
        "challengeId" : getEggDropChallengeId(),
        "challengeCriteria": {
          "sex": organismSex,
          "alleles": targetOrganism.getAlleleString()
        },
        "userSelections": {
            "sex": sex,
            "phenotype": {
                gene: characteristic
            }
        },
        "correct": correct,
        "incrementMoves": true
  };

  SendGuideEvent(
      "USER",
      "SUBMITTED",
      "EGG",
      context);  
}

function randomOrganism() {

  var targetOrganismSex = Math.floor(2 * Math.random());
  targetOrganism = new BioLogica.Organism(targetSpecies, "", Number(targetOrganismSex));
  targetOrganism.species.makeAlive(targetOrganism);
  
  yourInitialAlleles = BiologicaX.randomizeAlleles(targetSpecies, targetGenes, targetOrganism.getAlleleString());
  yourOrganismAlleles = yourInitialAlleles; 
  updateAlleleDropdowns(yourOrganismAlleles);
  updateSexDropdown(targetOrganismSex == 0 ? "1" : "0");

  var filename = imageUrlBase + targetOrganism.getImageName();
  $('#targetOrganismImage').attr('src', filename); 
  
  $('#yourOrganismImage').attr('src', questionMarkImageUrl); 

  updateEggDropControls(targetGenes, targetOrganism);
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

function getChromosomeChallengeId() {
  var challengeId = $('#chromosomeChallengeIdInput').val();
  if (!challengeId) {
    challengeId = DefaultChromosomeChallengeIdInput;
    $('#chromosomeChallengeIdInput').val(challengeId);
  }

  return challengeId;
}

function getEggDropChallengeId() {
  var challengeId = $('#eggDropChallengeIdInput').val();
  if (!challengeId) {
    challengeId = DefaultEggDropChallengeIdInput;
    $('#eggDropChallengeIdInput').val(challengeId);
  }

  return challengeId;
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

function randomStudentId() {
  return 'TestUser-' + Math.floor((Math.random() * 1000) + 1).toString();
}

function createAlleleDropdowns(genes, species) {

  var openDropdownHtml = 
    `<div class="btn-groupId">
      <button class="btn dropdown-toggle allele-selection" type="button" data-toggle="dropdown" selected-value="" gene="{0}">select <span class="caret"></span></button>
        <ul class="dropdown-menu">`;

  var itemHtml = `<li><a selected-value="{1}" >{0}</a></li>`;

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

function updateEggDropControls(genes, organism) {

  var species = organism.species;
  var alleles = organism.getAlleleString();
  var sex = (organism.sex == 0 ? "Male" : "Female");

  var openHtml = 
    `<ul>`;

  var itemHtml = `<li>{0}</li>`;

  var closeHtml = 
    `</ul>`;
    
  var leftDropdowns = "";
  var rightDropdowns = "";

  leftDropdowns += openHtml;
  rightDropdowns += openHtml;
 
  var genesLength = genes.length;
  for (var i = 0; i < genesLength; i++) {

      var geneInfo = species.geneList[genes[i]];
      if (geneInfo == null || geneInfo.length == 0) {
        console.warn("Unable to find alleles for " + genes[i]);
        continue;
      }

      var leftAllele = BiologicaX.findAllele(species, alleles, "a", genes[i]).replace("a:", "");
      leftDropdowns += sprintf(itemHtml, species.alleleLabelMap[leftAllele])

      var rightAllele = BiologicaX.findAllele(species, alleles, "b", genes[i]).replace("b:", "");
      rightDropdowns += sprintf(itemHtml, species.alleleLabelMap[rightAllele]);         
  }

  leftDropdowns += closeHtml;
  rightDropdowns += closeHtml;

  $('#left-egg-chromosomes').html(leftDropdowns);
  $('#right-egg-chromosomes').html(rightDropdowns);
  $('#egg-sex').text(sex);

  var basketGene = genes[(basketGeneIndex++ % genes.length)];
  var basketGeneInfo = species.geneList[basketGene];

  // Update basket buttons
  $("#egg-drop-buttons .btn").each(function(i, dropdown) {
    var sex = i % 2 == 0 ? "Male" : "Female";
    var alleleIndex = i < 2 ? 0 : 1;
    var characterisitic = species.alleleLabelMap[basketGeneInfo.alleles[alleleIndex]];

    $(this).attr("sex", sex);
    $(this).attr("characteristic", characterisitic);
    $(this).attr("gene", basketGene);
    $(this).html(sex + " - " + characterisitic);
  });
}

$("#egg-drop-buttons .btn").click(function(){
  var sex = $(this).attr("sex");
  var gene = $(this).attr("gene");
  var characteristic = $(this).attr("characteristic");

  console.info("Basket button pressed: %s - %s",
    sex, gene, characteristic);

    submitEgg(sex, gene, characteristic);
});

$(".dropdown-menu li a").click(function(){
  selectDropdownItem($(this).parents('.btn-groupId').find('.dropdown-toggle'), $(this));
});

function selectDropdownItem(dropdownToggle, selectedItem) {
  var selectedText = selectedItem.text();
  var selectedValue = selectedItem.attr('selected-value');

  dropdownToggle.html(selectedText+' <span class="caret"></span>');
  dropdownToggle.attr('selected-value', selectedValue);
}

function updateAllelesFromDropdowns() {
  $('button.allele-selection').each(function(i, dropdown) {
    var selectedAllele = $(dropdown).attr('selected-value');    
    var gene = $(dropdown).attr('gene');    

    yourOrganismAlleles = BiologicaX.replaceAllele(targetSpecies, gene, yourOrganismAlleles, selectedAllele);
  });
}

function updateSexFromDropdown() {
  $('button.sex-selection').each(function(i, dropdown) {
    var value = $(dropdown).attr('selected-value');  
    yourOrganismSex = (value ? Number(value) : 0);  
  });
}

function updateSexDropdown(sex) {
  $('button.sex-selection').each(function(i, dropdown) {
    var item  = getDropdownItem($(this), dropdown, sex);
    if (item == null) {
      item = getRandomDropdownItem($(this), dropdown);
    } 
    selectDropdownItem($(dropdown), $(item));
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

function getDropdownItem(context, dropdown, value) {
    var selectedItem = null;
    
    context.parent(dropdown).find('a').each(function(j, item) {
      if (value.includes($(item).attr('selected-value'))) {
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
