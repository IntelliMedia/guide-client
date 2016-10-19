BioLogica.Organism.prototype.getAllelesAndLabels = function(trait) {
  var map = new Map();

  var alleleValues = this.species.geneList[trait].alleles;
  alleleValues.forEach((function(alleleValue) {
    var alleleLabel = this.species.alleleLabelMap[alleleValue];
    map[alleleLabel] = alleleValue
  }).bind(this));  

  return map;
};