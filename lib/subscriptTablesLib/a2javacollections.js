// create meteor validator and put it into the proper places
meteorValidatorTableModel = function(javeLikeClassNameAsTableId){
	var m1 = new masterTableClass(javeLikeClassNameAsTableId,javeLikeClassNameAsTableId,
		javeLikeClassNameAsTableId,[]);
	var listOfMasterTableInstances = [m1]; // make an array of one element
	// make a tableList object and return it
	var javaMasterTableDefListInstance =
		new tableListFromJava(javeLikeClassNameAsTableId,listOfMasterTableInstances);
	return(javaMasterTableDefListInstance);
};


// tableList holds the list and the name of the table (normmally the java class name)
tableList = function(tableName,listOfObjects){
	this.tableName = tableName;
	this.listOfObjects = listOfObjects;
};

// tableListFromJava IS A FUNCTION THAT BUILDS OBJECTS THAT ARE IDENTICAL TO
//   WHAT IS SENT VIA meteor-java-collections
tableListFromJava = function(tableName,listOfObjects){
	this.list = listOfObjects;
	this['className'] = tableName;
};



// tableListFromJavaListObject returns a tableList object from a tableListFromJava object
//   tableListFromJava objects are the json objects that comes from meteor-java-collections.java 
tableListFromJavaListObject = function(jsonJavaList){
	if(!jsonJavaList)return null;
	// get list element
	var actualList = jsonJavaList.list;
	if(!actualList)return null;
	// get java class name
	var className = jsonJavaList['className'];
	if(!className) return null;

	return new tableList(className,actualList);

};


masterTableFromTableList = function(tableListObj){
	if(!tableListObj) return;
	// get class
	var className = tableListObj.tableName;
	// get the list
	var actualList = tableListObj.listOfObjects;
	// return if nothing there
	if(!actualList)return;
	// return if no elements
	if(actualList.length <=0)return;
	var fieldNames = [];
	var isNumArr = [];
	// create array of field/column names
	for(var prop2 in actualList[0]){
		fieldNames.push(prop2);
		var val = actualList[0][prop2];
		if(isNumber(val)){
			isNumArr.push(1);
		}else{
			isNumArr.push(0);
		}
	}
	// make sure there are columns
	if(fieldNames.length<=0)return;
	// create tableColumnClass array for masterTable
	var tccArr = [];
	for(var j=0;j<fieldNames.length;j++){
		var fn = fieldNames[j];
		var totallingDef = null;
		if(isNumArr[j]===1){
			// this needs to become an object like ['qty','price']   (old way was ['qty',['qty','price']]
				// so that you can create a column values that are weighted avgerages of
				//  qty and price.
			// needs chg
//			totallingDef = [fn,[fn]];
			totallingDef = [fn];
		}
		
		var  tcc = new tableColumnClass(fn,fn,fn,totallingDef);
		tccArr.push(tcc);
	}
	var newMt = new masterTableClass(className,tccArr);
	return newMt;

};





