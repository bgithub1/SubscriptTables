
// ****************************** BEGIN OF BOTH CODE ********************************
	// ListValidator objects are for each collection and userId pair that requires
	//    list validation
	ListValidator = function(collectionName,userId,currentLevels){
		this.collectionName = collectionName;
		this.userId = userId;
		this._id = collectionName+"_"+userId;
		this.currentLevels = currentLevels;
		this.nextFieldChoices = ListValidator.getChoices(collectionName,currentLevels);
	};
	// instance methods
	ListValidator.prototype.toMongo = function(){
		var search = {};
		search._id = this._id;
		ListValidatorCollection.remove(search);
		ListValidatorCollection.insert(this);
	};

	// static methods
	ListValidator.getChoices = function(collectionName,currentLevels){
		var listChoiceArray = listValidatorCache[collectionName];
		var listChoiceResults = getListValidationChoice(currentLevels,listChoiceArray);
		return listChoiceResults;
	};
	ListValidator.makeListValidatorId = function(collectionName,userId){
		return collectionName+"_"+userId;
	};
	ListValidator.fromMongo = function(collectionName){
		var userId= getUserId(this);
		if(!userId){
			console.log('no userid present when publishing ' + listValidatorCollectionName + ' for master table: '+collectionName);
			return null;
		}

		var search = {};
		search._id = ListValidator.makeListValidatorId(collectionName,userId);
		var listValidatorRec = ListValidatorCollection.find(search).fetch();
		return listValidatorRec;
	};



	listValidatorCollectionName = 'listValidatorColl';
	ListValidatorCollection = new Meteor.Collection(listValidatorCollectionName);

	/// this is the name of the collection that hold the names of other collections that
	//   hold lists of arrays to be used during listValidation.
	validationNamesCollectionName = 'validatorCollectionNames';
	// Create a validationSeparator which will be used to make arrays of validation tokens into strings,
	//   so that the validation tokens can be efficiently stored in mongo collections.  As well,
	//   use the validationSeparator will be used to re-create the token arrays on meteor.startup.
	validationSeparator = ";";

	// This is the cache that holds list of arrays to determine possible drop down choices.
	listValidatorCache = {};

	// Create the prefix that will go in front of the collection name to be validated
	validation_prefix = 'validator_';


	// get all of the possible choices for the next field after the last element
	//   of keyArray.
	//  So, if keyArray = ['FOP','NYMEX'], then get(['FOP','NYMEX']) will give you 
	//   all of the products, like LO, ON, LNE, etc.
	getListValidationChoice = function(keyArray,validationArray){
		if(keyArray[0] <= '  '){
			var firstElemArray = _.map(snlistsplit,function(item){
				return item[0];
			});
			return _.uniq(firstElemArray);
		}
		var numElem = keyArray.length;
		var key = keyArray.join(validationSeparator);
		var currKey;
		var f = _.filter(validationArray,function(x){
			currKey = x.slice(0,numElem).join(validationSeparator);
			return currKey===key; 
		});
		return _.uniq(_.map(f,function(x){return x[numElem]}));
	};

// ****************************** END OF BOTH CODE ********************************

// ****************************** BEGIN OF SERVER CODE ********************************

if(Meteor.isServer){
	
	// Create the ValidationNamesCollection collection that holds only names of OTHER collections
	//   These other collections will be named in the form validation_prefix + collectionName.
	//   The _id fields of records in this collection are made up of 
	//     mongoName+"_"+userId
	//   The records have fields for each column in the associated master table.  If the user
	//     has made a valid choice for a field, it will be in this record.  As well, the
	//     valid possible choices for the next field that the user can select will be in this
	//     record.  Any field that cannot as yet be chosen, will not have a field in this record.
	ValidationNamesCollection = new Meteor.Collection(validationNamesCollectionName);

	// The validatorCollectionTable will hold the collections that back the listValidatorCache.
	validatorCollectionTable = {};
	// Create a cache of validator lists

	// publish ListValidator for user's that subscribe
	//   each subscribe has an implicit userId.
	//  This publish routine will also initialize ListValidators for all userId's and
	//    all collections that need list validation
	Meteor.publish(listValidatorCollectionName,function(){
		var userId= getUserId(this);
		if(!userId){
			console.log('no userid present when publishing ' + listValidatorCollectionName + ' for master table: '+collectionName);
			return null;
		}

		var search = {};
		search.userId = userId;
		var listValidatorRecArr = ListValidatorCollection.find(search).fetch();
		if(listValidatorRecArr && listValidatorRecArr.length>0){
			// return a cursor when you publish
			return ListValidatorCollection.find(search);
		}

		// there are no records for any collection that uses list validators
		//   for this user.  So, initialize records for each collection that
		//   requires list validation
		var validationNamesArr = 
			_.map(ValidationNamesCollection.find().fetch(),function(validationName){
				return validationName._id;
			});
		// iterate through array and create initial ListValidator objects for this user
		//   for each collection that needs list validation.
		for(var i=0;i<validationNamesArr.length;i++){
			var validationName = validationNamesArr[i];
			// split the validationName
			var splitValues = validationName.split("_");
			if(splitValues && splitValues.length>1){
				var collectionName = splitValues[1];
				var initValidationArray = [];
				var newLv = new ListValidator(collectionName,userId,initValidationArray);
				newLv.toMongo();
			}
		}
		return ListValidatorCollection.find(search);
	});



	Meteor.methods({
		// addValidator adds a validationArray list to both an in memory cache and a mongo collection.
		//   The mongo collection is named validation_prefix + collectionName.
		// 	 The cache is an object that is referenced only by the collectionName.
		//   The mongo collection name is also stored in a mongo collection so that all of
		//     the validation collections can be read at server startup.
		//     See Meteor.startup in this .js file.
		// Each new 
		// validation array is an array of arrays like:
		// [ ['FUT','CME','ES'],['FUT','CME','6A'],['FUT','NYMEX','CL'],['FUT','NYMEX','NG'] ]
		addValidator: function(collectionName,validationArray){
	        try{
	            if(!isAdminUser(this)){
	              throw('addMasterTableFromJava: userId is not adminId');
	            }
	            // A meteor collection of the name validatorCollectionName will hold
	            //   a list of items that will be used in the validation process 
	            //    (like a list of tokens in which each token is a part of a commodity name).
	            var validatorCollectionName = validation_prefix + collectionName;
	            // The validatorCollectionTable is a where we store the validator collection objects.
	            var valCollection = validatorCollectionTable[validatorCollectionName];
	            // Is there a collection?
	            if(!valCollection){
	            	// If not, make a new one.
	            	valCollection =  new Meteor.Collection(validatorCollectionName);
	            	// And cache the collection for the next time
	            	validatorCollectionTable[validatorCollectionName] = valCollection;
	            }

	            // Remove all of the previous entries.
	            // You are removing records like {_id:'FUT;NYMEX;CL;USD;2016;01;00'} .
	            valCollection.remove({});
	            // Create strings out of validation array lines and save them in valCollection
	            //   so that they can be accessed on Meteor.startup().
	            _.each(validationArray,function(validationTokens){
	            	// turn ['FUT','CME','ES'] into 'FUT;CME;ES'
	            	var validationTokensJoined = validationTokens.join(validationSeparator);
	            	var valId = {};
	            	valId._id = validationTokensJoined;
	            	valCollection.insert(valId);
	            });

	            // If you get here, you are ok to save the validationArray in cache.
	            // This cache will also be initialized on server start up, using the collections that
	            //   have been created above.
	            listValidatorCache[collectionName] = validationArray;
	            obj = {}
	            obj._id = validatorCollectionName;
	            ValidationNamesCollection.remove(obj);
	            ValidationNamesCollection.insert(obj);

	        }
	        catch(err){
	            console.log('Meteor.methods ERROR in addValidator adding validator failed for collection ' + collectionName + ' : err = '+err);
	            return [err];
	        }
	      },

	      // meteor method to use list validator
	      validateTokens : function(collectionName,currentLevels){
	      	try{
				var userid= getUserId(this);
				if(!userid){
					console.log('no userid present when publishing ' + listValidatorCollectionName + ' for master table: '+collectionName);
					return;
				}

	      		var listValidatorRec = new ListValidator(collectionName,userid,currentLevels);
				listValidatorRec.toMongo();
	      	}catch(err){
		            console.log('Meteor.methods ERROR in validateTokens for collectionName: '+collectionName + ' currentLevels: ' + currentLevels + ' err: '+err);
	      	}
	      },
	      getListValidatorList : function(collectionNam){
	      		return listValidatorCache[collectionName];
	      },
	      getListValidatorCache : function(){
	      		return listValidatorCache;
	      },
	      getListValidatorChoice : function(collectionName,levelPathArray){
	      		var listToUseInGetChoices = listValidatorCache[collectionName];
	      		return getListValidationChoice(levelPathArray,listToUseInGetChoices);	
	      },
 
	});


    Meteor.startup(function(){
    	console.log("Meteor.startup for listValidator.js");
    	

    	// Get all of the names of the collections that hold validators.
    	var validatorCollectionNamesArray = 
    		_.map(ValidationNamesCollection.find().fetch(),function(nameObj){
    			return nameObj._id;
    		});
    	// Now read all of these collections into cache and ALSO,
    	//  read the CONTENTS of the collections into the listValidatorCache object.
    	_.each(validatorCollectionNamesArray,function(validatorCollectionName){
    		// Get the collection that holds the stringified validation tokens for the collection
    		//   whose name is in validatorCollectionName.
        	valCollection =  new Meteor.Collection(validatorCollectionName);
        	// Store that collection.  THIS IS NOT USED RIGHT NOW, BUT FOR LATER USE.
        	validatorCollectionTable[validatorCollectionName] = valCollection;
        	// Create an array of arrays out of an array of tokens separted by validationSeparator
        	var validationArray = _.map(valCollection.find().fetch(),function(validatorString){
        		// Return an array by spliting the validatorString using the validationSeparator.
        		return validatorString._id.split(validationSeparator);
        	});
        	// Store the validationArray.  This will be used in the Meteor.method validateTokens.
        	// Strip off the validation_prefix part of validatorCollectionName so that you
        	//   are storing the validationArray's by only the collectionName.
        	var splitArr = validatorCollectionName.split(validation_prefix);
        	if(splitArr && splitArr.length>1){
	        	var collectionName = splitArr[1];
	        	listValidatorCache[collectionName] = validationArray;
        	}
    	});
    });


	
}

// ****************************** END OF SERVER CODE ********************************



// ****************************** BEGIN OF CLIENT CODE ********************************

if(Meteor.isClient){


	// Client side only collection to hold current
	Meteor.startup(function(){
		Meteor.call('getListValidatorCache',function(err,cache){
			if(err){
				throw 'Error getting listValidatorCache from server on Client side Meteor.startup().  err= '+ err;
			}
			listValidatorCache = cache;
		});

		// Meteor.subscribe(listValidatorCollectionName);


	});

}

// ****************************** END OF CLIENT CODE ********************************



