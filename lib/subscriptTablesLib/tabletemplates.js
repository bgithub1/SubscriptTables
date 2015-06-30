if(Meteor.isClient){

	selectCount = 0;
	doAllToggle = 1;


	Template.tablesTemplate.helpers({
		tables: function(){
			// make sure that we have subscribed to all of the collections that
			//  are associated with tables.
			var r = MasterTableDefCollection.find().fetch();
			// get the number of tables
			var c = r.length;
			// if there tables, but the collTable object doesn't have any
			//   properties, then we have not yet subscribed to all of the collections
			//   that have the data that backs the tables
			if(c>0 && _.size(collTable)<=0){
				subscribeAll();
			}
			var ret = [];
			// only display tables that have been clicked
			for(var i = 0;i<r.length;i++){
				var tableId = r[i][mongoId_fid];
				var hideShowBoolean = getSessionTableViewControlShow(tableId);
				if(hideShowBoolean && hideShowBoolean===1){
					ret.push(r[i]);
				}
			}
			return ret;
		},
	});



	Template.tableTemplate.helpers({
		// return an array of json objects where each object
		//  has json data for a row
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
			// get table name
			var tn = this[mongoId_fid];

			// get json from mongo		
			var coll = collTable[collName];
			// get colums to show
			var colsToShow = getColsToShow(this);
			// get array of sortObjects
			var sortArr = getSessionSort(this[mongoId_fid]);
			var mongoSort = {};
			if(sortArr){
				for(var x = sortArr.length-1; x > -1; x--){
					var sortObj = sortArr[x];
					mongoSort[sortObj.columnName] = sortObj.oneOrNegOne;
				}
			}

			var recs ;
			// get selectors
			if(coll){
				var currSelector = getSessionSelector(tn);
				if(currSelector){
					recs =  coll.find(currSelector, {sort:mongoSort}).fetch();
				}else{
					recs =  coll.find({}, {sort:mongoSort}).fetch();
				}

			}else{
				return [];
			}

			// array of tableColumnClass instancs
			// aggregate data
			if(getSessionAggregation(tn)){
				var totallingArray = getTotallingPerColArrayPerMongoName(this);
				if(totallingArray){
					// do aggregation
					var totallingColumns = [];
					for(var l = 0;l<totallingArray.length;l++){
						// get all of the columns that you want total by
						totallingColumns.push(totallingArray[l][0]);
					}
					// groupBy columns = allColumns - totallingColumns
					var groupByCols = _.difference(colsToShow,totallingColumns);
					var aggregatedDataArray = tableWeightedAverage(recs,groupByCols,totallingArray);
					recs = aggregatedDataArray;
				}
			}



			// only return data for displayed columns
			// the returned array has 2 dimensions
			//  dim 1 is for each row
			//  dim 2 holds a selectorItem object for each field/column to display
			var r = [];
			for(var i = 0;i<recs.length;i++){
				var rec = recs[i];
				var fieldsObjsToShow = [];
				for(var k=0;k<colsToShow.length;k++){
					var prop = colsToShow[k];
					var value = rec[colsToShow[k]];
					var obj = new selectorItem(tn,prop,value);
					fieldsObjsToShow.push(obj);
				}
				r.push(fieldsObjsToShow);
			}

			return r;
		},
		tableCols: function(){
			// "this" is a mongo TableDef json record
			if(!this){
				return [];
			}
			return getColsToShow(this);
		},
		tableColsWithDescriptors:function(){
			// "this" is a mongo TableDef json record
			var cols = getColsToShow(this);
			var ret = [];

			for(var i = 0;i<cols.length;i++){
				var obj = {'colName':cols[i],'mongoName':this[mongoId_fid]};
				ret.push(obj);
			}
			return ret;
		},
		// get the fields on the input line
		tableInputColsWithDescriptors:function(){
			var cols = getColsToShow(this);
			var ret = [];
			var mn = this[mongoId_fid];
			var validator = MeteorValidator.fromMongo(mn);
			var newInputHashTable = null;
			if(validator){
				var oldInputHashTable = getSessionEditLineHashTable(mn);
				newInputHashTable = validator.getColumnInputDepFieldChoices(oldInputHashTable);
				newInputHashTable = validator.getColumnInputInDependFieldChoices(newInputHashTable);
				newInputHashTable = validator.getColumnInputFreeFieldChoices(newInputHashTable);
			}
			// when you get here the var newInputHashTable has been set with fields that 
			///  have possible drop down values, and MAYBE, a current choice
			//  If the newInputHashTable does not contain a ColumnInputChoiceClass instance for
			//    a field, then grey it out and prevent input.
			for(var i = 0;i<cols.length;i++){
				// build inputboxes/selectors/greyed-out fiedls
				var possChoices_2 = [];
				var currChoice = "";
				var col = cols[i];
				var useSelectAsInput = false;
				var editable = true;
				if(newInputHashTable){
					var columnInputChoiceInstance_2  = newInputHashTable.get(col);
					if(columnInputChoiceInstance_2){
						//ColumnInputChoiceClass fields are columnName,columnValue,possChoicesArray
						possChoices_2 = columnInputChoiceInstance_2.possChoicesArray;
						currChoice = columnInputChoiceInstance_2.columnValue;
						useSelectAsInput = columnInputChoiceInstance_2.useSelectAsInput;//true;
					}else{
						editable=false;
					}
				}
				var obj = {'colName':col,'mongoName':this[mongoId_fid],'value':currChoice,'possChoices':possChoices_2,'useSelectAsInput':useSelectAsInput,'editable':editable};
				ret.push(obj);
			}
			if(newInputHashTable){
				setSessionEditLineHashTable(mn,newInputHashTable);
			}
			return ret;


		},
		freeFieldId:function(){
			return "freeField_"+this.mongoName+"_"+this.colName;
		},
		tableInsertDisabledState:function(){
			var mn = this[mongoId_fid];
			if(!mn)return true;
			var validator = MeteorValidator.fromMongo(mn);
			if(!validator)return true;
			var inputHashTable = getSessionEditLineHashTable(mn);
			if(!inputHashTable)return true;
			// get all fields that need to be validated, and make sure they all have values
			// function that checks if columnValue exists
			var chkCollValue = function(field){
				var columnInputChoiceInstance =  inputHashTable.get(field);
				if(!columnInputChoiceInstance) return false;
				var columnValue = columnInputChoiceInstance.columnValue;
				return (!(!columnValue));
			};


			// first get dependent fields
			var allgood = true;  // assume the best :)
			var dependFields = validator.depOrderList;
			if(dependFields){allgood = dependFields.every(chkCollValue);}
			// second get independent fields
			var independFields = Object.keys(validator.independPossChoicesMap);
			if(independFields){allgood = allgood &&  independFields.every(chkCollValue);}
			//  third get free fields
			var freeFields = validator.freeFieldList;
			if(freeFields){allgood = allgood &&  freeFields.every(chkCollValue);}
			//  now check if we should enable
			var ret = false; // assume the best, which means disabled=false :)
			if(!allgood){
				ret = true;
			}
			return ret;
		},
		//***************** END TESTING HERE !!!!!!!!!!!*****************
			tableCol:function(){
			return this;
		},
		tableColDescriptors:function(){
			// "this" is a mongo TableDef json record
			if(!this){
				return [];
			}
			var cols = getAllDisplayableColumns(this);
			var mongoName = this[mongoId_fid];
			var colsToNotShow = getSessionColsToNotShow(mongoName);

			var ret = [];
			for(var i = 0;i<cols.length;i++){
				var obj;
				if(_.contains(colsToNotShow,cols[i])){
					obj = {'colName':cols[i],'mongoName':this[mongoId_fid],'buttonColor':"background-color:pink"};
				}else{
					obj = {'colName':cols[i],'mongoName':this[mongoId_fid],'buttonColor':""};
				}
				
				ret.push(obj);
			}
			return ret;
		},
		tableColDescriptor:function(){
			return this;
		},
		collectionName: function(){
			if(this.collectionName){
				return this.collectionName;
			}
			return this[mongoId_fid];
		},
		displayTableName: function(){
			if(this.displayTableName){
				return this.displayTableName;
			}
			return this[mongoId_fid];
		},
		footerData:function(){
			var mongoName = this[mongoId_fid];
			var dep = selectorCache.getDepends(mongoName);
			return selectorCache.toString(mongoName);
		},
	});

	Template.tableTemplate.events({
		// react to someone clicking on a field in a column
		//   by adding the column and it's value to a list of selector objects
		//   that get stored in a session variable for this table.
		//  Theser selector objects will later be accessed by the 
		//    tableRows template function when it does a find on the collection
		///   that backs the data for that table.
		'click .updateFilterButton' : function (event) {
			// at this point, the variable this = masterTableClass
			var mn = this[mongoId_fid];
			console.log('updating selection for table ' + mn);
			var s = selectorCache.getMongoSelectorWithIn(mn);
			if(s){
				setSessionSelector(mn,s);
			}
		},
		'click .clearFilterButton' : function (event) {
			// at this point, the variable this = masterTableClass
			var mn = this[mongoId_fid];
			console.log('clearing selection for table ' + mn);
			selectorCache.clearSelectorItems(mn);
			setSessionSelector(mn,null);
		},
		'click .aggregateToggleButton' : function(event){
			// at this point, the variable this = masterTableClass
			var mn = this[mongoId_fid];
			toggleSessionAggregation(mn);
		},
		'click .hideShowCol' : function(event){
			// on click the value of this is an object of [columnName:value,tableId:value]
			var mn = this.mongoName;
			var col = this.colName;
			toggleSessionColsToNotShow(mn,col);
			var hiddenColArr = getSessionColsToNotShow(mn);
			if(hiddenColArr.length>0){
				setSessionAggregation(mn,true);
			}else{
				setSessionAggregation(mn,false);
			}
		},
		'click .toggleSort' : function(event){
			// on click the value of this is an object of [columnName:value,tableId:value]
			var mn = this.mongoName;
			var col = this.colName;
			toggleSessionSort(mn,col);
		},
		'click .poss-choice' : function(event){
			var choice = this.choice;
			var colName = this.colName;
			var tableId = this.tableId;
			//addColumnSessionEditLineHashTable = function(masterTableId,columnName,columnValue,possChoicesArray){
			// get old poss choices
			var columnInputChoiceInstance = ColumnInputChoiceClass.getChoiceFromColumnInputHashTable(tableId,colName);
			var possChoices = null;
			var useSelectAsInput=false;
			if(columnInputChoiceInstance){
				possChoices = columnInputChoiceInstance.possChoicesArray;
				useSelectAsInput = columnInputChoiceInstance.useSelectAsInput;
			}
			addColumnSessionEditLineHashTable(tableId,colName,choice,possChoices,useSelectAsInput);
		},
		'blur .freeField': function(event){
			// this = {'colName','mongoName','value','possChoices','useSelectAsInput','editable';
			var inputChoice = ColumnInputChoiceClass.getChoiceFromColumnInputHashTable(this.mongoName,this.colName);
			if(!inputChoice)return; // do nothing
			// update the inputChoice.value
			// get value from DOM using a VERY convoluted jquery statement
			//   !!!! for some reason, ordinary $('#divId').text() does NOT work !!!!
			//  create a field ID
			var freeFieldId = "freeField_"+this.mongoName+"_"+this.colName;
			// use where statement to get dom element for this freeField
			var domElement =_.where($(".freeField"),{id:freeFieldId})[0];
			if(domElement){
				// update the ColumnInputChoiceClass instance (inputChoice) with the innerText
//				inputChoice.columnValue = domElement.value;
				inputChoice.columnValue = domElement.innerText;
				// log to console
				console.log('on blur field change of ' + freeFieldId + "new val  = "+inputChoice.columnValue);
				// set this ColumnInputChoiceClass instance (inputChoice) in the global store
				ColumnInputChoiceClass.setChoiceFromColumnInputHashTable(this.mongoName,this.colName,inputChoice);
			}else{
				console.log('on blur field change of ' + freeFieldId + "NO NEW VAL ");
			}
		},

	});

	Template.rowTemplate.helpers({
		tableFields: function(){
			return this;
		},
		tableField: function(){
			doRegDep.changed();
			var cv = this.columnValue;
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
			var cv = this.columnValue;
			if(isNumber(cv)){
				return "text-right";
			}
			return "text-left";
		}
		

	});

	Template.fieldTemplate.helpers({
		tableField: function(){
			doRegDep.changed();
			var cv = this.columnValue;
			return cv;
		},
	});

	Template.rowTemplate.events({
		'click td' : function (event) {
			console.log(this);
			selectorCache.pushSelectorItem(this);
		}
	});

	Template.view_control.helpers({
		tables: function(){
			var r = MasterTableDefCollection.find().fetch();
			// get all tables that have their display name set
			r = _.filter(r,function(tab){return(tab.tableColumnClassArr!==null && tab.tableColumnClassArr.length>0);});
			return r;
		},
		tableId: function(){
			return this[mongoId_fid];
		},
		displayTableName: function(){
			if(this.displayTableName){
				return this.displayTableName;
			}
			return this[mongoId_fid];
		},
	});

	Template.view_control.events({
		'click .viewControl' : function(event){
			toggleSessionTableViewControlShow(this);
			// hack !!!
			subscribeAll();
//			console.log('view control button: '+this.displayTableName);
		},
		'click #log_out_btn' : function(event){
			Session.keys = {};
			unsubscribeAll();
			Meteor.logout();
		}
	});


// ********************* start Utilities ************************
getColsToShow  = function(masterTableClassInstance){
		var ret = getAllDisplayableColumns(masterTableClassInstance);
		var mongoName = masterTableClassInstance[mongoId_fid];
		var colsToNotShow = getSessionColsToNotShow(mongoName);
		if(colsToNotShow && colsToNotShow.length>0){
			ret = _.difference(ret,colsToNotShow);
		}

		return ret;
};



// *********************  end Utiltities ************************


// ******************* experiment *****************************
// MeteorValidator class
MeteorValidator = function(tableName,jnestMap,depOrderList,independPossChoicesMap,freeFieldList){
	this.tableName = tableName;
	this.jnestMap = jnestMap;
	this. depOrderList = depOrderList;
	this.independPossChoicesMap = independPossChoicesMap;
	this.freeFieldList = freeFieldList;
};
// MeteorValidator static methods
MeteorValidator.fromObj = function(validatorObject){
	tn = validatorObject.tableName;
	jm = validatorObject.jnestMap;
	dol = validatorObject.depOrderList;
	ipc = validatorObject.independPossChoicesMap;
	ftm = validatorObject.freeFieldList;
	return new MeteorValidator(tn,jm,dol,ipc,ftm);
};

MeteorValidator.fromMongo  = function(mongoId){
	//  get the Validator collection that is stored in collTable - like all other collections
	var jnestCollection = collTable[meteorValidatorCollectionName];
	// search jnest collection for this table name (mongoId)
	var validatorArr = jnestCollection.find({_id:mongoId}).fetch();
	if(!validatorArr || validatorArr.length <1){
		console.log('cannot find jnest instance for table : '+mongoId + ' in the collection: '+ meteorValidatorCollectionName);
		return(null);
	}
	validatorObj = validatorArr[0];
	newValInstance = MeteorValidator.fromObj(validatorObj);
	return (newValInstance);
};
//Object.keys(pp.independentFields.myPrice).every(function(obj){return(isStringNumber(obj));})

MeteorValidator.prototype.getLevels = function(levelPathArray){
	// get top level
	var result = this.jnestMap;

	for(var i=0;i<levelPathArray.length;i++){
		level = levelPathArray[i];
		result = this.jnestMap[level];
		console.log('level='+level);
		if(!result){
			result={};
			break;
		}
	}
	return Object.keys(result).sort();
};

// There are 3 types of input fields:
//    1. dependent fields
//    2. independent fields 
//    3. free fields
MeteorValidator.prototype.getColumnInputDepFieldChoices = function(oldInputHashTable){
	// var newInputHashTable   = null;
	var newInputHashTable = oldInputHashTable.clone();
	var tn = this.tableName;

	// 1. *************** do dependent fields ****************
	var depFieldOrder = this.depOrderList;
	if(depFieldOrder && depFieldOrder.length>0 ){
//		newInputHashTable   = new hashTable();
		// there is a validation order
		// get the session var that has the hashTable of current ColumnInputChoiceClass instances
		// Loop through validation order.
		//  Get currently input values from the hashTable in editInputSession.
		//   If there is not an entry in the hashTable, then get the possible
		//      choices for this field from the getLevels method in jsonNestedListTraverse.js
		//   If there is an entry from the hashTable, then put that entry
		//      into the newInputHashTable object, and add the fieldToValidate value
		//      to the levelsList array.  The levelsList array will be used
		//      in the else branch of if statement to get the possible choices
		//      that are available - GIVEN the value of columnInputChoiceInstance.columnValue
		var levelsList = [];
		for(var j = 0; j<depFieldOrder.length; j++){
			var fieldToValidate = depFieldOrder[j];
			var columnInputChoiceInstance = oldInputHashTable.get(fieldToValidate);
			var levs = this.getLevels(levelsList);
			var possChoices =  _.map(levs,function(possValue){return({'tableId':tn, 'colName':fieldToValidate,'choice':possValue});});
			if(columnInputChoiceInstance && columnInputChoiceInstance.columnValue ){
				columnInputChoiceInstance.possChoicesArray = possChoices;
				// add this field to the validation hierarchy
				levelsList.push(columnInputChoiceInstance.columnValue);
				//  add it back to the new hashTable, which we will save later
				newInputHashTable.put(fieldToValidate,columnInputChoiceInstance);
			}else{
				// create a new  ColumnInputChoiceClass instance - 
				//   BUT WITH NO FIELD VALUE SET !!!
				//   Make each object in possChoices have the both the possible choice
				//      for the field, AND a reference to the fieldToValidate so
				//      that the template event can use the fieldToValidate as a key
				//      when updating the  ColumnInputChoiceClass session object for
				//      this column with the new value that the user selected
				newColumnInputChoiceInstance = new ColumnInputChoiceClass(fieldToValidate,null,possChoices,true);
				newInputHashTable.put(fieldToValidate,newColumnInputChoiceInstance);
				break;
			}
		}
	}
	return newInputHashTable;
};

MeteorValidator.prototype.getColumnInputInDependFieldChoices = function(oldInputHashTable){
	// get all of the fields that have independent possChoices
	var newInputHashTable = oldInputHashTable.clone();
	var tn = this.tableName;
	var independFields = Object.keys(this.independPossChoicesMap);
	for(var i = 0;i<independFields.length;i++){
		var indepField = independFields[i];
		var colInputIndepChoice =  newInputHashTable.get(indepField);
		if(!colInputIndepChoice){
			var posValues = this.independPossChoicesMap[indepField];
			var possChoices =  _.map(posValues,function(possValue){return({'tableId':tn, 'colName':indepField,'choice':possValue});});
			var newColumnInputChoiceInstance = new ColumnInputChoiceClass(indepField,null,possChoices,true);
			newInputHashTable.put(indepField,newColumnInputChoiceInstance);
		}
	}
	return newInputHashTable;
};

MeteorValidator.prototype.getColumnInputFreeFieldChoices = function(oldInputHashTable){
	var newInputHashTable = oldInputHashTable.clone();
	var tn = this.tableName;
	var freeFields = this.freeFieldList;
	for(var i = 0;i<freeFields.length;i++){
		var freeField = freeFields[i];
		var colInputIndepChoice =  newInputHashTable.get(freeField);
		if(!colInputIndepChoice){
			var possChoices =  null;
			var newColumnInputChoiceInstance = new ColumnInputChoiceClass(freeField,null,possChoices,false);
			newInputHashTable.put(freeField,newColumnInputChoiceInstance);
		}
	}
	return newInputHashTable;
};

// ******************* END experiment *****************************

}
