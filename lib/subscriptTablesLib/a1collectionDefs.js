//  colTable holds colTableItems, but is used as a map, where
///  mongoName is the key
collTable = {};

masterTableDef_id = 'masterTableDefs';
MasterTableDefCollection = new Meteor.Collection(masterTableDef_id);

userId_fid = 'userId';

createCollection = function(mongoName){
  console.log('creating collection : '+mongoName);
  var coll = new Meteor.Collection(mongoName);
  collTable[mongoName] = coll;
};
