const DefaultEggDropChallengeIdInput = "eggDrop-wings";

var targetGenes = ["metallic", "wings", "forelimbs", "armor"];
var targetSpecies =BioLogica.Species.Drake;

var targetOrganism = null;
var basketGeneIndex = 0;

initialize(targetGenes, targetSpecies);

function initialize(targetGenes, targetSpecies) {
    console.info("Initialize Egg Drop challenege");

    $('.randomOrganismButton').each(function () {
        $(this).on("click", randomOrganism);
    });

    randomOrganism();

    userNavigatedChallenge(getEggDropChallengeId());
}

function getEggDropChallengeId() {
    var challengeId = $('#eggDropChallengeIdInput').val();
    if (!challengeId) {
        challengeId = DefaultEggDropChallengeIdInput;
        $('#eggDropChallengeIdInput').val(challengeId);
    }

    return challengeId;
}

function submitEgg(sex, gene, characteristic) {

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
            'error',
            "That's not the drake!",
            "The basket you selected doesn't match the egg. Please try again.");
    }

    var selectedPhenotype = {};
    selectedPhenotype[gene] = characteristic;

    var context = {
        "challengeId": getEggDropChallengeId(),
        "challengeCriteria": {
            "sex": organismSex,
            "alleles": targetOrganism.getAlleleString()
        },
        "userSelections": {
            "sex": sex,
            "phenotype": selectedPhenotype
        },
        "classId": getClassId(),
        "groupId": getGroupId(),        
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

function getEggDropChallengeId() {
    var challengeId = $('#eggDropChallengeIdInput').val();
    if (!challengeId) {
        challengeId = DefaultEggDropChallengeIdInput;
        $('#eggDropChallengeIdInput').val(challengeId);
    }

    return challengeId;
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
    $("#egg-drop-buttons .btn").each(function (i, dropdown) {
        var sex = i % 2 == 0 ? "Male" : "Female";
        var traitIndex = i < 2 ? 0 : 1;
        var traits = [basketGeneInfo.alleles[0], basketGeneInfo.alleles[1]];
        if (basketGene.includes("metallic")) {
            traits = ["Metallic", "Nonmetallic"];
        } else if (species.traitRules[basketGene]) {
            traits = Object.keys(species.traitRules[basketGene]);
        }
        var characterisitic = traits[traitIndex];

        $(this).attr("sex", sex);
        $(this).attr("characteristic", characterisitic);
        $(this).attr("gene", basketGene);
        $(this).html(sex + " - " + characterisitic);
    });
}

$("#egg-drop-buttons .btn").click(function () {
    var sex = $(this).attr("sex");
    var gene = $(this).attr("gene");
    var characteristic = $(this).attr("characteristic");

    console.info("Basket button pressed: %s - %s",
        sex, gene, characteristic);

    submitEgg(sex, gene, characteristic);
});

function sexToString(sex) {
    return (sex == 0 ? "Male" : "Female");
  }
