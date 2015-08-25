



if(Meteor.isClient){

	CreateTableWithListValidator_allSteps = function(useBigList){
		// name the table with a name that's like a java class (you can use any name, but if you are
		//  are going to call these methods from java, you will probably use class names)
		var javaLikeClassNameAsTableId = 'misc.TradeEntry';

		// first create masterTableDef
		var masterTableDefInstance = step1_Ctwlv_exampleMasterTableDefClass(javaLikeClassNameAsTableId);
		// next send it to Meteor server
		step2_Ctwlv_exampleCallToAddAndRemoveMasterTableDef(masterTableDefInstance);
		step3_Ctwlv_exampleAddClientSideMeteorValidationObject(javaLikeClassNameAsTableId);
		step4_Ctwlv_exampleCallAddValidator(javaLikeClassNameAsTableId,useBigList);
	};


	step1_Ctwlv_exampleMasterTableDefClass = function(javaLikeClassNameAsTableId){
		// columns c1, c2 and c3 will be 'groupBy' columns.  Therefore, they don't have totalling arrays
		//   as the 4th argument to the constructor tableColumnClass
		var c1 = new tableColumnClass('type','type','type');
		var c2 = new tableColumnClass('exch','exch','exch');
		var c3 = new tableColumnClass('symbol','symbol','symbol');
		var c4 = new tableColumnClass('curr','curr','curr');
		var c5 = new tableColumnClass('year','year','year');
		var c6 = new tableColumnClass('month','month','month');
		var c7 = new tableColumnClass('day','day','day');
		var c8 = new tableColumnClass('putCall','putCall','putCall');
		var c9 = new tableColumnClass('strike','strike','strike');
		// 
		// columns c4 and c5 are totalling columns.  Each call to their constructor (tableColumnClass)
		//  has a 4th argument.
		// for c4, the 4th argument is a 2 element array of columns that make up the weighted average
		//   price.  The second second element will be summed up and used as the demnominator so
		//   that the price that will be displayed in myPrice will be the sum of myPrice * myQty / sum(myQty)
		var c10 = new tableColumnClass('price','price','price',['price','qty']);
		// for c5, the 4th argument is just a 1 element array with the value of myQty.
		var c11 = new tableColumnClass('qty','qty','qty',['qty']);

		// m1 is a new masterTableClass instance
		var m1 = new masterTableClass(javaLikeClassNameAsTableId,'Trade Entry',
			javaLikeClassNameAsTableId,[c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11]);
		var listOfMasterTableInstances = [m1]; // make an array of one element
		// make a tableList object and return it
		var javaMasterTableDefListInstance =
			new tableListFromJava(javaLikeClassNameAsTableId,listOfMasterTableInstances);
		return javaMasterTableDefListInstance;
	};

	step2_Ctwlv_exampleCallToAddAndRemoveMasterTableDef = function(tableListFromJavaWithMasterTableDef){
		// assume that you are logged as admin
		var tableId = tableListFromJavaWithMasterTableDef['className'];
		//  call meteor to remove the old instance.
		Meteor.call('removeMasterTable',tableId);
		// call meteor to add the new table.  !!! THE 3RD PARAM IS AN ARRAY B/C
		//   YOU CAN SEND MULTIPLE TABLE DEFINITIONS IN ONE CALL !!!!
		// we are going to add only 1 masterTableDef
		Meteor.call('addMasterTablesFromJava',tableListFromJavaWithMasterTableDef);

	};

	step3_Ctwlv_exampleAddClientSideMeteorValidationObject = function(javaLikeClassNameAsTableId){
		var _id = javaLikeClassNameAsTableId;
		var tableName = _id;
		var userId = null;

		// the jnestMap has 2 levels, one for lastName and another for firstName
		//   the last level is made up of objects whose key and value are the same !!!!
		var jnestMap = null;
		// these  fields that will be validated by the list Validator
		//  the client needs this list as well to step from field to field as it shows drop-down boxes
		var depOrderList = ['type','exch','symbol','curr','year','month','day','putCall','strike']; 
		var independPossChoicesMap = [];
		var freeFieldList = [];
		var priceRegex = '^[+-]{0,1}[0-9]{0,}\\.{0,1}[0-9]{0,}$';
		var qtyRegex = '^[+-]{0,1}[0-9]{0,}$';
		var regexFieldList = {
			'price':priceRegex,
			'qty':qtyRegex
		};

		var normalCollectionObjectThatIsReallyAValidator = {};
		normalCollectionObjectThatIsReallyAValidator._id = _id;
		normalCollectionObjectThatIsReallyAValidator.userId = userId;
		normalCollectionObjectThatIsReallyAValidator.tableName = tableName;
		//  we are adding a NULL jnestMap here.
		//    in step4 below, we will explicity call Meteor.call('addValidator' ...
		//    so that we add a list of arrays that can be used to validate drop down fields
		//    as the fields are selected by the user.
		normalCollectionObjectThatIsReallyAValidator.jnestMap = jnestMap;
		normalCollectionObjectThatIsReallyAValidator.depOrderList = depOrderList;
		normalCollectionObjectThatIsReallyAValidator.independPossChoicesMap = independPossChoicesMap;
		normalCollectionObjectThatIsReallyAValidator.freeFieldList = freeFieldList;
		normalCollectionObjectThatIsReallyAValidator.regexFieldList = regexFieldList;

		// !!!!! VERY IMPORTANT - NOTICE THAT THE COLLECTION NAME = the value of meteorValidatorCollectionName.
		//  The collectionName in the call to tableListFromJava is NOT the actuall name of the data collection.
		//   It's the name of the collection that hold validator objects
		var tblList = new tableListFromJava(meteorValidatorCollectionName,[normalCollectionObjectThatIsReallyAValidator]);
		// The client side validator is just a regular data list that you send to Meteor,
		//   but with only one element.
		Meteor.call('addJavaListData',tblList,function(err,ret){console.log("error: "+err+" ret: "+ret)});

	};


	step4_Ctwlv_exampleCallAddValidator = function(javaLikeClassNameAsTableId,useBigList){
	var dotSeparatedList = [
					"6A.FUT.CME.USD.201509",
					"6A.FUT.CME.USD.201512",
					"6A.FOP.CME.USD.201509.C.1.000",
					"6A.FOP.CME.USD.201509.C.1.100",
					"6A.FOP.CME.USD.201509.C.1.200",
					"6A.FOP.CME.USD.201512.C.1.000",
					"6A.FOP.CME.USD.201512.C.1.100",
					"6A.FOP.CME.USD.201512.C.1.200",
					"6B.FUT.CME.USD.201509",
					"6B.FUT.CME.USD.201512",
					"6B.FOP.CME.USD.201509.C.1.000",
					"6B.FOP.CME.USD.201509.C.1.100",
					"6B.FOP.CME.USD.201509.C.1.200",
					"6B.FOP.CME.USD.201512.C.1.000",
					"6B.FOP.CME.USD.201512.C.1.100",
					"6B.FOP.CME.USD.201512.C.1.200",
					"CL.FUT.NYMEX.USD.201509",
					"CL.FUT.NYMEX.USD.201512",
					"LO.FOP.NYMEX.USD.201509.C.52.00",
					"LO.FOP.NYMEX.USD.201509.C.54.00",
					"LO.FOP.NYMEX.USD.201512.C.52.00",
					"LO.FOP.NYMEX.USD.201512.C.54.00",
					"LO.FOP.NYMEX.USD.201609.C.52.00",
					"LO.FOP.NYMEX.USD.201609.C.54.00",
					"LO.FOP.NYMEX.USD.201612.C.52.00",
					"LO.FOP.NYMEX.USD.201612.C.54.00",
					"NG.FUT.NYMEX.USD.201509",
					"NG.FUT.NYMEX.USD.201512",
					"ON.FOP.NYMEX.USD.201509.C.2.100",
					"ON.FOP.NYMEX.USD.201509.C.2.250",
					"ON.FOP.NYMEX.USD.201512.C.2.100",
					"ON.FOP.NYMEX.USD.201512.C.2.250",
		];


		var listToUse = dotSeparatedList;
		if(typeof biglist !== 'undefined'){
			listToUse = biglist;
		}
		var listToSend = createListValidationTokensFromDotSeparatedList(listToUse);
		Meteor.call('addValidator',javaLikeClassNameAsTableId,listToSend,
			function(err,ret){
				if(err){
					console.log("error from step4_Ctwlv_exampleCallAddValidator: " + err);
				}else{
					console.log("return from step4_Ctwlv_exampleCallAddValidator: " + ret);
				}
			});


	}


	// use the snTokenOrder array as indexes into the snlist to create an
	//  array of arrays of shortName part tokens.
	//  e.g LO.FOP.NYMEX.USD.201508.C.52.50  will turn into: 
	//     ['FOP','NYMEX','LO','USD','2015,'08,'00','C','52__50']
	createListValidationTokensFromDotSeparatedList = function(dotSeparatedList){
		var snlist = dotSeparatedList;
		var snTokenOrder = [1,2,0,3,4,4,4,5,6]

		// create the array of arrays with elements like: 
		//     ['FOP','NYMEX','LO','USD','2015,'08,'00','C','52__50']
		var snlistsplit = _.map(snlist,function(x){
			var sp = x.split('.');
			if(sp.length>7){
				sp[6] = sp[6]+"__"+sp[7];
				sp = sp.splice(0,7);
			};
			var ret = [];
			var spl = sp.length;
			for(var i =0;i<snTokenOrder.length;i++){
				var tokenIndex = snTokenOrder[i];
				if(spl>tokenIndex){
					ret[i] = sp[snTokenOrder[i]];
				};
			}
			ret[4] = ret[4].substr(0,4);
			ret[5] = ret[5].substr(4,2);
			if(ret[6].length>7){
				ret[6] = ret[6].substr(6,2);
			}else{
				ret[6] = '0';
			}
			// this is the return from _.map
			return ret;
		});

		return snlistsplit;

	}




}

