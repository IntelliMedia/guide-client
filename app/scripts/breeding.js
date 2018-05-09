var DefaultBreedingChallengeIdInput = "clutch-5drakes-intermediateTraits";

var editableCharacteristics = ["metallic", "wings", "forelimbs", "hindlimbs", "horns", "color", "gray", "armor"];
var targetSpecies = BioLogica.Species.Drake;
var breedingRandomAlleles = 4;

var organismsByRole = {
  mother: null,
  father: null,
  target: null
}

var clutchOrganisms = [];

initializeUI(editableCharacteristics, targetSpecies);

function initializeUI(characteristics, species) {

  console.info("Initialize Breeding challenge");

  $('#breedButton').on("click", breed);
  $('#newTrialButton').on("click", newTrial);
  $(".randomize-button").click(function () {
    randomize($(this).attr("target"));
  });

  createAlleleDropdowns("mother", characteristics, species);
  createAlleleDropdowns("father", characteristics, species);

  newTrial();

  userNavigatedChallenge(getBreedingChallengeId());
}

function createAlleleDropdowns(name, characteristics, species) {

  var organismDiv = $("#" + name);

  var openDropdownHtml =
    `<div class="btn-groupId">
      <button class="btn dropdown-toggle allele-selection" type="button" data-toggle="dropdown" selected-value="" characteristic="{0}">select <span class="caret"></span></button>
        <ul class="dropdown-menu">`;

  var itemHtml = `<li><a role="{3}" characteristic="{1}" selected-value="{2}">{0}</a></li>`;

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
      leftDropdowns += sprintf(itemHtml, alleleName, characteristics[i], 'a:' + allele, name);
      rightDropdowns += sprintf(itemHtml, alleleName, characteristics[i], 'b:' + allele, name);
    }

    leftDropdowns += closeDropdownHtml;
    rightDropdowns += closeDropdownHtml;
  }

  organismDiv.find('.left-chromosomes').html(leftDropdowns);
  organismDiv.find('.right-chromosomes').html(rightDropdowns);
}

function createClutchButtons(clutchOrganisms) {

  var clutchDiv = $('#clutch');
  clutchDiv.html("");

  var itemHtml = 
    '<button id="clutch-{0}" clutch="{0}" class="btn btn-default submit-button"><img src="{1}" width="100"/></button>';

  var clutchHtml = "";

  var clutchLength = clutchOrganisms.length;
  for (var i = 0; i < clutchLength; i++) {
    clutchHtml += sprintf(itemHtml, i, imageUrlBase + clutchOrganisms[i].getImageName());
  }

  clutchDiv.html(clutchHtml);

  clutchDiv.find('.submit-button').click(function() {
    submitOffspring($(this).attr("clutch"));
  });
}

function submitOffspring(offspringIndex) {
  var submittedOrganism = clutchOrganisms[offspringIndex];

  console.info("Submit " + submittedOrganism.getImageName());  

  var correct = (submittedOrganism.getImageName() == organismsByRole.target.getImageName());

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
    "challengeType": "Breeding",
    "challengeId": getBreedingChallengeId(),
    "target": {
      "sex": sexToString(organismsByRole.target.sex),
      "phenotype": organismsByRole.target.phenotype.characteristics
    },
    "species": submittedOrganism.species.name,
    "selected": {
      "motherAlleles": organismsByRole.mother.getAlleleString(),
      "fatherAlleles": organismsByRole.father.getAlleleString(),
      "offspringAlleles": submittedOrganism.getAlleleString(),
      "offspringSex": sexToString(submittedOrganism.sex)
    },
    "selectableAttributes": selectableAttributes,
    "classId": getClassId(),
    "groupId": getGroupId(),
    "correct": correct
  };

  SendGuideEvent(
    "USER",
    "SUBMITTED",
    "OFFSPRING",
    context);
}

function breed() {
    clutchOrganisms = [];
    for(var i = 0; i < 8; ++i) {
      var offspring = BioLogica.breed(organismsByRole.mother, organismsByRole.father, true);
      offspring.species.makeAlive(offspring);
      clutchOrganisms.push(offspring);
    }

    createClutchButtons(clutchOrganisms);
}

function sexToString(sex) {
  return (sex == 0 ? "Male" : "Female");
}

function newTrial() {

  organismsByRole.mother = new BioLogica.Organism(targetSpecies, "", BioLogica.FEMALE);
  organismsByRole.mother.species.makeAlive(organismsByRole.mother);
  updateOrganismImage("mother");
  updateAlleleDropdowns($('#mother'), organismsByRole.mother);

  organismsByRole.father = new BioLogica.Organism(targetSpecies, "", BioLogica.MALE);
  organismsByRole.father.species.makeAlive(organismsByRole.father);
  updateOrganismImage("father");
  updateAlleleDropdowns($('#father'), organismsByRole.father);

  organismsByRole.target = BioLogica.breed(organismsByRole.mother, organismsByRole.father, true);
  organismsByRole.target.species.makeAlive(organismsByRole.target);
  updateOrganismImage("target");
}

function randomize(target) {

  console.info("Randomize: " + target);
  if (target == "mother") {
    organismsByRole.mother = new BioLogica.Organism(targetSpecies, "", Number(0));
    organismsByRole.mother.species.makeAlive(organismsByRole.mother);
    updateOrganismImage("mother");
    updateAlleleDropdowns($('#mother'), organismsByRole.mother);
  } else if (target == "father") {
    organismsByRole.father = new BioLogica.Organism(targetSpecies, "", Number(1));
    organismsByRole.father.species.makeAlive(organismsByRole.father);
    updateOrganismImage("father");
    updateAlleleDropdowns($('#father'), organismsByRole.father);
  } else {
    console.error("Unknown randomize target: " + target);
  }
}

function updateOrganismImage(name) {
  var filename = imageUrlBase + organismsByRole[name].getImageName();
  $("#"+name).find("img").attr('src', filename);
}

function getBreedingChallengeId() {
  var challengeId = $('#breedingChallengeIdInput').val();
  if (!challengeId) {
    challengeId = DefaultBreedingChallengeIdInput;
    $('#breedingChallengeIdInput').val(challengeId);
  }

  return challengeId;
}

$(".dropdown-menu li a").click(function () {
  var dropdownGroup = $(this).parents('.btn-groupId');
  var dropdownToggle = dropdownGroup.find('.dropdown-toggle');
  var selectedItem = $(this);

  if (dropdownGroup.find(".allele-selection").length > 0
    && selectedItem.attr('selected-value') != dropdownToggle.attr('selected-value')) {
    onAlleleChanged(
      selectedItem.attr('role'), 
      selectedItem.attr('characteristic'), 
      selectedItem.attr('selected-value'));
  }
  selectDropdownItem(dropdownToggle, selectedItem);
});

function onAlleleChanged(role, characteristic, newAllele) {
  console.info("Selected %s's %s -> %s", role, characteristic, newAllele);

  var alleles = organismsByRole[role].getAlleleString();
  alleles = BiologicaX.replaceAllele(organismsByRole[role].species, characteristic, alleles, newAllele);
  organismsByRole[role] = new BioLogica.Organism(organismsByRole[role].species, alleles, organismsByRole[role].sex);
  organismsByRole[role].species.makeAlive(organismsByRole[role]);
  updateOrganismImage(role);

  var context = {
    "characteristic": characteristic,
    "allele": newAllele
  };

  SendGuideEvent(
    "USER",
    "CHANGED",
    "ALLELE",
    context);
}

function updateAllelesFromDropdowns(organismDiv, organism) {
  organismDiv.find('button.allele-selection').each(function (i, dropdown) {
    var selectedAllele = $(dropdown).attr('selected-value');
    var characteristic = $(dropdown).attr('characteristic');
    console.info("alleles: {0} => {1}", characteristic, selectedAllele);
    //yourOrganismAlleles = BiologicaX.replaceAllele(targetSpecies, characteristic, yourOrganismAlleles, selectedAllele);
  });
}

function selectDropdownItem(dropdownToggle, selectedItem) {
  var selectedText = selectedItem.text();
  var selectedValue = selectedItem.attr('selected-value');

  dropdownToggle.html(selectedText + ' <span class="caret"></span>');
  dropdownToggle.attr('selected-value', selectedValue);
}

function updateAlleleDropdowns(organismDiv, organism) {
  organismDiv.find('button.allele-selection').each(function (i, dropdown) {
    var item = getDropdownItem($(this), dropdown, organism.getAlleleString());
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