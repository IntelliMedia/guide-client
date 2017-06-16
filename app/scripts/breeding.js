initializeUI(targetGenes, targetSpecies);

function initializeUI(genes, species) {

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

  createAlleleDropdowns(genes, species);

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
      'danger',
      "That's not the drake!",
      "The drake you have created doesn't match the target drake. Please try again.");
  }

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

  yourInitialAlleles = BiologicaX.randomizeAlleles(targetSpecies, targetGenes, targetOrganism.getAlleleString());
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

function createAlleleDropdowns(genes, species) {

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

  $('#left-chromosomes').html(leftDropdowns);
  $('#right-chromosomes').html(rightDropdowns);
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

function selectDropdownItem(dropdownToggle, selectedItem) {
  var selectedText = selectedItem.text();
  var selectedValue = selectedItem.attr('selected-value');

  dropdownToggle.html(selectedText + ' <span class="caret"></span>');
  dropdownToggle.attr('selected-value', selectedValue);
}

function updateAllelesFromDropdowns() {
  $('button.allele-selection').each(function (i, dropdown) {
    var selectedAllele = $(dropdown).attr('selected-value');
    var gene = $(dropdown).attr('gene');

    yourOrganismAlleles = BiologicaX.replaceAllele(targetSpecies, gene, yourOrganismAlleles, selectedAllele);
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