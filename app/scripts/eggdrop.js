const DefaultEggDropChallengeIdInput = "eggDrop-wings";

var editableCharacteristics = ["metallic", "wings", "forelimbs", "armor"];
var targetSpecies =BioLogica.Species.Drake;

var targetOrganism = null;
var basketCharacteristicIndex = 0;

initialize(editableCharacteristics, targetSpecies);

function initialize(editableCharacteristics, targetSpecies) {
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

function submitEgg(sex, characteristic, targetTrait) {

    var organismSex = sexToString(targetOrganism.sex);
    var correct = (organismSex == sex
        && BiologicaX.getCharacteristic(targetOrganism, characteristic) == targetTrait);

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

    let targetCharacteristic = (characteristic == "metallic" ? "color" : characteristic);
    if (characteristic == "metallic") {
        if (targetTrait.toLowerCase() == "metallic") {
            targetTrait = BiologicaX.getTraitFromAlleles(targetOrganism.species, ["a:M", "b:M"]);
        } else {
            targetTrait = BiologicaX.getTraitFromAlleles(targetOrganism.species, ["a:m", "b:m"]);
        }
    }
    let phenotype = {};
    phenotype[targetCharacteristic] = targetTrait;
    var selectedAlleles = targetOrganism.getAlleleStringForTrait(targetCharacteristic);

    var context = {
        "challengeType": "Hatchery",
        "challengeId": getEggDropChallengeId(),
        "challengeCriteria": {
            "sex": organismSex,
            "phenotype": phenotype
        },
        "userSelections": {
            "sex": sex,
            "alleles": selectedAlleles
        },
        "selectableAttributes": ["sex", characteristic],
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

    updateEggDropControls(editableCharacteristics, targetOrganism);
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

function updateEggDropControls(characteristics, organism) {

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

    var characteristicsLength = characteristics.length;
    for (var i = 0; i < characteristicsLength; i++) {

        var characteristicInfo = species.geneList[characteristics[i]];
        if (characteristicInfo == null || characteristicInfo.length == 0) {
            console.warn("Unable to find alleles for " + characteristics[i]);
            continue;
        }

        var leftAllele = BiologicaX.findAllele(species, alleles, "a", characteristics[i]).replace("a:", "");
        leftDropdowns += sprintf(itemHtml, species.alleleLabelMap[leftAllele])

        var rightAllele = BiologicaX.findAllele(species, alleles, "b", characteristics[i]).replace("b:", "");
        rightDropdowns += sprintf(itemHtml, species.alleleLabelMap[rightAllele]);
    }

    leftDropdowns += closeHtml;
    rightDropdowns += closeHtml;

    $('#left-egg-chromosomes').html(leftDropdowns);
    $('#right-egg-chromosomes').html(rightDropdowns);
    $('#egg-sex').text(sex);

    var basketCharacteristic = characteristics[(basketCharacteristicIndex++ % characteristics.length)];
    var basketCharacteristicInfo = species.geneList[basketCharacteristic];

    // Update basket buttons
    $("#egg-drop-buttons .btn").each(function (i, dropdown) {
        var sex = i % 2 == 0 ? "Male" : "Female";
        var traitIndex = i < 2 ? 0 : 1;
        var traits = [basketCharacteristicInfo.alleles[0], basketCharacteristicInfo.alleles[1]];
        if (basketCharacteristic.includes("metallic")) {
            traits = ["Metallic", "Nonmetallic"];
        } else if (species.traitRules[basketCharacteristic]) {
            traits = Object.keys(species.traitRules[basketCharacteristic]);
        }
        var characterisitic = traits[traitIndex];

        $(this).attr("sex", sex);
        $(this).attr("trait", characterisitic);
        $(this).attr("characteristic", basketCharacteristic);
        $(this).html(sex + " - " + BiologicaX.getDisplayName(characterisitic));
    });
}

$("#egg-drop-buttons .btn").click(function () {
    var sex = $(this).attr("sex");
    var characteristic = $(this).attr("characteristic");
    var targetTrait = $(this).attr("trait");

    console.info("Basket button pressed: %s - %s",
        sex, characteristic, targetTrait);

    submitEgg(sex, characteristic, targetTrait);
});

function sexToString(sex) {
    return (sex == 0 ? "Male" : "Female");
}
