
/* 
	This example is like exampleCreateTableAndDataFromClient.js - but for building
		SimpleCsv tables
	The following shows example client-side javascript code that shows 
		example usage.  
		!!! YOU MUST BE LOGGED IN AS THE admin.  
		(SEE the field adminName in serverDefs.js to know which email address is the admin's)

		Below is a function called SimpleCsvExample_allSteps, which calls 4 other functions:
		
			1. step1_SimpleCsvExample_exampleMasterTableDefClass - builds an instance of tableListFromJava, where
					the list is a single element type masterTableDef.  MasterTableDef objects
					define how data gets displayed.
			2. step2_SimpleCsvExample_exampleCallToAddAndRemoveMasterTableDef - is a  function that calls 2 Meteor.methods.
					The first method deletes an old masterTableObject, and the
					second method creates a new one.
			3. step3_SimpleCsvExample_exampleTableListCreation - creates another instance of tableListFromJava, however,
					this time the list holds actual json objects that will be displayed.
			4. step4_SimpleCsvExample_exampleWriteOfTableListDataToMeteor - calls the Meteor.method that populates the
					Meteor mongo database of data for the table you created in steps 1 and 2.
					The Meteor clients are all subscribed to receive any data that's get sent
					to these Meteor methods.  If the data records have a field called 'userId',
					then the users will receive only those records that coincide with their
					login email address.  If the records either don't have a 'userId' field, or
					if the userId field is blank (""), then those records get sent to every client.

*/


if(Meteor.isClient){

	SimpleCsvExample_allSteps = function(){
		// first create masterTableDef
		var masterTableDefInstance = step1_SimpleCsvExample_exampleMasterTableDefClass();
		// next send it to Meteor server
		step2_SimpleCsvExample_exampleCallToAddAndRemoveMasterTableDef(masterTableDefInstance);
		// next create some example data
		var listOfData = step3_SimpleCsvExample_exampleTableListCreation();
		// finally, send that to Meteor
		step4_SimpleCsvExample_exampleWriteOfTableListDataToMeteor(listOfData);
	};


	step1_SimpleCsvExample_exampleMasterTableDefClass = function(){
		// name the table with a name that's like a java class (you can use any name, but if you are
		//  are going to call these methods from java, you will probably use class names)
		var javaLikeClassNameAsTableId = 'misc.SimpleCsvTrades';

		var isSimpleCsv = true;
		var validationJavascript = null;
		var tableColumnArray = null;// ["dummy"];
		// m1 is a new masterTableClass instance
		var m1 = new masterTableClass(
						javaLikeClassNameAsTableId,
						'My SimpleCsv Test Class',
						javaLikeClassNameAsTableId,
						tableColumnArray,
						validationJavascript,
						isSimpleCsv);

		var listOfMasterTableInstances = [m1]; // make an array of one element
		// make a tableList object and return it
		var javaMasterTableDefListInstance =
			new tableListFromJava(javaLikeClassNameAsTableId,listOfMasterTableInstances);
		return javaMasterTableDefListInstance;
	};

	step2_SimpleCsvExample_exampleCallToAddAndRemoveMasterTableDef = function(tableListFromJavaWithMasterTableDef){
		// assume that you are logged as admin
		var tableId = tableListFromJavaWithMasterTableDef['className'];
		//  call meteor to remove the old instance.
		Meteor.call('removeMasterTable',tableId);
		// call meteor to add the new table.  !!! THE 3RD PARAM IS AN ARRAY B/C
		//   YOU CAN SEND MULTIPLE TABLE DEFINITIONS IN ONE CALL !!!!
		// we are going to add only 1 masterTableDef
		Meteor.call('addMasterTablesFromJava',tableListFromJavaWithMasterTableDef);

	};

	step3_SimpleCsvExample_exampleTableListCreation = function(){
		// create a list of data
		tradeList = [
						{"_id":"admin1@demo.com_isHeader","userId":"admin1@demo.com","data":["shortName","myPrice","myQty","myFirstName","myLastName"]},
						{"_id":"admin1@demo.com_001","userId":"admin1@demo.com","data":["IBM",200,10,"Billy","Byte"]},
						{"_id":"admin1@demo.com_002","userId":"admin1@demo.com","data":["AAPL",500,5,"Pete","Kutrum"]},
						{"_id":"admin1@demo.com_003","userId":"admin1@demo.com","data":["MSFT",40,45,"Mike","Byte"]}
					];
		var javeLikeClassNameAsTableId = 'misc.SimpleCsvTrades';
		var tblList = new tableListFromJava(javeLikeClassNameAsTableId,tradeList);

		return tblList;
	};

	step4_SimpleCsvExample_exampleWriteOfTableListDataToMeteor = function(tblList){
		// assume that you are logged as admin
		Meteor.call('addJavaListData',tblList);

	};



}