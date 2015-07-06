// EVERYTHING IN THIS FILE IS DEFINED IN BETWEEN if(Meteor.isClient)
if(Meteor.isClient){
	// dependencies
	doRegDep = new Deps.Dependency();
	totalRowNeeded = new Tracker.Dependency();

	selectorCache = {};
	subscriptions = new hashTable();

	getLoggedOnUserEmail = function(){
		var ret = Meteor.user().emails[0].address;
		return ret;
	};

	validatorCache = {};
	templateHelperCache = {};

	
	Meteor.startup(function(){
		subscriptions = new hashTable();
		validatorCache = new hashTable();
		Meteor.subscribe(masterTableDef_id);
		selectorCache = new selectorItemCacheClass();
		templateHelperCache = new TemplateHelperCacheClass();

	});

	// subscribe to all collections that have data that backs a table
	// this can get called anywhere, but is mostly called in the tablesTemplate helper
	//  when that code senses that it can fetch the tables in the masterTableDef collection,
	//  but that the client code has not yet subscribed to any of the collections that "back" those
	//  masterTables
	subscribeAll = function(){
		var mts = getMasterTables();
		// use stored selectors from the userTableDef collection to initially subscribe
		// to data for each table.  Save the subscriptions in case you want to 
		//   resubscribe with different selectors
		for(var i = 0;i<mts.length;i++){
			var utd = mts[i];
			// REFACT 20031203
			// var collName = utd[mongoId_fid];
			var collName = utd.collectionName;
			// END REFACT 20031203

			var existingCollection = collTable[collName];
			if(!existingCollection){
				// collection has not been created
				createCollection(collName);
			}
			// do static call to the convertMongoSelector method
			var selectorWithIn = selectorCache.getMongoSelectorWithIn(collName);
			
			// see if we must delete old subscription
			var oldS = subscriptions.get(collName);
			if(oldS){
				oldS.stop();
			}
			var s = Meteor.subscribe(collName,collName,selectorWithIn);
			console.log('subscribing to collection: '+collName+ ' with subscription object: '+s);
			subscriptions.put(collName,s);
		}
	};

	unsubscribeAll = function(){
		var keys = subscriptions.keySet();
		for(var i = 0;i<keys.length;i++){
			var subscription = subscriptions.get(keys[i]);
			subscription.stop();
		}
		// clear subscriptions
		subscriptions = new hashTable();

	};

	getMasterTables = function(selector){
		if(!selector){
			return MasterTableDefCollection.find().fetch();
		}
		return MasterTableDefCollection.find(selector).fetch();
	};


// ******************* below are where all session variables are set
	// getter and setter for session variable that chances when a mongo selector for table "monogName" gets added 
	//   or removed
	setSessionSelector = function(tableId,selector){
		var s = 'selector_'+tableId;
		Session.set(s,selector);

	};
	// 
	getSessionSelector = function(tableId){
		var selectorSessionName = 'selector_'+tableId;
		return Session.get(selectorSessionName);
	};

	// add/remove/get for session variable that determines which columns NOT to show
	addSessionColsToNotShow = function(tableId,colsToNotShowElement){
		var arr = getSessionColsToNotShow(tableId);
		arr.push(colsToNotShowElement);
		var s = 'colsToNotShow_'+tableId;
		Session.set(s,arr);
	};
	removeSessionColsToNotShow = function(tableId,colsToNotShowElement){
		var arr = getSessionColsToNotShow(tableId);
		arr = _.difference(arr,colsToNotShowElement);
		var s = 'colsToNotShow_'+tableId;
		Session.set(s,arr);
	};


	getSessionColsToNotShow = function(tableId){
		var sessionName = 'colsToNotShow_'+tableId;
		var ret = Session.get(sessionName);
		if(!ret)return [];
		return ret;
	};

	isInArrayOfSessionColsToNotShow = function(tableId,colsToNotShowElement){
		var colsToNotShow  = getSessionColsToNotShow(tableId);
		var index =  _.indexOf(colsToNotShow,colsToNotShowElement);
		if(index==-1)return false;
		return true;
	};


	toggleSessionColsToNotShow = function(tableId,colsToNotShowElement){
		if(isInArrayOfSessionColsToNotShow(tableId,colsToNotShowElement)){
			removeSessionColsToNotShow(tableId,colsToNotShowElement);
		}else{
			addSessionColsToNotShow(tableId,colsToNotShowElement);
		}
	};

	//****************** toggle/get for session variable that tells template to use
	//   aggregate or non-aggregate values in the table rows
	toggleSessionAggregation = function(tableId){
		var s = 'aggregation_'+tableId;
		var value = getSessionAggregation(tableId);
		if(!value){
			Session.set(s,true);
			return;
		}
		value = !value;
		Session.set(s,value);
	};

	// 
	getSessionAggregation = function(tableId){
		var s = 'aggregation_'+tableId;
		return Session.get(s);
	};

	setSessionAggregation = function(tableId,value){
		var s = 'aggregation_'+tableId;
		if(value===null)return;
		if(!tableId)return;
		if(value!==true && value!==false)return;
		Session.set(s,value);
	};

	getSessionSort = function(masterTableId){
		var s = 'sort_'+masterTableId;
		return Session.get(s);
	};

	sortObjectClass = function(columnName,oneOrNegOne){
		this.columnName = columnName;
		this.oneOrNegOne = oneOrNegOne;
	};
	// this routine grabs an array of sortObjects, if they already exist
	//  then finds an element in that array with columnName, if it exists,
	//  then toggles it, gets rid of any other object in the array with columnName,
	//  and then saves the toggled version.
	toggleSessionSort = function(masterTableId,columnName){
		console.log('toggling session sort');
		if(!columnName)return;
		if(!masterTableId)return;
		var s = 'sort_'+masterTableId;
		var sortArr = getSessionSort(masterTableId);
		// first see if there is a sortArr
		if(!sortArr){
			// nope, push a new sortObject to arr, and save it
			var arr = [];
			var newSortObj = new sortObjectClass(columnName,1);
			arr.push(newSortObj);
			Session.set(s,arr);
			return;
		}
		// sortArr is already there
		// get rid of any old occurence of 
		//   the sortobject for this columnName
		var oldSortObjects = _.filter(sortArr,function(value){
			if(value.columnName===columnName){
				return true;
			}
			return false;
		});
		
		// now let's create a new "toggled" sortObject
		var sortObject;
		if(oldSortObjects && oldSortObjects.length>0){
			// Case 1: if the array oldSortObjects has anything in it
			//   grab the first element, toggle it, and put it back
			//   into sortArr
			sortObject = oldSortObjects[0];
			sortObject.oneOrNegOne = sortObject.oneOrNegOne*-1; // toggle
		}else{
			// Case 2: this is the first time sorting on this columnName
			sortObject = new sortObjectClass(columnName,1);
		}
		
		sortArr.push(sortObject);
		Session.set(s,sortArr);
		return;
	};

	// get session variable for hide/show tables
	getSessionTableViewControlShow = function(masterTableId){
		var s = 'hideShowTable_'+masterTableId;
		return Session.get(s);
	};

	toggleSessionTableViewControlShow = function(masterTableInstance){
		// set session variable to either show or hide a table
		// first get session variable
		var masterTableId = masterTableInstance[mongoId_fid];
		var hideShowBoolean = getSessionTableViewControlShow(masterTableId);
		if(!hideShowBoolean){
			// first time clicking button, set to false and save
			hideShowBoolean = 1;
		}else{
			hideShowBoolean =  hideShowBoolean * -1;
		}

		var s = 'hideShowTable_'+masterTableId;
		Session.set(s,hideShowBoolean);
		return;
	};

	// return an hashTable object, where each field of a table is 
	//   is an object as follows: {columnName:name,currentValue:value,currentPossChoices:[choice1,choice2, ...,choiceN]}
	//  See hashTable
	addColumnSessionEditLineHashTable = function(masterTableId,columnName,columnValue,possChoicesArray,useSelectAsInput){
		// editLineHashTable has a hashTable of ColumnInputChoiceClass instances
		var editLineHashTable = getSessionEditLineHashTable(masterTableId);
		var columnInputChoiceInstance = editLineHashTable.get(columnName);
		if(columnInputChoiceInstance){
			var valueOfThis = columnInputChoiceInstance.columnValue;
			if(valueOfThis===columnValue){
				return;
			}
		}
		// create a new ColumnInputChoiceClass instance
		var newColumnInputChoiceInstance = new ColumnInputChoiceClass(columnName,columnValue,possChoicesArray,useSelectAsInput);
		// write it back to the hashTable
		editLineHashTable.put(columnName,newColumnInputChoiceInstance);
		// now you have to invalidate the current choices of all fields that are 'childred' of this field
		var validator = MeteorValidator.fromMongo(masterTableId);
		
		var validationOrder = validator.depOrderList;
		var ind = _.indexOf(validationOrder,columnName);
		if(ind>-1){
			var fieldsToInvalidate = validationOrder.slice(ind+1,validationOrder.length+1);
			// remove all child fields
			_.each(fieldsToInvalidate,function(field){editLineHashTable.remove(field);});
		}

		var s = 'editLineValues'+masterTableId;
		// reset the session variable with the updated editLineHashTable
		columnInputHashTable.put(s,editLineHashTable);
		Session.set(s,editLineHashTable);
	};

	setSessionEditLineHashTable = function(masterTableId,editLineHashTable){
		// editLineHashTable has a hashTable of ColumnInputChoiceClass instances
		var s = 'editLineValues'+masterTableId;
		// reset the session variable with the updated editLineHashTable
		columnInputHashTable.put(s,editLineHashTable);
		Session.set(s,editLineHashTable);
	};

	getSessionEditLineHashTable = function(masterTableId){
		var s = 'editLineValues'+masterTableId;
		var dummyToMakeReadtive = Session.get(s);
		var editLineHashMap = ColumnInputChoiceClass.getColumnInputHashTable(masterTableId);//  columnInputHashTable.get(s);
		if(!editLineHashMap){
			editLineHashMap = new hashTable();
		}
		return(editLineHashMap);
	};

// ******************* END session variables are set ************
	
// ***************** Client side only classes *******************
	// main "Cic" class.  
	ColumnInputChoiceClass = function(columnName,columnValue,possChoicesArray,useSelectAsInput){
		this.columnName = columnName;
		this.columnValue = columnValue;
		this.possChoicesArray = possChoicesArray;
		this.useSelectAsInput = useSelectAsInput;
	};

	ColumnInputChoiceClass.getChoiceFromColumnInputHashTable = function(tableId,columnName){
		var editLineHashTable = ColumnInputChoiceClass.getColumnInputHashTable(tableId);
		if(!editLineHashTable){
			return null;
		}
		var columnInputChoice = editLineHashTable.get(columnName);
		return columnInputChoice;
	};

	// all getter access to columnInputHashTable is thru this function
	ColumnInputChoiceClass.getColumnInputHashTable = function(masterTableId){
		var s = 'editLineValues'+masterTableId;
		return columnInputHashTable.get(s);
	};

	ColumnInputChoiceClass.setChoiceFromColumnInputHashTable = function(tableId,columnName,columnInputChoiceInstance){
		var editLineHashTable = ColumnInputChoiceClass.getColumnInputHashTable(tableId);
		if(!editLineHashTable){
			throw("not edithLineHashTable for mongoId: "+tableId);
		}
		editLineHashTable.put(columnName,columnInputChoiceInstance);
		setSessionEditLineHashTable(tableId,editLineHashTable);
	};

	//********* !!!!!!!!!!!!!  THIS HASHTABLE HOLDS INSTANCES OF ColumnInputChoiceClass 
	//   FOR EACH COLUMN THAT GETS ANY KIND OF VALIDATION USING MeteorValidator
	columnInputHashTable = new hashTable();

	// 
// ***************** END Client side only classes *******************

}