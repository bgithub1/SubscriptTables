// example
//  use jsonnestedDb
//  pp = db.jsonnestedColl.find().toArray()[0];
//  cmeLevels = getLevels[pp,['FUT','CME'];
// jnest is an object as follows:
 exampleJnestObj =
	{key:'top',
       values:[
           {key:'FUT',
             values:[
                 {key:'NYMEX',
                   values:['201501','201502']
                 }
             ]
           },
           {key:'FOP',
             values:[
                 {key:'NYMEX',
                   values:[
                       {key:'201501',
                         values:['C','P'],
                       },
                       {key:'201502',
                         values:['C','P']
                       }
                   ]
                 }
             ] // end level of FOP values
           } // end second key/values pair for FOP
       ] // end of top level values
	}; // end of object

	// you traverse the above object during getLevels, proceeding inward until you 
	//   have traversed to the last desired level in levelPathArray 
	getLevels = function(jnest,levelPathArray){
	var result = jnest;
	for(var i=0;i<levelPathArray.length;i++){
		level = levelPathArray[i];
		console.log('level='+level);
		result = _.where(result.values,{'key':level});

		if(result.length>0){
			console.log('got level '+level);
			result = result[0];
		}else{
			console.log('no return for level '+level);
			return [];
		}
	}
	ret = [];
	if(result.values.length<=0){
		return [];
	}

	// check the type of the what is contained in result.values
	//  to see we are printing the key variable of a sub-object, or
	//   the actual string of the final branch
	if(typeof result.values[0] === 'object'){
		// the array result has objects that have both key and values fields
		console.log('printing objects');
		for(var j = 0;j<result.values.length;j++){
			ret.push(result.values[j].key);
		}
	}else{
		// the array result has only strings - NOT objects.
		//  You have traversed to the end of a branch in the jnest object
		console.log('printing values');
		for(var k = 0;k<result.values.length;k++){
			ret.push(result.values[k]);
		}

	}
	return(ret.sort()) ;
};

//jnestCollectionName = 'com.billybyte.meteorjava.MeteorValidator';
getLevelsExample = function(levelArray,tableName){
  var l = levelArray;
  if(!l){
    l = ['Byte'];
  }
  var t = tableName;
  if(!t){
	t = "misc.TestClass";
  }
  var jnestColl = collTable['com.billybyte.meteorjava.MeteorValidator'];
  var fetchArray = jnestColl.find().fetch();
  pp = _.where(fetchArray,{'classNameOfDataToBeValidated':t});
  if(pp && pp.length>0 && pp[0].jnest){
	jn = pp[0].jnest;
  }
  cmeLevels = getLevels(jn,l);
  return(cmeLevels);
};

