

// define an object that holds instances of Mongo collections where each record in the
//   the collection is of type SimpleCsvRecordClass
	
if(Meteor.isClient){

	Template.simpleCsv.helpers({
		displayTableName: function(){
			if(this.displayTableName){
				return this.displayTableName;
			}
			return this[mongoId_fid];
		},
		// each table row is a record in the collection (this.collectionName) where the
		//  returned record from the coll.find().fetch() is an array values for each column.
		//  The first array element of the fetch is the header.
		tableRows: function(){
			// "this" is a mongo TableDef json record
			if(!this){
				return [];
			}

			// collName is mongo collection name
			var collName = this.collectionName;
			if(!collName){
				collName = this[mongoId_fid];
			}
			// get collection that holds simpleCsv records
			var coll = collTable[collName];

			var recs ;
			// get selectors
			if(coll){
				// find everything but the header
				recs =  coll.find({'_id':{$regex:'^((?!isHeader).)*$'}},{_id:0,data:1}).fetch();
			}else{
				return [];
			}
			if(recs.length<1)return [];

			var r = []; // this will be an array of arrays
			for(var i = 0;i<recs.length;i++){
				r.push(recs[i].data); // push the array data
			}

			console.log('totalRowNeeded.changed() called ');
			totalRowNeeded.changed();
			return r;
		},
		// to get tableColumns - which are dynamic - you need to find the tableRowRecord who has the word
		//   "isHeader" embedded somewhere it the _id field for that record
		//   
		headerCols : function(){
			if(!this){
				return [];
			}

			// collName is mongo collection name
			var collName = this.collectionName;
			if(!collName){
				collName = this[mongoId_fid];
			}
			// get table name
			var tn = this[mongoId_fid];

			// get json from mongo		
			var coll = collTable[collName];

			var recs ;
			// get selectors
			if(coll){
				recs =  coll.find({'_id':{$regex:'isHeader'}}).fetch();
			}else{
				return [];
			}
			if(recs.length<1){
				return [];
			}
			// get colums to show
			// the data field or the record whose _id contains the "isHeader"
			//   will contain all of the column names
			var colsToShow = recs[0].data; 
			return colsToShow;
		}

	});

	// template events for simpleCsv tables
	Template.simpleCsv.events({
		'click .recCalcSimpleCsvButton' : function(event){
			var mn = this[mongoId_fid];
			Meteor.call('meteorClientPublishChanged',mn);
		},
	});

		// this = an array of values to be displayed
		//  this is NOT a json object
	Template.simpleRowTemplate.helpers({
		tableFields: function(){
			return this;
		},
		// this = a selectorItem
		tableField: function(){
			doRegDep.changed();
			var cv = this;
			if(isNumber(cv)){
				// get the precision to see if it must be reduced
				var numSplit = (cv + "").split(".");
				if( numSplit.length>1){
					var precision = numSplit[1].length;
					if(precision>defaultAggregateColumnPrecision){
						cv = Math.round(cv*defaultAggMultiplier)/defaultAggMultiplier;
					}
				}
			}
			return cv;
		},
		fieldAlignmentClass: function(){
			var cv = this;
			if(isNumber(cv)){
				return "text-right";
			}
			return "text-left";
		},
		
	});

}// end of Meteor.isClient)