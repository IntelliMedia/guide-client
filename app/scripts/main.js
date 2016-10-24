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

var targetSpecies = BioLogica.Species.Drake;
var targetOrganism = null;
var targetOrganismSex = null;
var yourOrganismAlleles = null;
var yourOrganismSex = null;

var tutorFeedbackQueue = [];

// Replace experiment: https://jsfiddle.net/o82phdd3/
var drakeAlleles = "a:T,b:t,a:m,b:m,a:w,b:W,a:h,b:h,a:C,b:C,a:B,b:B,a:Fl,b:Fl,a:Hl,b:hl,a:a,b:a,a:D,b:D,a:Bog,b:Bog,a:rh,b:rh";

//-----------------------------------------------------------------------
// UI Functions

document.getElementById('startSessionButton').addEventListener("click", startSession);
document.getElementById('endSessionButton').addEventListener("click", endSession);
document.getElementById('submitOrganismButton').addEventListener("click", submitOrganism);
document.getElementById('randomOrganismButton').addEventListener("click", randomOrganism);

function isModalOpen() {
  var isShown = false; 
  $(".modal").each(function(i, popup) { 
    if (($(popup).data('bs.modal') || {}).isShown) {
      console.log('Popup ' + $(popup).attr('id') + ' is showing');
      isShown = true;
      return;
    }
  });

  return isShown;
}

$('.modal').on('hidden.bs.modal', function () {  
    displayTutorFeedback();
})

//-----------------------------------------------------------------------
// Connection Functions

var genes = ["metallic","wings","forelimbs","hindlimbs"];
initializeUI(genes, targetSpecies);

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
  var message = replaceMessageArgs(tutorAction.message);
  console.log('Received tutor action: ' + message);
  tutorFeedbackQueue.push(message);
  displayTutorFeedback();
});

//-----------------------------------------------------------------------
// Button Handlers

function startSession() {

  randomOrganism();

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
  tutorFeedbackQueue = [];
  updateSessionStatus(null);
}

function submitOrganism() {

  updateAllelesFromDropdowns();
  var yourOrganism = new BioLogica.Organism(targetSpecies, yourOrganismAlleles, yourOrganismSex);
  var filename = imageUrlBase + yourOrganism.getImageName();  
  document.getElementById('yourOrganismImage').src = filename;

  var correct = (yourOrganism.getImageName() == targetOrganism.getImageName());

  if (correct) {
    var modal = $('#successModal').modal('show');
    modal.find('.modal-title').text('Good work!');
    modal.find('.modal-body').text('The drake you have created matches the target drake.');
  } else {
    var modal = $('#dangerModal').modal('show');
    modal.find('.modal-title').text("That's not the drake!");
    modal.find('.modal-body').text("The drake you have created doesn't match the target drake. Please try again.");
  }

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
        "correct": correct,
        "incrementMoves": true
      }
    }
  };
  // Send event to server
  socket.emit('event', JSON.stringify(event));
}

function randomOrganism() {

  targetOrganismSex = Math.floor(2 * Math.random());
  targetOrganism = new BioLogica.Organism(targetSpecies, "", yourOrganismSex);
  targetOrganism.species.makeAlive(targetOrganism);

  yourOrganismSex = targetOrganism.sex;
  yourOrganismAlleles = targetOrganism.getAlleleString();
  
  updateAlleleDropdowns(targetOrganism);

  var filename = imageUrlBase + targetOrganism.getImageName();
  console.info('image:' + filename);
  document.getElementById('targetOrganismImage').src = filename; 
  
  document.getElementById('yourOrganismImage').src = questionMarkImageUrl; 
}

function getUsername() {
  var username = document.getElementById("usernameInput").value;
  if (!username) {
    username = randomUsername();
    document.getElementById("usernameInput").value = username;
  }

  return username;
}

//-----------------------------------------------------------------------
// Helper Functions

function initializeUI(traits, species) {
  $('#targetOrganismHeader').text('Target ' + targetSpecies.name);
  $('#yourOrganismHeader').text('Target ' + targetSpecies.name);
  $('#submitOrganismButton').text('Submit ' + targetSpecies.name);
  $('#randomOrganismButton').text('Random ' + targetSpecies.name);
  
  createAlleleDropdowns(genes, species);
}

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

function replaceMessageArgs(msg) {
  return Mustache.render(msg.text, msg.args);
}

function displayTutorFeedback() {
    if (tutorFeedbackQueue.length == 0 || isModalOpen()) {      
      return;
    }

    var message = tutorFeedbackQueue.shift();
    if (message != null) {
      var modal = $('#infoModal').modal('show');
      modal.find('.modal-title').text("Tutor");
      modal.find('.modal-body').text(message);
    }
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
 
  var traitsLength = genes.length;
  for (var i = 0; i < traitsLength; i++) {

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

  document.getElementById("left-chromosomes").innerHTML = leftDropdowns;
  document.getElementById("right-chromosomes").innerHTML = rightDropdowns;
}

$(".dropdown-menu li a").click(function(){
  selectDropdownItem($(this).parents('.btn-group').find('.dropdown-toggle'), $(this));
});

function selectDropdownItem(dropdownToggle, selectedItem) {
  var selectedText = selectedItem.text();
  var selectedValue = selectedItem.attr('selected-allele');

  dropdownToggle.html(selectedText+' <span class="caret"></span>');
  dropdownToggle.attr('selected-allele', selectedValue);

  console.info('selected value:' + selectedValue);  
}

function updateAllelesFromDropdowns() {
  $('button.allele-selection').each(function(i, dropdown) {
    var selectedAllele = $(dropdown).attr('selected-allele');
    var side = selectedAllele.match(/[a-b]/);
    var gene = $(dropdown).attr('gene');    

    var allOptions = '(' + targetSpecies.geneList[gene].alleles.join('|') + ')';
    var regex = new RegExp(side + ':' + allOptions, '');
    yourOrganismAlleles = yourOrganismAlleles.replace(regex, selectedAllele);
  });
}

function updateAlleleDropdowns(organism) {
  var alleles = organism.getAlleleString();
  console.info('Set dropdowns to:' + alleles);
  $('button.allele-selection').each(function(i, dropdown) {
    console.log('dropdown ' + i + ': ' + $(dropdown).text());
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
      console.log(j + ': ' + $(item).attr('selected-allele'));
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
