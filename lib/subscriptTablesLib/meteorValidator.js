// both client and server
meteorValidatorCollectionName = 'com.billybyte.meteorjava.MeteorValidator';
validatorCache = {};
defaultFreeFieldvalue = "1";

// ******************* MeteorValidator *****************************
// MeteorValidator class
MeteorValidator = function(tableName,jnestMap,depOrderList,independPossChoicesMap,freeFieldList,regexFieldList){
	this.tableName = tableName;
	this.jnestMap = jnestMap;
	this. depOrderList = depOrderList;
	this.independPossChoicesMap = independPossChoicesMap;
	this.freeFieldList = freeFieldList;
	this.regexFieldList = regexFieldList;
};
// MeteorValidator static methods
MeteorValidator.fromObj = function(validatorObject){
	tn = validatorObject.tableName;
	jm = validatorObject.jnestMap;
	dol = validatorObject.depOrderList;
	ipc = validatorObject.independPossChoicesMap;
	ftm = validatorObject.freeFieldList;
	rfl = validatorObject.regexFieldList
	return new MeteorValidator(tn,jm,dol,ipc,ftm,rfl);
};

MeteorValidator.hasValidator = function(mongoId){
	if(validatorCache.get(mongoId)){
		return true;
	}
	var validatorCollection = collTable[meteorValidatorCollectionName];
	// search jnest collection for this table name (mongoId)
	var validatorArr = validatorCollection.find({_id:mongoId}).fetch();
	if(!validatorArr || validatorArr.length<1){
		return false;
	}
	return true;  // return true or false	
};

MeteorValidator.fromMongo  = function(mongoId){
	// is it in cache??
	var newValInstance;
	newValInstance = validatorCache.get(mongoId);
	if(newValInstance){
		return newValInstance;
	}

	//  get the Validator collection that is stored in collTable - like all other collections
	var validatorCollection = collTable[meteorValidatorCollectionName];
	if(!validatorCollection){
		console.log('cannot find validatorCollection for table : '+mongoId + ' in the collection: '+ meteorValidatorCollectionName);
		return(null);
	}
	// search jnest collection for this table name (mongoId)
	var validatorArr = validatorCollection.find({_id:mongoId}).fetch();
	if(!validatorArr || validatorArr.length <1){
		console.log('cannot find validatorArr for table : '+mongoId + ' in the collection: '+ meteorValidatorCollectionName);
		return(null);
	}
//	validatorObj = validatorArr[0];
	newValInstance = MeteorValidator.fromObj(validatorArr[0]);
	validatorCache.put(mongoId,newValInstance);
	return (newValInstance);
};

// VERY IMPORTANT !!! THE VALUES THAT COME FROM THESE jnestMap will have
//  the DEC_POINT_REPLACE value for decimal points.
//  THESE DEC_POINT_REPLACE values will be replaced back to decimal points in
//  MeteorValidator.prototype.getColumnInputDepFieldChoices, when they are ready to be
//  entered as possible choices in a drop down.
//  Decimal points cannot be stored as a key in mongo.  The jnestMap has keys that might
//  be decimal numbers, so those keys use the value of DEC_POINT_REPLACE as a replacement,
//  so that the jnest field within instances of MeteorValidator can be stored in a mongo db.
MeteorValidator.prototype.getLevels = function(levelPathArray){
	// see if this table is using ListValidator validation
	var listChoiceArray = listValidatorCache[this.tableName];
	var listChoiceResults = getListValidationChoice(levelPathArray,listChoiceArray);
	if(listChoiceResults && listChoiceResults.length>0){
		return listChoiceResults.sort();
	}
	// Meteor.call('validateTokens',this.tableName,levelPathArray,function(err,retLevels){
	// 	if(!err){
	// 		if(retLevels && retLevels.length>0){
	// 			return retLevels.sort();
	// 		}
	// 	}
	// });
	// get top level 
	var result = this.jnestMap;
	if(!result){
		return [];
	}

	for(var i=0;i<levelPathArray.length;i++){
		level = levelPathArray[i];
//		result = this.jnestMap[level];
		result = result[level];
		console.log('level='+level);
		if(!result){
			result={};
			break;
		}
	}
	return Object.keys(result).sort();
};


// There are 4 types of input fields:
//    1. dependent fields
//    2. independent fields 
//    3. free fields
//    4. regex fields
//  There is a MeteorValidator.prototype for each of these below

//    1. dependent fields
MeteorValidator.prototype.getColumnInputDepFieldChoices = function(oldInputHashTable){
	// var newInputHashTable   = null;
	var newInputHashTable = oldInputHashTable.clone();
	var tn = this.tableName;

	// 1. *************** do dependent fields ****************
	var depFieldOrder = this.depOrderList;
	if(depFieldOrder && depFieldOrder.length>0 ){
		// There is a validation order associated with this table.
		// Get the session variable that has the hashTable of current ColumnInputChoiceClass instances
		// Loop through validation order.
		//  Get currently input values from the hashTable in editInputSession.
		//   If there is not an entry in the hashTable, then get the possible
		//      choices for this field from the getLevels method in this.getLevels(levelList).
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
			var possChoices =  _.map(levs,function(possValue){return({'tableId':tn, 'colName':fieldToValidate,'choice':possValue.replace(DECIMAL_POINT_REPLACE,".")});});
			if(columnInputChoiceInstance && columnInputChoiceInstance.columnValue ){
				columnInputChoiceInstance.possChoicesArray = possChoices;
				// add this field to the validation hierarchy
				levelsList.push(columnInputChoiceInstance.columnValue);
				//  add it back to the new hashTable, which we will save later
				newInputHashTable.put(fieldToValidate,columnInputChoiceInstance);
			}else{
				var shouldBreak = true;
				// Create a new  ColumnInputChoiceClass instance - 
				//   BUT WITH NO FIELD VALUE SET !!!
				// There are 2 possibilities: either this field will be a regular
				//   dependent field, or this field is a "free field" within the
				//   dependent field chain.
				// Test for case 2:
				if(possChoices && possChoices[0] && possChoices[0].choice==='-'){
					newColumnInputChoiceInstance = new ColumnInputChoiceClass(fieldToValidate,"-",null,false);
				}else{
					// This is a normal dependent field:
					// Now see if this is a dependentField with only one choice.
					//  If so, then put that choice in the columnValue field of the constructor,
					//    and go on to the next field by setting shouldBreak to false.
					var columnValue = null;
					if(possChoices && possChoices[0] && possChoices.length===1 && possChoices[0].choice){
						columnValue = possChoices[0].choice;
						shoudBreak = false;
					}
					newColumnInputChoiceInstance = new ColumnInputChoiceClass(fieldToValidate,columnValue,possChoices,true);
				}
				newInputHashTable.put(fieldToValidate,newColumnInputChoiceInstance);
				if(shouldBreak){
					break;
				}
			}
		}
	}
	return newInputHashTable;
};

//    2. independent fields 
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

//    3. free fields
MeteorValidator.prototype.getColumnInputFreeFieldChoices = function(oldInputHashTable){
	var newInputHashTable = oldInputHashTable.clone();
	var tn = this.tableName;
	var freeFields = this.freeFieldList;
	for(var i = 0;i<freeFields.length;i++){
		var freeField = freeFields[i];
		var colInputIndepChoice =  newInputHashTable.get(freeField);
		if(!colInputIndepChoice){
			var possChoices =  null;
			var initValue = defaultFreeFieldvalue;
			var newColumnInputChoiceInstance = new ColumnInputChoiceClass(freeField,initValue,possChoices,false);
			newInputHashTable.put(freeField,newColumnInputChoiceInstance);
		}
	}
	return newInputHashTable;
};

//    4. regex fields
// regexFieldList is an object (originally a Java Map<String,String>)
//  each property of the object is of form  columnName:regexString
MeteorValidator.prototype.getColumnInputRegexFieldListChoices = function(oldInputHashTable){
	var newInputHashTable = oldInputHashTable.clone();
	var tn = this.tableName;
	var regexFieldList = this.regexFieldList;
	if(regexFieldList){
		var columnNames = Object.keys(regexFieldList); 
		if(columnNames && columnNames.length>0){
			for(var i = 0;i<columnNames.length;i++){
				var columnName = columnNames[i];
				var regexString = regexFieldList[columnName];
				var colInputRegexChoice =  newInputHashTable.get(columnName);
				if(!colInputRegexChoice){
					var possChoices =  null;
					var initValue = defaultFreeFieldvalue;
					var newColumnInputChoiceInstance = new ColumnInputChoiceClass(columnName,initValue,possChoices,false,regexString);
					newInputHashTable.put(columnName,newColumnInputChoiceInstance);
				}else{
					colInputRegexChoice.regexValidatorString = regexString;
					newInputHashTable.put(columnName,colInputRegexChoice);
				}
			}
		}
	}
	return newInputHashTable;

}

// ******************* END MeteorValidator *****************************

