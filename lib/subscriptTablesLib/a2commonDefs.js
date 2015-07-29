defaultAggregateColumnPrecision=5;
defaultAggMultiplier = Math.pow(10,defaultAggregateColumnPrecision);
meteorValidatorCollectionName = 'com.billybyte.meteorjava.MeteorValidator';
DECIMAL_POINT_REPLACE = "__";
applicationTitle = "SubscriptTables";

/* ******************************************************************
	a2commonDefs.js 
	Class definitions and functions that are used by server and client.
	the "a2" part of the name is to control how Meteor loads the classes in 
	the subscriptTablesLib folder.
**********************************************************************/

// helper routine to make single property json objects that can be used
//   in mongo db.collection.find() operations
mongoSelectionObject = function(fieldName,fieldValue){
	this[fieldName]=fieldValue;
};


// selectorItemCacheClass is a class that is used mostly by the client
//  to cache selectorItems that we use during filter operations.
// For each table that is being shown, the selectorItemCache
//  acts as a temporary place to put select items for each table.
//  The cache holds a hashTable of hashTables for each collection that
//  you are displaying in a table.  Using an inner hashTable instead of
//  an array prevents duplicates from going into the filter chain.
//  Clicking on the filter button clears the cache's inner hashTable
//  for that table.
selectorItemCacheClass = function(){
	this.outerHash = new hashTable(); // this is a hashTable of selectorFilterHash objects.  
										//	The keys are mongoNames
										// the values are selectorFilterHash objects, which is
										//  an object that holds a hashTable of hashSets.
										//  The keys of selectorFilterHash's hashTable are field names
										//  (columns) have been selected to filter on.  
										//  The values of selectorFilterHash's hashTable are 
										//  hashSets that contain the actual values to filter.  
										//  Those values will go into the $in clause of the mongo
										//  selection object which populating the table.
	

	this.dependsHash = new hashTable();  // this holds Meteor Deps that allow the tables to 
	
										// to react to changes in the selectorItmeCacheClass 
	
	//  push the field and value to a innerHash instance
	this.pushSelectorItem = function(selectorItem){
		var mongoName = selectorItem.mongoName;
		// get inner hashtable
		var innerHashForThisMongoName = this.getSelectorItemsHash(mongoName);
		var cName = selectorItem.columnName;
		var cValue = selectorItem.columnValue;
		if(_.isNumber(cValue)){
			cValue = parseFloat(cValue);
		}
		innerHashForThisMongoName.pushFilter(cName,cValue);
		var dep = this.dependsHash.get(mongoName);
		dep.changed();
	};

	this.getDepends = function(mongoName){
		var dep = this.dependsHash.get(mongoName);
		if(dep){
			dep.depend();
		}
	};

	this.getSelectorItemsHash = function(mongoName){
		if(!mongoName){
			console.log('no mongoName while pushing selectorItem = '+selectorItem);
			return null;
		}

		var ret = this.outerHash.get(mongoName);
		// if there isn't an inner hashTable yet, make one.
		if(!ret){
			// make a new one
			ret = new selectorFilterHash();
			this.outerHash.put(mongoName, ret);
			// make a new Deps.Dependency for this mongoName
			this.dependsHash.put(mongoName,new Deps.Dependency());
		}
		return ret;
	};

	this.getMongoSelectorWithIn = function(mongoName){
		var itemsHash = this.getSelectorItemsHash(mongoName);
		return itemsHash.getMongoSelectorWithIn();
	};

	this.clearSelectorItems = function(mongoName){
		var clearedHash = new selectorFilterHash();
		this.outerHash.put(mongoName,clearedHash);
		this.dependsHash.get(mongoName).changed();
		return;
	};

	this.toString = function(mongoName){
		var sItems  = this.getSelectorItemsHash(mongoName);
		return sItems.toString();
	};

};


// selectorFilterHash is used by selectorItemCacheClass.  These objects
//  are stored in the this.outerHash member variable of selectorItemCacheClass.
// selectorFilterHash contains a hashTable with keys= to column names and
//    values = to hashSets of filters
selectorFilterHash = function(){
		// this hashTable holds hashSets
		this.ht = new hashTable();
		// return a hashSet of filters to use as mongoSelectors
		this.getField = function(field){
			var ret = this.ht.get(field);
			if(!ret){
				// if not hashSet yet, then return a blank one;
				ret = new hashSet();
				this.ht.put(field,ret);
			}
			return ret;
		};

		// add a filter for this field
		this.pushFilter = function(field,valueToFilter){
			// get the hashSet for this field
			var filterHash = this.getField(field);
			// add an element to it
			filterHash.add(valueToFilter);
			// put it back to the main hashTable for this selectorFilterHash instance
			this.ht.put(field,filterHash);
		};

		// create a mongo selector for all filters for all fields
		this.getMongoSelectorWithoutIn = function(){
			// return will have properties = to field names,
			//  and values equal to arrays of fitlers
			var ret = {};
			// the keyset is of field names
			var keyset = this.ht.keySet();
			// for each field name, get a hashSet
			for(var i = 0; i<keyset.length; i++){
				var field = keyset[i];
				var filterSet = this.ht.get(field);
				if(filterSet.count()>0){
					// if there are filter values inside this filter hashset, put them
					// into the return object
					ret[field] = filterSet.values();
				}
			}
			return ret;
		};

		// construct a mongo selector that has multiple fields followed by
		//   $in clauses. 
		//  Example: {'last':{$in:['Smith','Jones']},'state':{$in:['CT','NY']}}
		this.getMongoSelectorWithIn = function(){
			var selectorObjectWithoutIn = this.getMongoSelectorWithoutIn();
			var selectorObjectWithIn = convertMongoSelector(selectorObjectWithoutIn);
			return selectorObjectWithIn;
		};


		this.toString = function(){
			var ret = "";
			var fieldArr = this.ht.keySet();
			for(var i = 0; i<fieldArr.length; i++){
				var field = fieldArr[i];
				var filterSet = this.ht.get(field);
				ret = ret + field+":"+filterSet.values() + " ; ";
			}
			return ret;
		};

};

// convertMongoSelector is a helper function that converts a mongoSelector json object
//   into a json object where, for each property that you will search for during
//   a db.collectionName.find() operation, the values to search for are listed in an array
//   and that array is itself the value of a json object whose property is "$in" .
///  e.g - 
//   var selWithInClause = convertMongoSelector({'lastName':['Smith','Jones']});
//   selWithInClause will be a json object as follows: {'lastName':{'$in':['Smith','Jones']}}
//   var recordsFound = db.collectionName.find(selWithInClause);
convertMongoSelector = function(selectorWithoutIns){

	if(!selectorWithoutIns || _.keys(selectorWithoutIns).length<=0 ){
		return {};
	}

	var ret = {};
	for(var selProp in selectorWithoutIns){
		var arrayOfSelectorValues = selectorWithoutIns[selProp];
		var arr = [];
		for(var l=0;l<arrayOfSelectorValues.length;l++){
			var value = arrayOfSelectorValues[l];
			if(isNumber(value)){
				arr.push(parseFloat(value));
			}else{
				arr.push(value);
			}
		}
		var inArray = {$in:arr};
		ret[selProp] = inArray;
	}
	return ret;

};

isNumber = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};


addPropToObj = function(obj,fieldName,value){
	obj[fieldName]=value;
};

jsonObj = function(jsonFieldValuePairArr){
	for(var i = 0;i<jsonFieldValuePairArr.length;i++){
		var field = jsonFieldValuePairArr[i];
	}
};

mongoSetOperator = function(jsonObj){
	return {'$set':jsonObj};
};

mongoUpdate = function(mongoCollection,sourceMongoObj,jsonObjOfFieldsToUpdate){
	var setObj = mongoSetOperator(jsonObjOfFieldsToUpdate);
	var id = sourceMongoObj[mongoId_fid];
	var idObj = {mongoId_fid:id};
	mongoCollection.update(idObj,setObj);
};

mongoUpdateFromSelector = function(mongoCollection,mongoSelector,jsonObjOfFieldsToUpdate){
	var setObj = mongoSetOperator(jsonObjOfFieldsToUpdate);
	mongoCollection.update(mongoSelector,setObj);
};




//dispCols_fid = 'dispCols';
mongoId_fid = '_id';
mongoName_fid = mongoId_fid;
//selectionItems_fid = 'selectionItems';
//totallingPerColArray_fid = 'totallingPerColArray';
selectorItem = function(tableId,colName,value,recId,userId,collectionName){
	this.mongoName = tableId;
	this.columnName = colName;
	this.columnValue = value;
	this.recId = recId;
	this.userId = userId;
	this.collectionName = collectionName;
	this.createMongoSelector = function(){
		return new mongoSelectionObject(this.columnName,this.columnValue);
	};
};


totallingDefClass = function(nameOfColumn,arrayOfColumnsThatMakeWeightedAverage){
	this.nameOfColumn = nameOfColumn;
	this.arrayOfColumnsThatMakeWeightedAverage = arrayOfColumnsThatMakeWeightedAverage;
};

// class definitions for tables
tableColumnClass = function(colName,nameInDoc,displayName,totallingDef,validationFunc){
	this.colName = colName;
	this.nameInDoc = nameInDoc;
	this.displayName = displayName;
	this.totallingDef = totallingDef;
	this.validationFunc = typeof validationFunc !== 'undefined' ? validationFunc : null;
	
};

masterTableClass = function(tableName,displayTableName,collectionName,tableColumnClassArr,javascriptValidationFunc){
	this[mongoId_fid] = tableName;
	this.displayTableName = displayTableName;
	this.collectionName = collectionName;
	this.tableColumnClassArr = tableColumnClassArr;
	this.javascriptValidationFunc = javascriptValidationFunc;
	// if a javascript Validation Function is provided
	if(javascriptValidationFunc){
		// is it a string, or a function - either can be passed by caller
		var tempFunc = null;
		if(typeof javascriptValidationFunc == "string"){
			//  TO DO:  MUST FINISH THIS LOGIC
			// you should have been passed a string, in the form of:
			//  var addition = Function("a", "b", "return a + b;");
			// 
			//tempFunc = 
		}else if(typeof javascriptValidationFunc == "function"){

		}
	}
	this.fromMongo = function(mongoRec){
		var tableName = mongoRec[mongoId_fid];
		var displayTableName = mongoRec.displayTableName;
		var collectionName = mongoRec.collectionName;
		var tableColumnClassArr = mongoRec.tableColumnClassArr;
		return new masterTableClass(tableName,displayTableName,collectionName,tableColumnClassArr);
	};
};

//  create totallingDef fields for a1aggregateBy.js
// get an array of "totalling" fields, which are little arrays like ['colName',['qty','price']]
//  for situations where you want your colName total to be a weighted average of price and qty.
//  the masterTableClassInstance might be storing these arrays like ['colName',['qty','price']] or
//    like ['qty','price'], where the colName is redundant
getTotallingPerColArrayPerMongoName = function(masterTableClassInstance){
	var tcArr = masterTableClassInstance.tableColumnClassArr;
	var ret = [];
	if(!tcArr || tcArr.length<=0)return ret;
	for(var i = 0;i<tcArr.length;i++){
		var tc = tcArr[i];
		var totDef = tc.totallingDef;
		if(totDef){
			// needs chg
			// totDef can take on 2 forms.  The old field was like ['qty',['qty','price']]
			//  the new field is like ['qty','pricer'] b/c the first part of the old array
			//  was redundant
			//  see if totDef is old form or new form
			var isOldStyle = false;
			if(totDef.length>1){
				var secondElement = totDef[1];
				if($.isArray(secondElement)){
					// this is an old style totDef
					isOldStyle = true;
				}
			}
			if(!isOldStyle){
				// create ['colName',['qty','price']] from ['qty','price']
				var newArr = [tc.colName]; // create first part of totallingDef object
				newArr.push(totDef);
				ret.push(newArr);
			}else{
				ret.push(totDef);
			}
		}
	}
	return ret;
};


getAllDisplayableColumns = function(masterTableClassInstance){
	var tcArr = masterTableClassInstance.tableColumnClassArr;
	var ret = [];
	if(!tcArr || tcArr.length<=0)return ret;
	for(var i = 0;i<tcArr.length;i++){
		var tc = tcArr[i];
		ret.push(tc.colName);
	}
	return ret;
};

stringToJson = function(stringVar){
	if (typeof stringVar == 'string') {
		return JSON.parse(stringVar);
    }
};




// end class defintions for tables


