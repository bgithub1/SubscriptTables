if(Meteor.isClient){

	CreateTableWithValidator_allSteps = function(){
		// first create the table with old example
		allSteps();
		// now create a validator object
		var _id = 'misc.Trades';
		var tableName = _id;
		var userId = null;

		// the jnestMap has 2 levels, one for lastName and another for firstName
		//   the last level is made up of objects whose key and value are the same !!!!
		var jnestMap = {
			'Perlman':  {
							'Bill':'Bill','Mike':'Mike','Robyn':'Robyn'
						},
			'Hartman':  {
							'Sarah':'Sarah','Jodi':'Jodi','Jim':'Jim'
						},
			'Smith':    {
							'Alice':'Alice','Bob':'Bob','Jane':'Jane','Sam':'Sam'
						}
		};
		var depOrderList = ["myLastName","myFirstName"]; // these are the 2 fields that will be validated in the jnestMap
		var independPossChoicesMap = [];
		var freeFieldList = ['shortName'];
		var priceRegex = '^[+-]{0,1}[0-9]{0,}\\.{0,1}[0-9]{0,}$';
		var qtyRegex = '^[+-]{0,1}[0-9]{0,}$';
		var regexFieldList = {
			'myPrice':priceRegex,
			'myQty':qtyRegex
		};

		var normalCollectionObjectThatIsReallyAValidator = {};
		normalCollectionObjectThatIsReallyAValidator._id = _id;
		normalCollectionObjectThatIsReallyAValidator.userId = userId;
		normalCollectionObjectThatIsReallyAValidator.tableName = tableName;
		normalCollectionObjectThatIsReallyAValidator.jnestMap = jnestMap;
		normalCollectionObjectThatIsReallyAValidator.depOrderList = depOrderList;
		normalCollectionObjectThatIsReallyAValidator.independPossChoicesMap = independPossChoicesMap;
		normalCollectionObjectThatIsReallyAValidator.freeFieldList = freeFieldList;
		normalCollectionObjectThatIsReallyAValidator.regexFieldList = regexFieldList;

		var tblList = new tableListFromJava(meteorValidatorCollectionName,[normalCollectionObjectThatIsReallyAValidator]);
		
		Meteor.call('addJavaListData',tblList,function(err,ret){console.log("error: "+err+" ret: "+ret)});
	
	};
}




