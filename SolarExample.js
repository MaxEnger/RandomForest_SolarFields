// This script does not have any Training Data attached in the following code.
// To obtain the training data, please go to the example script hosted in GEE: https://code.earthengine.google.com/d1f770bcfffff6b4b658e0239c42419d

// Data Used
// States (Clip Image to Rhode Island)
// Image (Sentinel 2A - Image to Run Classification)
// Land Cover (National Land Cover Database for identifying underlying Land Cover)


// Filter to Rhode Island
var states = ee.FeatureCollection("TIGER/2018/States");
var ri = states.filter(ee.Filter.eq('NAME', 'Rhode Island'));
var region = ri.geometry();
Map.addLayer(ri);

// Get Sentinel 2a Image from May 24, 2020 and Filter to Rhode Island Boundary
var image = ee.ImageCollection("COPERNICUS/S2_SR");
var S2 = image.filterDate('2020-05-23', '2020-05-25')
            .filterBounds(ri);

// Printing Image Allows User to see the specific name of the image
print(S2);

// Mosaic the Image to stitch all parts and select relevant Bands
var mosaic = S2.mosaic().clip(ri).select("B2", "B3", "B4", "B8", "B11", "B12");
// Visualization Parameters
var rgbVis = {
  min: 0.0,
  max: 3000,
  bands: [ 'B4', 'B3', 'B2'],
};
Map.addLayer(mosaic,rgbVis, 'RI');

// Process Land Cover: Select Band and Clip to RI using clipToCol Function)
var clipToCol = function(image){
  return image.clip(ri);
};
var final_LC = LC.select('landcover').map(clipToCol)
Map.addLayer(final_LC)

//Random Forest Script-------------------------------------------------------------------------------

//Merge Feature Collections
var newfc = solar.merge(non_solar);
print(newfc);

// Now select the bands from the Sentinel-2A image to be used for training
var bands = ["B2", "B8", "B11", "B12"];

// Split sample data for training and validation
var sample = newfc.randomColumn();
var split = 0.8;  // Roughly 80% training, 20% testing.
var training = sample.filter(ee.Filter.lt('random', split));
var validationdata = sample.filter(ee.Filter.gte('random', split));

// Begin Training
var training = mosaic.sampleRegions({
  collection: newfc,
  properties: ['landuse'],
  scale: 10
});

// Make a Random Forest classifier and train it
var classifier = ee.Classifier.smileRandomForest(1000).train({
      features: training,
      classProperty: 'landuse',
      inputProperties: bands
    });

// Classify the input imagery.
var classified = mosaic.select(bands).classify(classifier);

// The following code will produce Variable Importance Metrics
var dict = classifier.explain();
print('Explain:',dict);

var variable_importance = ee.Feature(null, ee.Dictionary(dict).get('importance'));

var chart =
  ui.Chart.feature.byProperty(variable_importance)
    .setChartType('ColumnChart')
    .setOptions({
      title: 'Random Forest Variable Importance',
      legend: {position: 'none'},
      hAxis: {title: 'Bands'},
      vAxis: {title: 'Importance'}
    });

print(chart); 

var palette =['0000FF', 'ffa500'];

//Display Classification
Map.addLayer(classified, {min: 1, max: 2}, 'RF classification');

// Conduct the accuracy Accessment
var validation = classified.sampleRegions({
  collection: validationdata,
  properties: ['landuse'],
  scale: 30,
});
print(validation)
var testAccuracy = validation.errorMatrix('landuse', 'classification');
print('Error matrix: ', testAccuracy);
print('Validation overall accuracy: ', testAccuracy.accuracy());
print('Training kappa: ', testAccuracy.kappa());

//---------------------------------------------------------------------------------------

//Export the Land Cover image, specifying scale and region.
// Export.image.toDrive({
//   image: final_LC,
//   description: 'RI_LC',
//   scale: 30,
//   region: region,
//   crs: 'EPSG:4326',
//   fileFormat: 'GeoTIFF'
// });

// // Export the image, specifying scale and region.
// Export.image.toDrive({
//   image: classified,
//   description: 'RF_RI',
//   scale: 10,
//   region: ri,
//   crs: 'EPSG:4326',
//   fileFormat: 'GeoTIFF'
// });


// //Export the image, specifying scale and region.
// Export.image.toDrive({
//   image: mosaic,
//   description: 'RI_mosaic',
//   scale: 10,
//   region: ri,
//   crs: 'EPSG:4326',
//   fileFormat: 'GeoTIFF'
// });

// Export.table.toDrive({
//   collection: newfc,
//   description:'merged',
//   fileFormat: 'SHP'
// });





