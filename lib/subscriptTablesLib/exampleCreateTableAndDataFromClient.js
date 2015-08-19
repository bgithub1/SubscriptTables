/*
table logic


1.	header template calls view_control template

2.	view_control template calls tables helper, which reads all masterTableDefs 
	collection (variable MasterTableDefCollection) and displays a list of the table names.

3.	view_control.onClick method calls toggleSessionTableViewControlShow to set 
	session variable hideShowTable_'+masterTableId.

4.	the tablesTemplate helper “tables” listens to the all session variables whose 
	name starts with hideShowTable_ because it calls the 
	function  getSessionTableViewControlShow. This causes meteor to run the tablesTemplate html.  

5.	The helper “tables” returns a list of instances of masterTableClass from the 
	masterTableDefs collection and calls the tableTemplate template for 
	each instance of masterTableDefs that has been toggled on.

6.	The tableTemplate helpers have all of the functions that support the tableTemplate.


7.	masterTableClass has a field that determines if the tablesTemplate should show a 
	regular tableTemplate (full support for inputs, sorting, column elimination, etc) 
	or of type SimpleCsv

*/


/* 
	The following shows example client-side javascript code that shows 
		example usage.  
		!!! YOU MUST BE LOGGED IN AS THE admin.  
		(SEE the field adminName in serverDefs.js to know which email address is the admin's)

		Below is a function called allSteps, which calls 4 other functions:
		
			1. step1_exampleMasterTableDefClass - builds an instance of tableListFromJava, where
					the list is a single element type masterTableDef.  MasterTableDef objects
					define how data gets displayed.
			2. step2_exampleCallToAddAndRemoveMasterTableDef - is a  function that calls 2 Meteor.methods.
					The first method deletes an old masterTableObject, and the
					second method creates a new one.
			3. step3_exampleTableListCreation - creates another instance of tableListFromJava, however,
					this time the list holds actual json objects that will be displayed.
			4. step4_exampleWriteOfTableListDataToMeteor - calls the Meteor.method that populates the
					Meteor mongo database of data for the table you created in steps 1 and 2.
					The Meteor clients are all subscribed to receive any data that's get sent
					to these Meteor methods.  If the data records have a field called 'userId',
					then the users will receive only those records that coincide with their
					login email address.  If the records either don't have a 'userId' field, or
					if the userId field is blank (""), then those records get sent to every client.

*/


if(Meteor.isClient){

	allSteps = function(){
		// first create masterTableDef
		var masterTableDefInstance = step1_exampleMasterTableDefClass();
		// next send it to Meteor server
		step2_exampleCallToAddAndRemoveMasterTableDef(masterTableDefInstance);
		// next create some example data
		var listOfData = step3_exampleTableListCreation();
		// finally, send that to Meteor
		step4_exampleWriteOfTableListDataToMeteor(listOfData);
	};


	step1_exampleMasterTableDefClass = function(){
		// name the table with a name that's like a java class (you can use any name, but if you are
		//  are going to call these methods from java, you will probably use class names)
		var javeLikeClassNameAsTableId = 'misc.Trades';
		// columns c1, c2 and c3 will be 'groupBy' columns.  Therefore, they don't have totalling arrays
		//   as the 4th argument to the constructor tableColumnClass
		var c1 = new tableColumnClass('myFirstName','My First Name','myFirstName');
		var c2 = new tableColumnClass('myLastName','My Last Name','myLastName');
		var c3 = new tableColumnClass('shortName','shortName','shortName');
		// 
		// columns c4 and c5 are totalling columns.  Each call to their constructor (tableColumnClass)
		//  has a 4th argument.
		// for c4, the 4th argument is a 2 element array of columns that make up the weighted average
		//   price.  The second second element will be summed up and used as the demnominator so
		//   that the price that will be displayed in myPrice will be the sum of myPrice * myQty / sum(myQty)
		var c4 = new tableColumnClass('myPrice','My Price','myPrice',['myPrice','myQty']);
		// for c5, the 4th argument is just a 1 element array with the value of myQty.
		var c5 = new tableColumnClass('myQty','My Qty','myQty',['myQty']);

		// m1 is a new masterTableClass instance
		var m1 = new masterTableClass(javeLikeClassNameAsTableId,'My Test Class',
			javeLikeClassNameAsTableId,[c1,c2,c3,c4,c5]);
		var listOfMasterTableInstances = [m1]; // make an array of one element
		// make a tableList object and return it
		var javaMasterTableDefListInstance =
			new tableListFromJava(javeLikeClassNameAsTableId,listOfMasterTableInstances);
		return javaMasterTableDefListInstance;
	};

	step2_exampleCallToAddAndRemoveMasterTableDef = function(tableListFromJavaWithMasterTableDef){
		// assume that you are logged as admin
		var tableId = tableListFromJavaWithMasterTableDef['className'];
		//  call meteor to remove the old instance.
		Meteor.call('removeMasterTable',tableId);
		// call meteor to add the new table.  !!! THE 3RD PARAM IS AN ARRAY B/C
		//   YOU CAN SEND MULTIPLE TABLE DEFINITIONS IN ONE CALL !!!!
		// we are going to add only 1 masterTableDef
		Meteor.call('addMasterTablesFromJava',tableListFromJavaWithMasterTableDef);

	};

	step3_exampleTableListCreation = function(){
		// create a list of data.  ALL FIELDS ARE STRINGS.
		//  The numbers will be converted when the table is displayed
		tradeList = [{'_id':'1','userId':'admin1@demo.com',"shortName":"IBM","myPrice":"200","myQty":"10","myFirstName":"Billy","myLastName":"Byte"},
					{'_id':'2','userId':'admin1@demo.com',"shortName":"AAPL","myPrice":"500","myQty":"5","myFirstName":"Pete","myLastName":"Kutrum"},
					{'_id':'3','userId':'admin1@demo.com',"shortName":"MSFT","myPrice":"40","myQty":"45","myFirstName":"Mike","myLastName":"Byte"}];
		var javeLikeClassNameAsTableId = 'misc.Trades';
		var tblList = new tableListFromJava(javeLikeClassNameAsTableId,tradeList);

		return tblList;
	};

	step4_exampleWriteOfTableListDataToMeteor = function(tblList){
		// assume that you are logged as admin
		Meteor.call('addJavaListData',tblList);

	};



}