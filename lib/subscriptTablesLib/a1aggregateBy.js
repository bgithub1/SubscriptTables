// helper functions
// isNumber does what it says
isNumber = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

// end helper functions


//****************** hashTable - like a java hashtable *****************
//  example:
//  var myHashTable = new hashTable();
//  myHashTable.put("IBM",210.00);
//  myHashTable.put("GE", 25.00;
//  myHashTable.put("MSFT",30.00);
//  myHashTable.put("AAPL",400.00);
//  var keys = myHashTable.keySet();
//  for(var i = 0;i<keys.length;i++){
//    var key = keys[i];
//    var value = myHashTable.get(key);
//  }
//
//
store_fid = 'store';
hashTable = function(){
  this.store={};
  this.put = function(key,value){
    this.store[key] = value;
  };
  this.get = function(key){
    return this.store[key];
  };
  this.keySet = function(){
    var ret = [];
    for(var prop in this.store){
      ret.push(prop);
    }
    return ret;
  };
  this.values = function(){
    ret = [];
    for(var prop in this.store){
      ret.push(this.store[prop]);
    }
    return ret;
  };
  this.remove = function(key){
    delete this.store[key];
  };

  this.count = function(){
    return this.values().length;
  };

  this.clone = function(){
    var keys = this.keySet();
    var newHashTable = new hashTable();
    for(var i=0;i<keys.length;i++){
      var key = keys[i];
      var value = this.get(key);
      newHashTable.put(key,value);
    }
    return (newHashTable);
  };

};

// hashSet - like java hashSet
hashSet = function(){
  this.innerMap = new hashTable();
  this.add = function(value){
    this.innerMap.put(value,true);
  };
  this.remove = function(value){
    this.innerMap.remove(value);
  };
  this.values = function(){
    return this.innerMap.keySet();
  };
  this.contains = function(value){
    var v = this.innerMap.get(value);
    if(v){
      return true;
    }
    return false;
  };
  this.count = function(){
    return this.innerMap.count();
  };
};

// hashTableFromObject - create a hash of the properties of an object
hashTableFromObject = function(objToHash){
  var ret = new hashTable();
  for(var prop in objToHash){
    ret.put(prop,objToHash[prop]);
  }
  return ret;
};


// *************** end hashTable definition *****************


// *************** aggregation functions **********************
// regroup and aggregate lists of json
//  see example testjs.js
//  
    hasIt = function(obj, target) {
        return _.any(obj, function(value) {
            return _.isEqual(value, target);
        });
    };

    propToAggregate = function(newPropertyName,oldPropertiesToCombineArray){
      this.newPropertyName = newPropertyName;
      this.oldPropertiesToCombineArray = oldPropertiesToCombineArray;
    };

    aggregate = function(data,groupByArr,propToAggregateArray,func){
      var stems =  _.reduce(
        data,
        function (memo, item) {
            var key = _.pick(item, groupByArr);
            if (!hasIt(memo, key)) {
                memo.push(key);
            }
            return memo;
        },
        []
      );

      var group =  _.map(stems, function(stem) {
          return {
              key: stem,
              vals:_.map(_.where(data, stem), function(item) {
                  return _.omit(item, groupByArr);
              })
          };
      }, this);


      return _.map(group,
          function(item) {
            var ret = {};
            for(var i = 0;i<propToAggregateArray.length;i++){
              var propToAggregate = propToAggregateArray[i];
              var newPropName = propToAggregate.newPropertyName;
              ret[newPropName] = _.reduce(
                item.vals,
                function(memo, node) {
                  var valuesArray = [];
                  var columnsToAggregate = propToAggregate.oldPropertiesToCombineArray;
                  for(var j = 0;j<columnsToAggregate.length;j++){
                    var propertyOfThisNode = columnsToAggregate[j];
                    valuesArray.push(node[propertyOfThisNode]);
                  }
                  return func(memo,valuesArray);
                },
                0);
              }
            return _.extend({}, item.key,ret);
          });
    };


    function aggSumProduct(previous,valuesToMultiply){
        var product = 1;
        for(var i = 0;i<valuesToMultiply.length;i++){
          var valueOfProp = valuesToMultiply[i];
          product = product * Number(valueOfProp);
        }
        var ret = previous + product;
        return ret;
    }

    function aggSumDivide2Values(previous,valuesToMultiply){
        var numerator = valuesToMultiply[0];
        var denominator = 1;
        if(valuesToMultiply.length>1){
          denominator = valuesToMultiply[1];
        }
        return previous + numerator/denominator;
    }

    aggByArray = function(data,groupByArray,totalingArray,func){
      var propertiesToAggregateArray = [];
      for(var i = 0;i<totalingArray.length;i++){
        propertiesToAggregateArray[i] = new propToAggregate(totalingArray[i][0],totalingArray[i][1]);
      }
      var ret = aggregate(data,groupByArray,propertiesToAggregateArray,func);
      return ret;
    };

    //  ********* tableSumProduct **********
    //  Produce the sumProduct of a set of columns, or just the sum.
    //  Arguments:
    //  arg0  (data) : a json array of data
    //  arg1  (groupByArray): an array of strings that have the names of fields in each json object.  
    //     tableSumProduct will group it's output by unique combinations of the values
    //     in these fields.
    //  arg2  (totalingArray): an array of arrays, where the inner array items are as follows:
    //     arg2[i][0]: the name of the new field whose value will be the sum per that groupBy;
    //     arg2[i][1]: an array of fields names, whose values get multiplied together to form
    //                 the product of each element of the sumProduct.
    //    Example of arg2 (totalingArray):
    //        var totalingArray = [
    //            ["Qty",["Qty"]],
    //            ["Price",["Price","Qty"]],
    //        ];
    //
    // Compute the sum product for each column that you pass in totalingArray.  Group
    //   all table items by the columns provided in groupByArray
    //
    // TotalingArray is an array of arrays.  Each innner array has 2 dimensions:
    //   The first dimension is a column name that will appear in the table, AFTER 
    //      sumByArray is done.
    //
    //   The second dimension is another array of columns that will be multiplied together
    //      to create the "products" for the "sumproduct"
    //      If this second dimension is an array with only one element, then tableSumProduct
    //      will produce the sum of that column.
    tableSumProduct = function(data,groupByArray,totalingArray){
      return aggByArray(data,groupByArray,totalingArray,aggSumProduct);
    };

    // *********** tableWeightedAverage **********************
    //  Arguments:
    //  arg0  (data) : a json array of data
    //  arg1  (groupByArray): an array of strings that have the names of fields in each json object.  
    //     tableSumProduct will group it's output by unique combinations of the values
    //     in these fields.
    //  arg2  (totalingArray): an array of arrays, where the inner array items are as follows:
    //     arg2[i][0]: the name of the new field whose value will be the sum per that groupBy;
    //     arg2[i][1]: an array of fields names, whose values get multiplied together to form
    //                 the product of each element of the sumProduct.
    //     
    // Produce a weighted average of the sets of columns that you pass in totalingArray.
    //    This method will do the following:
    //       1. Produce sumProducts for each pairs of columns;
    //       2. Divide each sumProduct by the value of the second element of the pair.
    //       For example, if you have 2 columns, Price and Qty, and you want to produce
    //          the weighted average Price, then the totallingArray parameter that you pass
    //          to tableWeightedAverage should have one element: ["Price",["Price","Qty"]].
    //          The first element, "Price", specifies what name you want for the new
    //             weighted average column.  The second element, the array ["Price","Qty"] tells
    //             tableWeightedAverage to multiply Price X Qty, and then divide by Qty.
    tableWeightedAverage = function(data,groupByArray,totalingArray){
      var initialSumData = tableSumProduct(data,groupByArray,totalingArray);
      return aggByArray(initialSumData,groupByArray,totalingArray,aggSumDivide2Values);
    };


// **************** __veryUglyTable **************************
//    this is a little table creation helper - JUST FOR THIS EXAMPLE
function __veryUglyTable(tableId,tableHeaderId,data,columnArray){
// add column headers to your table
    for(var i = 0;i<columnArray.length;i++){
      var tr = '<td>' + columnArray[i] + '</td>';
       $("#"+tableHeaderId).append(tr);
    }

// now add table data
    for(var m =0;m<data.length;m++){
      var tr = "<tr>";
      for(var i = 0;i<columnArray.length;i++){
        var currentDataItem = data[m];
        var currentColumn = columnArray[i];
        var td = '<td>' + currentDataItem[currentColumn] + '</td>';
        tr = tr+td;
      }
      tr = tr + '</tr>';
      $("#"+tableId).append(tr);
    }
}
// **************** END __veryUglyTable **************************
