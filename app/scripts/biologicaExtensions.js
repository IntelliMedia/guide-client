BioLogica.Organism.prototype.getAllelesAndLabels = function(trait) {
  var map = new Map();

  var alleleValues = this.species.geneList[trait].alleles;
  alleleValues.forEach((function(alleleValue) {
    var alleleLabel = this.species.alleleLabelMap[alleleValue];
    map[alleleLabel] = alleleValue
  }).bind(this));  

  return map;
};

BioLogica.Organism.prototype.getCurrentAlleleInfo = function(trait) {
    
    //var alleles = this.genetics.getAlleleStringForTrait(trait);
    var alleles = this.genetics.genotype.getAlleleString([trait], this.genetics);
    console.info("allele: " + JSON.stringify(alleles));
    var sides = alleles.split(',');
    var leftSide = sides[0].split(':');
    var rightSide = sides[1].split(':');

    var chrom = this.genetics.findChromosome(leftSide[1]);

    return {
        'trait': trait,
        'chromName': chrom,
        'leftSide': leftSide[0],
        'leftAllele': leftSide[1],
        'rightSide': rightSide[0],
        'rightAllele': rightSide[1]
        
    }
}

BioLogica.Organism.prototype.setAllele = function(trait, side, newAllele) {

/*
  var allele = organism.genetics.getAlleleStringForTrait("wings");
  console.info("allele: " + JSON.stringify(allele));
  var chrom = organism.genetics.findChromosome('w');
  console.info("chrom: " + JSON.stringify(chrom));
  //organism.genetics.genotype.replaceAlleleChromName(1, "a", "w", "w");

  //console.info("info: " + JSON.stringify(organism.getGenotype().chromosomes[1]));
  //console.info("info: " + JSON.stringify(organism.getGenotype().chromosomes[2]));
*/

  var allele = organism.genetics.getAlleleStringForTrait("wings");
  console.info("allele: " + JSON.stringify(allele));
  var chrom = organism.genetics.findChromosome('w');
  console.info("chrom: " + JSON.stringify(chrom));

  this.genetics.genotype.replaceAlleleChromName(chrom, side, "w", newAllele);
};