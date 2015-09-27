if(Meteor.isClient){

	CreateSchoolTableWithListValidator_allSteps = function(useBigList){
		// name the table with a name that's like a java class (you can use any name, but if you are
		//  are going to call these methods from java, you will probably use class names)
		var javaLikeClassNameAsTableId = 'burl.students';

		// first create masterTableDef
		var masterTableDefInstance = step1_School_exampleMasterTableDefClass(javaLikeClassNameAsTableId);
		// next send it to Meteor server
		step2_School_exampleCallToAddAndRemoveMasterTableDef(masterTableDefInstance);
		step3_School_exampleAddClientSideMeteorValidationObject(javaLikeClassNameAsTableId);
		step4_School_exampleCallAddValidator(javaLikeClassNameAsTableId,useBigList);
	};


	step1_School_exampleMasterTableDefClass = function(javaLikeClassNameAsTableId){
		// columns c1, c2 and c3 will be 'groupBy' columns.  Therefore, they don't have totalling arrays
		//   as the 4th argument to the constructor tableColumnClass
		var c1 = new tableColumnClass('student','student','student');
		var c2 = new tableColumnClass('userId','userId','teacher');
		var c21 = new tableColumnClass('class','class','class');
		var c3 = new tableColumnClass('year','year','year');
		var c4 = new tableColumnClass('month','month','month');
		var c5 = new tableColumnClass('day','day','day');
		var c6 = new tableColumnClass('dayOfWeek','dayOfWeek','dayOfWeek');
		var c7 = new tableColumnClass('attendance','attendance','attendance',['attendance']);
		var c8 = new tableColumnClass('participation','participation','participation',['participation']);
		var c9 = new tableColumnClass('behavior','behavior','behavior',['behavior']);
		// 

		// m1 is a new masterTableClass instance
		var m1 = new masterTableClass(javaLikeClassNameAsTableId,'Student Entry',
			javaLikeClassNameAsTableId,[c1,c2,c21,c3,c4,c5,c6,c7,c8,c9]);
//			javaLikeClassNameAsTableId,[c1,c3,c4,c5,c6,c7,c8,c9]);
		var listOfMasterTableInstances = [m1]; // make an array of one element
		// make a tableList object and return it
		var javaMasterTableDefListInstance =
			new tableListFromJava(javaLikeClassNameAsTableId,listOfMasterTableInstances);
		return javaMasterTableDefListInstance;
	};

	step2_School_exampleCallToAddAndRemoveMasterTableDef = function(tableListFromJavaWithMasterTableDef){
		// assume that you are logged as admin
		var tableId = tableListFromJavaWithMasterTableDef['className'];
		//  call meteor to remove the old instance.
		Meteor.call('removeMasterTable',tableId);
		// call meteor to add the new table.  !!! THE 3RD PARAM IS AN ARRAY B/C
		//   YOU CAN SEND MULTIPLE TABLE DEFINITIONS IN ONE CALL !!!!
		// we are going to add only 1 masterTableDef
		Meteor.call('addMasterTablesFromJava',tableListFromJavaWithMasterTableDef);

	};

	step3_School_exampleAddClientSideMeteorValidationObject = function(javaLikeClassNameAsTableId){
		var _id = javaLikeClassNameAsTableId;
		var tableName = _id;
		var userId = null;

		// the jnestMap has 2 levels, one for lastName and another for firstName
		//   the last level is made up of objects whose key and value are the same !!!!
		var jnestMap = null;
		// these  fields that will be validated by the list Validator
		//  the client needs this list as well to step from field to field as it shows drop-down boxes
		var depOrderList = ['year','month','day','dayOfWeek']; 
		var independPossChoicesMap = 
				{
					'student':[
						'Perlman, Bill',
						'Hartman, Sarah',
						'Burlinson, John'
					],
					'class':['1','2','3','4','5','6'],
					'attendance':['0','1'],
					'participation':['0','1'],
					'behavior':['0','1']
				};
		var freeFieldList = [];

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
		normalCollectionObjectThatIsReallyAValidator.regexFieldList = [];

		// !!!!! VERY IMPORTANT - NOTICE THAT THE COLLECTION NAME = the value of meteorValidatorCollectionName.
		//  The collectionName in the call to tableListFromJava is NOT the actuall name of the data collection.
		//   It's the name of the collection that hold validator objects
		var tblList = new tableListFromJava(meteorValidatorCollectionName,[normalCollectionObjectThatIsReallyAValidator]);
		// The client side validator is just a regular data list that you send to Meteor,
		//   but with only one element.
		Meteor.call('addJavaListData',tblList,function(err,ret){console.log("error: "+err+" ret: "+ret)});

	};


	step4_School_exampleCallAddValidator = function(javaLikeClassNameAsTableId,useBigList){
	var listToSend = [
				['2015','09','25','Fri'],
				['2015','09','28','Mon'],
				['2015','09','29','Tue'],
				['2015','09','30','Wed'],
				['2015','10','01','Thur'],
				['2015','10','02','Fri'],
				['2015','10','05','Mon'],
				['2015','10','06','Tue'],
				['2015','10','07','Wed'],
				['2015','10','08','Thur'],
				['2015','10','09','Fri'],
				['2015','10','12','Mon'],
				['2015','10','13','Tue'],
				['2015','10','14','Wed'],
				['2015','10','15','Thur'],
				['2015','10','16','Fri'],
				['2015','10','19','Mon'],
				['2015','10','20','Tue'],
				['2015','10','21','Wed'],
				['2015','10','22','Thur'],
				['2015','10','23','Fri'],
				['2015','10','26','Mon'],
				['2015','10','27','Tue'],
				['2015','10','28','Wed'],
				['2015','10','29','Thur'],
				['2015','10','30','Fri'],
				['2015','11','02','Mon'],
				['2015','11','03','Tue'],
				['2015','11','04','Wed'],
				['2015','11','05','Thur'],
				['2015','11','06','Fri'],
				['2015','11','09','Mon'],
				['2015','11','10','Tue'],
				['2015','11','11','Wed'],
				['2015','11','12','Thur'],
				['2015','11','13','Fri'],
				['2015','11','16','Mon'],
				['2015','11','17','Tue'],
				['2015','11','18','Wed'],
				['2015','11','19','Thur'],
				['2015','11','20','Fri'],
				['2015','11','23','Mon'],
				['2015','11','24','Tue'],
				['2015','11','25','Wed'],
				['2015','11','26','Thur'],
				['2015','11','27','Fri'],
				['2015','11','30','Mon'],
				['2015','12','01','Tue'],
				['2015','12','02','Wed'],
				['2015','12','03','Thur'],
				['2015','12','04','Fri'],
				['2015','12','07','Mon'],
				['2015','12','08','Tue'],
				['2015','12','09','Wed'],
				['2015','12','10','Thur'],
				['2015','12','11','Fri'],
				['2015','12','14','Mon'],
				['2015','12','15','Tue'],
				['2015','12','16','Wed'],
				['2015','12','17','Thur'],
				['2015','12','18','Fri'],
				['2015','12','21','Mon'],
				['2015','12','22','Tue'],
				['2015','12','23','Wed'],
				['2015','12','24','Thur'],
				['2015','12','25','Fri'],
				['2015','12','28','Mon'],
				['2015','12','29','Tue'],
				['2015','12','30','Wed'],
				['2016','01','04','Mon'],
				['2016','01','05','Tue'],
				['2016','01','06','Wed'],
				['2016','01','07','Thur'],
				['2016','01','08','Fri'],
				['2016','01','11','Mon'],
				['2016','01','12','Tue'],
				['2016','01','13','Wed'],
				['2016','01','14','Thur'],
				['2016','01','15','Fri'],
				['2016','01','18','Mon'],
				['2016','01','19','Tue'],
				['2016','01','20','Wed'],
				['2016','01','21','Thur'],
				['2016','01','22','Fri'],
		];


		Meteor.call('addValidator',javaLikeClassNameAsTableId,listToSend,
			function(err,ret){
				if(err){
					console.log("error from step4_Ctwlv_exampleCallAddValidator: " + err);
				}else{
					console.log("return from step4_Ctwlv_exampleCallAddValidator: " + ret);
				}
			});


	}



} // end Meteor.isClient
