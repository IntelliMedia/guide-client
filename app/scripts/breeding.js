var DefaultBreedingChallengeIdInput = "foo-bar";

var breedingGenes = ["metallic", "wings", "forelimbs", "armor"];
var breedingRandomAlleles = 4;

var motherOrganism = null;
var fatherOrganism = null;
var targetOrganism = null;

var clutchOrganisms = [];


var yourInitialAlleles = null;
var yourOrganismAlleles = null;
var yourOrganismSex = null;

initializeUI(breedingGenes, targetSpecies);

function initializeUI(genes, species) {

  console.info("Initialize Breeding challenge");

  $('#breedButton').on("click", breed);
  $('.randomizeButton').each(function () {
    $(this).on("click", randomize);
  });

  $('#motherOrganismHeader').text('Mother ' + targetSpecies.name);
  $('#targetOrganismHeader').text('Target ' + targetSpecies.name);
  $('#fatherOrganismHeader').text('Father ' + targetSpecies.name);

  createAlleleDropdowns($('#mother'), genes, species);
  createAlleleDropdowns($('#father'), genes, species);

  randomize();

  userNavigatedChallenge(getBreedingChallengeId());
}

function createAlleleDropdowns(organismDiv, genes, species) {

  var openDropdownHtml =
    `<div class="btn-groupId">
      <button class="btn dropdown-toggle allele-selection" type="button" data-toggle="dropdown" selected-value="" gene="{0}">select <span class="caret"></span></button>
        <ul class="dropdown-menu">`;

  var itemHtml = `<li><a gene="{1}" selected-value="{2}">{0}</a></li>`;

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
      leftDropdowns += sprintf(itemHtml, alleleName, genes[i], 'a:' + allele);
      rightDropdowns += sprintf(itemHtml, alleleName, genes[i], 'b:' + allele);
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

  var correct = (submittedOrganism.getImageName() == targetOrganism.getImageName());

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
    "challengeId": getBreedingChallengeId(),
    "challengeCriteria": {
      "offspringSex": sexToString(targetOrganism.sex),
      "offspringPhenotype": targetOrganism.phenotype.characteristics
    },
    "userSelections": {
      "motherAlleles": motherOrganism.getAlleleString(),
      "fatherAlleles": fatherOrganism.getAlleleString(),
      "offspringAlleles": submittedOrganism.getAlleleString(),
      "offspringSex": sexToString(submittedOrganism.sex)
    },
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
      var organism = BioLogica.breed(motherOrganism, fatherOrganism);
      organism.species.makeAlive(organism);
      clutchOrganisms.push(organism);
    }

    createClutchButtons(clutchOrganisms);
}

function sexToString(sex) {
  return (sex == 0 ? "Male" : "Female");
}

function randomize() {

  motherOrganism = new BioLogica.Organism(targetSpecies, "", Number(0));
  motherOrganism.species.makeAlive(motherOrganism);
  var motherFilename = imageUrlBase + motherOrganism.getImageName();
  $('#motherOrganismImage').attr('src', motherFilename);

  fatherOrganism = new BioLogica.Organism(targetSpecies, "", Number(1));
  fatherOrganism.species.makeAlive(fatherOrganism);
  var fatherFilename = imageUrlBase + fatherOrganism.getImageName();
  $('#fatherOrganismImage').attr('src', fatherFilename);

  targetOrganism = BioLogica.breed(motherOrganism, fatherOrganism);
  targetOrganism.species.makeAlive(targetOrganism);
  var targetFilename = imageUrlBase + targetOrganism.getImageName();
  $('#targetOrganismImage').attr('src', targetFilename);

  updateAlleleDropdowns($('#mother'), motherOrganism);
  updateAlleleDropdowns($('#father'), fatherOrganism);

  //yourInitialAlleles = BiologicaX.randomizeAlleles(targetSpecies, breedingGenes, targetOrganism.getAlleleString());
  //yourOrganismAlleles = yourInitialAlleles;
  //updateAlleleDropdowns(yourOrganismAlleles);
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
    onAlleleChanged(selectedItem.attr('gene'), selectedItem.attr('selected-value'));
  }
  selectDropdownItem(dropdownToggle, selectedItem);
});

function onAlleleChanged(geneName, allele) {
  console.info("Selected allele: " + geneName + "  allele: " + allele);

  var yourOrganism = new BioLogica.Organism(targetSpecies, yourOrganismAlleles, yourOrganismSex);
  yourOrganism.species.makeAlive(yourOrganism);

  var context = {
    "gene": geneName,
    "allele": allele
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
    var gene = $(dropdown).attr('gene');
    console.info("alleles: {0} => {1}", gene, selectedAllele);
    //yourOrganismAlleles = BiologicaX.replaceAllele(targetSpecies, gene, yourOrganismAlleles, selectedAllele);
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