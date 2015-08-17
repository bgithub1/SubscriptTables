//  colTable holds colTableItems, but is used as a map, where
///  mongoName is the key
collTable = {};

masterTableDef_id = 'masterTableDefs';
MasterTableDefCollection = new Meteor.Collection(masterTableDef_id);

applicationCollection_id = 'applicationName';
applicationCollection_key = 'appName';
ApplicationNameCollection = new Meteor.Collection(applicationCollection_id);



getApplicationName = function(){
  var findObj = {};
  findObj._id = applicationCollection_key;
  var nameArr = ApplicationNameCollection.find(findObj).fetch();
  if(nameArr && nameArr.length>0){
    return nameArr[0].value;
  }else{
    return null;
  }
};

userId_fid = 'userId';

createCollection = function(mongoName){
  console.log('creating collection : '+mongoName);
  var coll = new Meteor.Collection(mongoName);
  collTable[mongoName] = coll;
};



Books = new Mongo.Collection("books");
Books.attachSchema(new SimpleSchema({
  title: {
    type: String,
    label: "Title",
    max: 200
  },
  author: {
    type: String,
    label: "Author"
  },
  copies: {
    type: Number,
    label: "Number of copies",
    min: 0
  },
  lastCheckedOut: {
    type: Date,
    label: "Last date this book was checked out",
    optional: true
  },
  summary: {
    type: String,
    label: "Brief summary",
    optional: true,
    max: 1000
  }
}));


