const DefaultChromosomeChallengeIdInput = "allele-targetMatch-visible-simpleDom";

var editableCharacteristics = ["metallic", "wings", "forelimbs", "armor"];
var targetSpecies =BioLogica.Species.Drake;

var minRandomAlleles = 4;
var maxRandomAlleles = 10;

var targetOrganism = null;
var yourInitialAlleles = null;
var yourOrganismAlleles = null;
var yourOrganismSex = null;

initializeUI(editableCharacteristics, targetSpecies);

function initializeUI(characteristics, species) {

  console.info("Initialize Chromosomes challenege");

  $('#submitOrganismButton').on("click", submitOrganism);
  $('.randomOrganismButton').each(function () {
    $(this).on("click", randomOrganism);
  });


  $('#targetOrganismHeader').text('Target ' + targetSpecies.name);
  $('#yourOrganismHeader').text('Your ' + targetSpecies.name);
  $('#submitOrganismButton').text('Submit ' + targetSpecies.name);
  $('.randomOrganismButton').each(function () {
    $(this).text('Random ' + targetSpecies.name);
  });

  createAlleleDropdowns(characteristics, species);

  randomOrganism();

  userNavigatedChallenge(getChromosomeChallengeId());
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
      'error',
      "That's not the drake!",
      "The drake you have created doesn't match the target drake. Please try again.");
  }

  var selectableAttributes = ["sex"].concat(editableCharacteristics);

  var context = {
    "challengeId": getChromosomeChallengeId(),
    "challengeCriteria": {
      "sex": sexToString(targetOrganism.sex),
      "phenotype": targetOrganism.phenotype.characteristics
    },
    "userSelections": {
      "alleles": yourOrganism.getAlleleString(),
      "sex": sexToString(yourOrganism.sex)
    },
    "selectableAttributes": selectableAttributes,
    "classId": getClassId(),
    "groupId": getGroupId(),    
    "correct": correct,
    "incrementMoves": true
  };

  SendGuideEvent(
    "USER",
    "SUBMITTED",
    "ORGANISM",
    context);
}

function sexToString(sex) {
  return (sex == 0 ? "Male" : "Female");
}

function randomOrganism() {

  var targetOrganismSex = Math.floor(2 * Math.random());
  targetOrganism = new BioLogica.Organism(targetSpecies, "", Number(targetOrganismSex));
  targetOrganism.species.makeAlive(targetOrganism);

  yourInitialAlleles = BiologicaX.randomizeAlleles(targetSpecies, editableCharacteristics, targetOrganism.getAlleleString());
  yourOrganismAlleles = yourInitialAlleles;
  updateAlleleDropdowns(yourOrganismAlleles);
  updateSexDropdown(targetOrganismSex == 0 ? "1" : "0");

  var filename = imageUrlBase + targetOrganism.getImageName();
  $('#targetOrganismImage').attr('src', filename);

  $('#yourOrganismImage').attr('src', questionMarkImageUrl);
}

function getChromosomeChallengeId() {
  var challengeId = $('#chromosomeChallengeIdInput').val();
  if (!challengeId) {
    challengeId = DefaultChromosomeChallengeIdInput;
    $('#chromosomeChallengeIdInput').val(challengeId);
  }

  return challengeId;
}

function createAlleleDropdowns(characteristics, species) {

  var openDropdownHtml =
    `<div class="btn-groupId">
      <button class="btn dropdown-toggle allele-selection" type="button" data-toggle="dropdown" selected-value="" characteristic="{0}">select <span class="caret"></span></button>
        <ul class="dropdown-menu">`;

  var itemHtml = `<li><a characteristic="{1}" selected-value="{2}">{0}</a></li>`;

  var closeDropdownHtml =
    `   </ul>
    </div>
    <p>`;

  var leftDropdowns = "";
  var rightDropdowns = "";

  var characteristicsLength = characteristics.length;
  for (var i = 0; i < characteristicsLength; i++) {

    var characteristicInfo = species.geneList[characteristics[i]];
    if (characteristicInfo == null || characteristicInfo.length == 0) {
      console.warn("Unable to find alleles for " + characteristics[i]);
      continue;
    }

    leftDropdowns += sprintf(openDropdownHtml, characteristics[i]);
    rightDropdowns += sprintf(openDropdownHtml, characteristics[i]);

    var allelesLength = characteristicInfo.alleles.length;
    for (var j = 0; j < allelesLength; ++j) {
      var allele = characteristicInfo.alleles[j];
      var alleleName = species.alleleLabelMap[allele];
      leftDropdowns += sprintf(itemHtml, alleleName, characteristics[i], 'a:' + allele);
      rightDropdowns += sprintf(itemHtml, alleleName, characteristics[i], 'b:' + allele);
    }

    leftDropdowns += closeDropdownHtml;
    rightDropdowns += closeDropdownHtml;
  }

  $('#left-chromosomes').html(leftDropdowns);
  $('#right-chromosomes').html(rightDropdowns);
}

$(".dropdown-menu li a").click(function () {
  var dropdownGroup = $(this).parents('.btn-groupId');
  var dropdownToggle = dropdownGroup.find('.dropdown-toggle');
  var selectedItem = $(this);

  if (dropdownGroup.find(".allele-selection").length > 0
    && selectedItem.attr('selected-value') != dropdownToggle.attr('selected-value')) {
    onAlleleChanged(selectedItem.attr('characteristic'), selectedItem.attr('selected-value'));
  }
  selectDropdownItem(dropdownToggle, selectedItem);
});

function onAlleleChanged(characteristicName, allele) {
  console.info("Selected allele: " + characteristicName + "  allele: " + allele);

  var yourOrganism = new BioLogica.Organism(targetSpecies, yourOrganismAlleles, yourOrganismSex);
  yourOrganism.species.makeAlive(yourOrganism);

  var context = {
    "characteristic": characteristicName,
    "allele": allele
  };

  SendGuideEvent(
    "USER",
    "CHANGED",
    "ALLELE",
    context);
}

function selectDropdownItem(dropdownToggle, selectedItem) {
  var selectedText = selectedItem.text();
  var selectedValue = selectedItem.attr('selected-value');

  dropdownToggle.html(selectedText + ' <span class="caret"></span>');
  dropdownToggle.attr('selected-value', selectedValue);
}

function updateAllelesFromDropdowns() {
  $('button.allele-selection').each(function (i, dropdown) {
    var selectedAllele = $(dropdown).attr('selected-value');
    var characteristic = $(dropdown).attr('characteristic');

    yourOrganismAlleles = BiologicaX.replaceAllele(targetSpecies, characteristic, yourOrganismAlleles, selectedAllele);
  });
}

function updateSexFromDropdown() {
  $('button.sex-selection').each(function (i, dropdown) {
    var value = $(dropdown).attr('selected-value');
    yourOrganismSex = (value ? Number(value) : 0);
  });
}

function updateSexDropdown(sex) {
  $('button.sex-selection').each(function (i, dropdown) {
    var item = getDropdownItem($(this), dropdown, sex);
    if (item == null) {
      item = getRandomDropdownItem($(this), dropdown);
    }
    selectDropdownItem($(dropdown), $(item));
  });
}

function updateAlleleDropdowns(alleles) {
  $('button.allele-selection').each(function (i, dropdown) {
    var item = getDropdownItem($(this), dropdown, alleles);
    if (item == null) {
      item = getRandomDropdownItem($(this), dropdown);
    }
    selectDropdownItem($(dropdown), $(item));
  });
}

function getDropdownItem(context, dropdown, value) {
  var selectedItem = null;

  context.parent(dropdown).find('a').each(function (j, item) {
    if (value.includes($(item).attr('selected-value'))) {
      selectedItem = item;
      return false;
    }
  });

  return selectedItem;
}

function getRandomDropdownItem(context, dropdown) {
  var items = context.parent(dropdown).find('a');
  return items[ExtMath.randomInt(items.length)];
}