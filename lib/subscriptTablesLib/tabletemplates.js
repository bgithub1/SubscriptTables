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

}
