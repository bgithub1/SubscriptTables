if(Meteor.isClient){
	columnNames_id = 'ColumnNames';
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

	Template.templateChooser.helpers({
		tableIsSimpleCsv : function(){
			if(!this){
				false;
			}
			if(!this.isSimpleCsv){
				return false;
			}
			return true;

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
//				recs = _.filter(recs,function(x){return x._id!=columnNames_id});
			}else{
				return [];
			}

			// array of tableColumnClass instancs
			// aggregate data
			var totallingArray = getTotallingPerColArrayPerMongoName(this);
			if(getSessionAggregation(tn)){
				if(totallingArray){
					// do aggregation
					var totallingColumns = [];
					for(var l = 0;l<totallingArray.length;l++){
						// get all of the columns that you want total by
						totallingColumns.push(totallingArray[l][0]);
					}
					// groupBy columns = allColumns - totallingColumns
					var groupByCols = _.difference(colsToShow,totallingColumns);
					// get aggregate recs
					recs = getAggregateRecs(recs,groupByCols,totallingArray);
				}
			}

			// get aggregate data for the total row and store it for later use
			var totalRowAggDataArray = getAggregateRecs(recs,[],totallingArray);
			templateHelperCache.putValue(collName,'totalRowData',totalRowAggDataArray);
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
					var obj = new selectorItem(tn,prop,value,rec._id,rec.userId,collName);
					fieldsObjsToShow.push(obj);
				}
				r.push(fieldsObjsToShow);
			}

			console.log('totalRowNeeded.changed() called ');
			totalRowNeeded.changed();
			return r;
		},
		hasValidator: function(){
			var tn = this[mongoId_fid];
			var hasit = MeteorValidator.hasValidator(tn);
			if(hasit){
				return true;
			}
			return false;
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
				newInputHashTable = validator.getColumnInputRegexFieldListChoices(newInputHashTable);
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
			console.log("freeField_"+this.mongoName+"_"+this.colName)
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
//					obj = {'colName':cols[i],'mongoName':this[mongoId_fid],'buttonColor':""};
					obj = {'colName':cols[i],'mongoName':this[mongoId_fid],'buttonColor':"background-color:#F6F8F8"};
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
		// IMPORTANT - This is not really a "footer" of the table, but the footer
		//   of the first part of the table, under the filter button.  The data
		//   that this function returns is related to what fields are currently being
		//   used as filters.
		footerData:function(){
			var mongoName = this[mongoId_fid];
			var dep = selectorCache.getDepends(mongoName);
			return selectorCache.toString(mongoName);
		},
		totalData:function(){
			totalRowNeeded.depend();
			var tableId = this[mongoId_fid];
			var colsToShow = getColsToShow(this);
			var totalData = templateHelperCache.getValue(tableId,'totalRowData');
			var userId = "";
			var value;
			var selectorItemsToReturn = _.map(colsToShow,function(colName,key){
					if(totalData && totalData.length>0 && totalData[0]){
						value = totalData[0][colName];
					}else{
						value="";
					}
					
					return new selectorItem(tableId,colName,value,"1",userId,tableId);
				});
			// if(selectorItemsToReturn.length>1){
			// 	selectorItemsToReturn[0].columnValue='total';
			// }
			
			console.log(selectorItemsToReturn);

			return [selectorItemsToReturn];
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
		// this blur event will take care of both free fields and regex validated fields
		'blur .freeField': function(event){
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
				// see if there is a regex mask associated with this field
				var regexString = inputChoice.regexValidatorString;
				// get actual dom value that the user entered
				var columnValue = domElement.innerText;
				if(regexString){
					// do regex validation
					var patt = new RegExp(regexString);
					var res = patt.exec(columnValue);
					if(!res || res.length<0){
						var errString = 
							'Value for ' + columnValue  + ' does not conform to regex validator string: '+ regexString + ".  Enter new value.";
						console.log(errString);
						confirm(errString);
						domElement.innerText="";
						return;
					}

				}
				// update the ColumnInputChoiceClass instance (inputChoice) with the innerText
				inputChoice.columnValue = columnValue;
				// log to console
				console.log('on blur field change of ' + freeFieldId + "new val  = "+inputChoice.columnValue);
				// set this ColumnInputChoiceClass instance (inputChoice) in the global store
				ColumnInputChoiceClass.setChoiceFromColumnInputHashTable(this.mongoName,this.colName,inputChoice);
			}else{
				console.log('on blur field change of ' + freeFieldId + "NO NEW VAL ");
			}
		},
		'click #insertButtonId' : function(event){
			// Now, "this" = an instance of masterTableClass
			console.log('inserting record '+this);
			var mn = this[mongoId_fid];
			var editLineValues = ColumnInputChoiceClass.getColumnInputHashTable(mn);
			// construct object for collection
			var collectionObj = {};
			// Get _id field, or allow it to be null.  Minimongo will generate it if it's null.
			collectionObj.userId = getLoggedOnUserEmail();
			// Now, get all other fields.
			var columnNames = editLineValues.keySet();
			var i;
			var value;
			var columnName;
			var thisColumnChoiceInstance;
			for(i=0;i<columnNames.length;i++){
				columnName = columnNames[i];
				thisColumnChoiceInstance = editLineValues.get(columnName);
				if(thisColumnChoiceInstance){
					value = thisColumnChoiceInstance.columnValue;
					collectionObj[columnName] = value;
				}
			}
			// Make sure _id field is not null.
			if(!collectionObj._id){
				// generate one from time and datr
				var d = new Date();
				var y = d.getFullYear();
				var mon = d.getMonth()+1;
				var day = d.getDate();
				var h = d.getHours();
				var min = d.getMinutes();
				var s = d.getSeconds();
				var mil = d.getMilliseconds();
				var id = y*100*100*100*100*100*1000 + mon*100*100*100*100*1000 + day*100*100*100*1000 + h*100*100*1000 + min*100*1000 + s*1000 + mil;
				collectionObj._id = id.toString();
			}
			// Record is ready for insert - call meteor method.
			try{
				var objToSend = {};
				objToSend.list = [collectionObj];
				objToSend.className = mn;
				Meteor.call('meteorClientInsert',objToSend);
			}catch(err){
				console.log("Error during client insert event's call to meteorClientInsert: " + err);
			}

		},
		'click .deleteButton' : function(event){
			// Make sure there is something to delete
			if(!this || this.length<1)return;
			// Get a recId from the first column object to see if it has an _id field
			var thisId = this[0].recId;
			if(!thisId){
				// There isn't an _id field, so don't allow a deletion.
				//  No _id field happens when the records are being displayed as aggregates
				//   b/c some hit one of the column no-show buttons on the left hand side of
				//   the table ui.
				console.log("deleteButton failed: no _id field exists for this record");
				return;
			}
			var thisUserId = this[0].userId;
			if(!thisUserId){
				// There isn't an _id field, so don't allow a deletion.
				//  No _id field happens when the records are being displayed as aggregates
				//   b/c some hit one of the column no-show buttons on the left hand side of
				//   the table ui.
				console.log("deleteButton failed: no userId field exists for this record");
				return;
			}
			var thisCollectionName = this[0].collectionName;
			if(!thisCollectionName){
				// There isn't an _id field, so don't allow a deletion.
				//  No _id field happens when the records are being displayed as aggregates
				//   b/c some hit one of the column no-show buttons on the left hand side of
				//   the table ui.
				console.log("deleteButton failed: no CollectionName exists for this record");
				return;
			}

			// Create object toString for displaying user alert box.
			var displayString = 'collection:'+thisCollectionName + "," + '_id:'+thisId + "," + 'userId:'+thisUserId+",";
			var objStringArr = _.map(this,function(item){return item.columnName+":"+item.columnValue;});
			_.each(objStringArr,function(item){displayString += item+" , ";});
			displayString = displayString.slice(0,displayString.length);

			var userIdSelector;
			var okToDelete = confirm('ABOUT TO DELETE record: \n ' + displayString + '\n' + 'Hit Ok to continue Delete, or Cancel to cancel Delete.');
			if(okToDelete){
				console.log('deleting record: \n ' + displayString + '\n' + 'Hit Ok to continue Delete, or Cancel to cancel Delete.');
				// call meteor method to delete HERE
				var recWithJust_idAndUserId = {};
				recWithJust_idAndUserId._id = thisId;
				recWithJust_idAndUserId.userId = thisUserId;
				var objToSend = {};
				objToSend.list = [recWithJust_idAndUserId];

				Meteor.call('meteorClientDelete',thisCollectionName,objToSend);
			}else{
				console.log('NOT GOING TO delete record: \n' + displayString);
			}
		},
		'click .recCalcAllButton' : function(event){
			var mn = this[mongoId_fid];
			Meteor.call('meteorClientPublishChanged',mn);
		},
	});

	// this = an array of selectorItem's
	Template.rowTemplate.helpers({
		tableFields: function(){
			return this;
		},
		// this = a selectorItem
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
		},
		tableAggregationMode:function(){
			if(this.length<1)return true;
			// get a recId from the first column object to see if it has an _id field
			var thisId = this[0].recId;
			if(!thisId){
				// There isn't an _id field, so don't allow a deletion.
				//  No _id field happens when the records are being displayed as aggregates
				//   b/c some hit one of the column no-show buttons on the left hand side of
				//   the table ui.
				return true;
			}
			var mn = this[0].mongoName;
			var validator = MeteorValidator.fromMongo(mn);
			if(!validator){
				return true;
			}
			return false;
		},
		
	});

	Template.fieldTemplate.helpers({
		tableField: function(){
			doRegDep.changed();
			var cv = this.columnValue;
			return cv;
		},
	});

	// this is an selectorItem array with only one element
	Template.totalRowTemplate.helpers({
		tableFields: function(){
			return this;
		},
		// this is a selectorItem
		tableField: function(){
			var cv = this.columnValue;
			// get the precision to see if it must be reduced
			var numSplit = (cv + "").split(".");
			if( numSplit.length>1){
				var precision = numSplit[1].length;
				if(precision>defaultAggregateColumnPrecision){
					cv = Math.round(cv*defaultAggMultiplier)/defaultAggMultiplier;
				}
			}
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
			if(!Meteor.userId()){
				return [];
			}
			var r1 = MasterTableDefCollection.find().fetch();
			// get all tables that have their display name set
			var r2 = _.filter(r1,function(tab){return(tab.tableColumnClassArr!==null && tab.tableColumnClassArr.length>0);});
			// add in anything that has isSimpleCsv = true
			var rsimple = _.filter(r1,function(tab){return(tab.isSimpleCsv);});
			_.each(rsimple,function(tab){r2.push(tab)});
			return r2;
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
		isLoggedOn:function(){
			return !(!Meteor.userId());
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

// ***************** fix for contenteditable bug ********************

// ***************** end fix for contenteditable bug ********************



// ********************* start Utilities ************************
getColsToShow  = function(masterTableClassInstance){
		// var ret = getColumnNamesEmbedded(masterTableClassInstance);
		// if(!ret){
		// 	ret = getAllDisplayableColumns(masterTableClassInstance);
		// }
		var ret = getAllDisplayableColumns(masterTableClassInstance);
		var mongoName = masterTableClassInstance[mongoId_fid];
		var colsToNotShow = getSessionColsToNotShow(mongoName);
		if(colsToNotShow && colsToNotShow.length>0){
			ret = _.difference(ret,colsToNotShow);
		}

		return ret;
};



// *********************  end Utiltities ************************



// ****************** TemplateHelperCache ***************************
	// tempateHelperCache cache holds template/view calcs that a particular helper executes on
	//   behalf of another helper that will use the calc results later.
	//  There will be one cache object per table template name (these are called 
	//	mondoId, tableId, etc in various places of the template logic).
TemplateHelperCacheClass = function(){
};
TemplateHelperCacheClass.prototype.putValue = function(tableId,fieldId,valueToAdd){
	if(!this[tableId]){
		this[tableId] = {};
	}
	this[tableId][fieldId] = valueToAdd;
};
TemplateHelperCacheClass.prototype.getValue = function(tableId,fieldId,valueToAdd){
	if(!this[tableId]){
		return null;
	}
	if(!this[tableId][fieldId]){
		return null;
	}
	return this[tableId][fieldId];
};

//Static Global function for updating client's templateHelperCache
TemplateHelperCacheClass.globalStoreValue = function(tableId,fieldId,valueToAdd){
	templateHelperCache.putValue(tableId,fieldId,valueToAdd);

};

// *******************  template helper functions **********************
getAggregateRecs = function(recs,groupByCols,totallingArray){
	var ret ;
	if(groupByCols.length<1){
		// hack to overcome bug 
		var hackrecs = _.map(recs,function(rec){rec._all_="1";return rec;});
		ret = tableWeightedAverage(hackrecs,["_all_"],totallingArray);
	}else{
		var aggregatedDataArray = tableWeightedAverage(recs,groupByCols,totallingArray);
		ret = aggregatedDataArray;
	}
	return ret;
};
// *******************  END template helper functions **********************

//  End of Meteor.isClient from top
} //  End of Meteor.isClient from top
