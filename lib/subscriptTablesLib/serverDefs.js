/* 
TODO:  replace newSel in getJavaListDataInJson with the version in publish
*/

//EVERYTHING DEFINED IN THIS FILE IS IN BETWEEN if(Meteor.isServer)
if(Meteor.isServer){

    adminName = 'admin1@demo.com'; // curent pass = admin1
    tableChangedbyUserCollection = "com.billybyte.meteorjava.TableChangedByUser";
    Meteor.publish(masterTableDef_id,function(){
      return MasterTableDefCollection.find();
    });


    MasterTableDefCollection.allow({
      insert: function(userId,doc){
        return userId===adminName;
      }
    });


    // in the startup function, publish all possible data collections.
    //  these are located in the TableDefs collection.
    //  Users subscribe to those data collections depending on the information
    //   that is found in the UserTableDef entry for their userId.
    Meteor.startup(function(){
        // create the meteorValidator
        javaMasterTableDefListInstance = meteorValidatorTableModel(meteorValidatorCollectionName);
        var err = addMasterTablesFromJava(javaMasterTableDefListInstance);
        console.log(err);
        console.log('filling collTable');
        var tabDefArr = MasterTableDefCollection.find().fetch();
        console.log('master table count :'+tabDefArr.length );
        for(var i = 0;i<tabDefArr.length;i++){
          var mName = tabDefArr[i]['_id'];
          publishTableDataCollection(mName);
        }
        publishTableDataCollection(tableChangedbyUserCollection);
        setApplicationName(applicationTitle);
        Meteor.publish(applicationCollection_id,function(){
          return ApplicationNameCollection.find({'_id':applicationCollection_key});
        });

    });


    /*
      setApplicationName:
        sets the single document in the collection ApplicationNameCollection
    */
    setApplicationName = function(applicationName){

        var findObj = {};
        findObj._id = applicationCollection_key;
        try{
          ApplicationNameCollection.remove(findObj);
        }catch(err){
          console.log('error updating ApplicationNameCollection: ' + err);
        }
        findObj.value = applicationName;
        ApplicationNameCollection.insert(findObj);

    };



    /* 
      getUserId:
        return :
          if valid user is logged in, return string userId;
          if no users collection record, return -1;
          if there is a users collection, but no emails array, return -2;
          if the emails array has no elements, return -3;
          if there is no address field in the first email, return null
    */
    getUserId = function(thisFromMeteorMethod){
        var user = Meteor.users.find(thisFromMeteorMethod.userId).fetch();
        // don't publish if nobody is logged in
        if(!user || user.length<1)return -1;
        if(!user[0].hasOwnProperty('emails')){
          console.log('users collection has returned object with no emails field');
          return -2;
        }
        var arr = user[0].emails;
        if(arr.length<1)return -3;

        var currUserId = user[0].emails[0].address;
        return currUserId;
    };

    /* 
    */
    isAdminUser = function(thisFromMeteorMethod){
      var userId = getUserId(thisFromMeteorMethod);
      if(isNumber(userId)) return false;
      if(userId===adminName)return true;
      return false;
    };

    // ************* IMPORTANT ********************
    //  publishTableDataCollection publishes records by selecting records from
    //   the collections with name 'mName', where the records might have a 'userId'
    //   field, or they MIGHT NOT.  When records DON'T have a userId field, they
    //   are considered 'public' and will be published to all subscribers, regardless
    //   of the subscribers userId.  If the records have a userId field, then each
    //   subcscriber will only receive records where the userId field matches his/her
    ///  Meteor.userId.
    //   The variable 'newSel' in the function below contains the '$or' clause that
    //   miniMongo will use to select records that match a Meteor.userId, or pass records
    //   with no userId field.
    publishTableDataCollection = function(mName){
      createCollection(mName);
      Meteor.publish(mName,function(mongoName,selector){
        // publish the collection based on the values in selector, and
        //  the value of the user.emails[0].address field
        //  Create an $or object that you will add to the selector that
        //  gets passed in the publish function.
        //   This $or will have 3 cases:
        //   1. for collection records with a 'userId' field, get those records
        //      whose userId value = the value in user.emails[0].address
        //   2. for collection records without a userId field, send them
        //   3.  for collection records with a userId = "" (blank), pass them too
        var user = Meteor.users.find(this.userId).fetch();
        // don't publish if nobody is logged in
        if(!user || user.length<1)return;
        if(!user[0].hasOwnProperty('emails')){
          console.log('users collection has returned object with no emails field');
          return ;
        }
        var currUserId = user[0].emails[0].address;
        var newSel = createUserIdSelector(currUserId);
        // if the user didn't subscribe with a mongoName, then do nothing
        if(mongoName){
          var c = collTable[mongoName];
          if(c){
            if(selector){
              for(var prop in selector){
                var value = selector[prop];
                for(var innerProp1 in value){
                  console.log(innerProp1+ ":"+value[innerProp1]);
                }
              }
              // create a new selector object that merges userId with the selector that
              //   was passed in the subscribe call
              for(var selProp in selector){
                newSel[selProp] = selector[selProp];
              }
            }else{
              console.log('publishing  '+mongoName+' with no selector');
            }
            console.log('publishing  '+mongoName+' : '+newSel);
            return c.find(newSel);
          }
        }

      });

      // // this publish does nothing but send the collection name, _id field and userId field to subscriber
      // Meteor.publish(mName,function(mongoName,selector){
      //   var self = this;

      //   var obsChg = {
      //     removed: function (id) {
      //       var user = Meteor.users.find(this.userId).fetch();
      //       // don't publish if nobody is logged in
      //       if(!user || user.length<1)return;
      //       if(!user[0].hasOwnProperty('emails')){
      //         console.log('users collection has returned object with no emails field');
      //         return ;
      //       }
      //       var currUserId = user[0].emails[0].address;
      //       self.changed(mongoName,id,currUserId);
      //     }
      //   };

        
      //   var handle ;
        
      //   if(mongoName){
      //     var c = collTable[mongoName];
      //     if(c){
      //       handle = c.find().observeChanges(obsChg);
      //     }
      //   }

      //   self.ready();
      //   self.onStop(function(){handle.stop();});

      // });

    };


    /* 
      create a mongo selector that:
        1. If userId is null, selects everything;
        2. Select all records with this userId, or records that:
          a. have no userId, or;
          b. records that have a blank ("") or null userId
    */
    createUserIdSelector = function(userId){
        if(!userId)return {};
        var userIdSelector = {};
        userIdSelector[userId_fid] = userId;
        var noUserIdInJsonSelector = {};
        noUserIdInJsonSelector[userId_fid] = { '$exists': false } ;
        var userIdIsNull = {};
        userIdIsNull[userId_fid] = null;
        var userIdIsBlank = {};
        userIdIsBlank[userId_fid] = "";
        var newSel = {'$or':[userIdSelector,noUserIdInJsonSelector,userIdIsNull,userIdIsBlank]};
        return newSel;
    };

    getJavaListDataInJson = function(userId,mongoName,selector){
        var newSel = createUserIdSelector(userId);
        // if the user didn't subscribe with a mongoName, then do nothing
        if(mongoName){
          var c = collTable[mongoName];
          if(!c){
            // check to see if this is a request for the MeteorTableCollection
            if(mongoName=='com.billybyte.meteorjava.MeteorTableModel'){
              c = MasterTableDefCollection;
            }
          }
          if(c){
            var recs;
            if(selector){
              for(var prop in selector){
                var value = selector[prop];
                for(var innerProp1 in value){
                  console.log(innerProp1+ ":"+value[innerProp1]);
                  // create a new selector object that merges userId with the selector that
                  //   was passed in the subscribe call
                  newSel[innerProp1] = value[innerProp1];
                }
                console.log('publishing  java version of  '+mongoName+' : '+prop+':'+selector[prop]);
              }
              //  WAIT UNTIL AFTER JULY 10, 2015 TO REMOVE THESE LINES
              //    OR UNTIL YOU THINK THEY ARE SUFFICIENTLY TESTED
              // // create a new selector object that merges userId with the selector that
              // //   was passed in the subscribe call
              // for(var selProp in selector){
              //   newSel[selProp] = selector[selProp];
              // }
              recs =  c.find(newSel).fetch();
            }else{
              console.log('publishing java version of  '+mongoName+' with no selector');
              recs =  c.find(newSel).fetch();
            }
            var retObj = {};
            retObj['className'] = mongoName;
            retObj.list=recs;
            return retObj;
          }
        }
    };

    validateAdminUserId = function(userId){

      return userId===adminName;
    };

// the following Meteor methods can be called from javascript or 
//  java (using the meteor-java-collections java jar)
    Meteor.methods({
      // add masterTable records from a list of them
      addMasterTablesFromJava: function(jsonListData){
        try{
            if(!isAdminUser(this)){
              throw('addMasterTableFromJava: userId is not adminId');
            }
            var userid= getUserId(this);
            return addMasterTablesFromJava(jsonListData);
        }
        catch(err){
            console.log('insert to MasterTable failed for collection '+' : err = '+err);
            return [err];
        }
      },
      getAllMasterTables: function(){
        try{
            if(!isAdminUser(this)){
              throw('getAllMasterTables: userId is not adminId');
            }
            var ret = {};
            retObj['className'] =  'com.billybyte.meteorjava.MeteorTableModel';
            ret.list =  MasterTableDefCollection.find().fetch();
            return ret;
        }catch(err){
            console.log('getAllMasterTables:   : err = '+err);
            return [err];
        }
      },
      removeMasterTable: function(tableName){
        try{
            if(!isAdminUser(this)){
              throw('removeMasterTable: userId is not adminId');
            }
            if(!tableName){
              throw('removeMasterTable: null tableName');
            }
            removeMasterTable(tableName);
            return 0;
        }
        catch(err){
            console.log('remove of table:  '+tableName+' : err = '+err);
            return err;
        }
      },
      removeAllMasterTables: function(){
        try{
            if(!isAdminUser(this)){
              throw('removeMasterTable: userId is not adminId');
            }
            removeAllMasterTables();
            return 0;
        }
        catch(err){
            console.log('remove of  all tablea: err = '+err);
            return err;
        }
      },
      updateMasterTable: function(masterTableDef){
        try{
             if(!isAdminUser(this)){
             throw('updateMasterTable: userId is not adminId');
            }
            var userid = getUserId(this);
            if(!masterTableDef){
              throw('updateMasterTable: null masterTableDef');
            }
            writeMasterTable(masterTableDef);
            return 0;
        }
        catch(err){
            console.log('insert to MasterTable failed for collection '+' : err = '+err);
            return err;
        }
      },
      addJavaListData : function(jsonJavaList){
        try{
            if(!isAdminUser(this)){
            throw('addJavaListData: userId is not adminId');
          }
         // var userid = getUserId(this);
          writeTableData(jsonJavaList);
          return [];
        }catch(err){
            console.log('insert failed for collection '+' : err = '+err);
            return [err];
        }
      },
      removeJavaListItems : function(collectionName,listOfIds){
        try{
            if(!isAdminUser(this)){
            throw('removeJavaListItems: userId is not adminId');
          }
          //var userid = getUserId(this);
          if(!collectionName){
            throw('removeJavaListItems: collectionName is null');
          }
          var collection = collTable[collectionName];
          if(!collection){
            throw('removeJavaListItems: no collection for collectionName: '+collectionName);
          }
          if(!listOfIds){
            throw('removeJavaListItems: listOfIds is null');
          }
          if(listOfIds.length<1){
            throw('removeJavaListItems: listOfIds is empty');
          }
          var ret = [];
          for(var i = 0;i<listOfIds.length;i++){
            try{
              var removeObj = {};
              removeObj[mongoId_fid] = listOfIds[i];
              // var cursor = collection.find(removeObj);
              // if(!cursor){
              //   continue;
              // }
              // var recs = cursor.fetch();
              // if(!recs || recs.length<1){
              //   continue;
              // }
              // var userIdOfRecToDelete = recs[0].userId;
              // removeObj.userId = userIdOfRecToDelete;
              collection.remove(removeObj);
            }catch(errInner){
              console.log(errInner);
              ret.push(errInner);
            }
          }
          return ret;
        }catch(err){
            console.log(err);
            return [err];
        }
      },
      removeAllJavaListItems : function(collectionName){
        try{
            if(!isAdminUser(this)){
            throw('removeJavaListItems: userId is not adminId');
          }
          //var userid = getUserId(this);
          if(!collectionName){
            throw('removeJavaListItems: collectionName is null');
          }
          var collection = collTable[collectionName];
          if(!collection){
            throw('removeJavaListItems: no collection for collectionName: '+collectionName);
          }
          var ret = [];
          var removeObj = {};
          collection.remove(removeObj);
          return ret;
        }catch(err){
            console.log(err);
            return [err];
        }
      },

      dropJavaCollection : function(collectionName){
        try{
            if(!isAdminUser(this)){
            throw('dropJavaCollection: userId is not adminId');
          }
          dropJavaCollection(collectionName);
        }catch(err){
            console.log(err);
            return [err];
        }
      },

      getJavaListData : function(collectionName,selector){
        try{
          var userid = getUserId(this);
          if(!userid){
              var retObj = {};
              retObj['className'] = null;
              retObj.list=[];
              return retObj;
          }
          // if it's the admin, get all of the records
          if(isAdminUser(this)){
            userid = null;
          }
          return getJavaListDataInJson(userid,collectionName,selector);
        }catch(err){
          var retObj = {};
          retObj['className'] = null;
          retObj.list=[];
          retObj['error']=err;
          return retObj;
        }
      },
      resetAllData : function(){
        try{
            if(!isAdminUser(this)){
            throw('removeJavaListItems: userId is not adminId');
          }
            removeAllMasterTables();
            var userid = getUserId(this);
            var tempCollTable = collTable;
            for(var colName in tempCollTable){

              dropJavaCollection(colName);
              collTable = _.without(collTable,colName); // remove it from the collTable
            }
        }catch(err){
            console.log(err);
            return [err];
        }
      },
      meteorClientInsert : function(jsonJavaList){
        try{
          var userId = getUserId(this);
          // Validate that all records have userId's that are the same as userId.
          // Create anonymous validate function for use in Object.every(validateFunction).
          var valFunc = function(rec){
            var ret=true;
            if(!rec || !rec.userId || rec.userId!==userId)ret=false;
            return ret;
          };
          // END validate function for Object.every().
          // Get list of objects, and validate them.
          var l = jsonJavaList.list;
          var isValid = l.every(valFunc);
          if(!isValid){
            var thisErr = " not all records have userID's that match current userId";
            throw("meteorClientInsert error: " + thisErr);
          }
         // var userid = getUserId(this);
          writeTableData(jsonJavaList);
          var className = jsonJavaList['className'];
          var id = userId+"_"+className;
          var action = "insert";
          var obj = {'_id':id};
          collTable[tableChangedbyUserCollection].remove(obj);
          obj.action = action;
          collTable[tableChangedbyUserCollection].insert(obj);
          return [];

        }catch(err){
          var errMsg = "meteorClientInsert error: " + err;
          console.log(errMsg);
          throw (errMsg);
        }

      },
      meteorClientDelete : function(collectionName,jsonJavaList){
        try{
          if(!collectionName){
            throw('meteorClientDelete: collectionName is null');
          }
          var collection = collTable[collectionName];
          if(!collection){
            throw('meteorClientDelete: no collection for collectionName: '+collectionName);
          }

          if(!jsonJavaList || !jsonJavaList.list || jsonJavaList.list.length<1){
            throw('meteorClientDelete: Invalid jsonJavaList');
          }

          var userId = getUserId(this);
          // Validate that all records have userId's that are the same as userId.
          // Create anonymous validate function for use in Object.every(validateFunction).
          var valFunc = function(rec){
            var ret=true;
            if(!rec || !rec.userId || rec.userId!==userId || !rec._id)ret=false;
            return ret;
          };
          // END validate function for Object.every().
          // Get list of objects, and validate them.
          var l = jsonJavaList.list;
          var isValid = l.every(valFunc);
          if(!isValid){
            var thisErr = " not all records have userID's that match current userId";
            throw("meteorClientDelete error: " + thisErr);
          }

          // If you get here, you can attempt to delete all of the records
          var listOfIds = [];
          _.each(l,function(rec){listOfIds.push(rec._id);});

          var ret = [];
          for(var i = 0;i<listOfIds.length;i++){
            try{
              var removeObj = {};
              removeObj[mongoId_fid] = listOfIds[i];
              collection.remove(removeObj);
            }catch(errInner){
              console.log(errInner);
              ret.push(errInner);
            }
          }
          var id = userId+"_"+collectionName;
          var action = "remove";
          var obj = {'_id':id};
          collTable[tableChangedbyUserCollection].remove(obj);
          obj.action = action;
          collTable[tableChangedbyUserCollection].insert(obj);
          return ret;
        }catch(err){
            console.log(err);
            return [err];
        }

      },
      meteorClientPublishChanged : function(collectionName){
        try{
          var userId = getUserId(this);
          var id = userId+"_"+collectionName;
          var action = "changed";
          var obj = {'_id':id};
          collTable[tableChangedbyUserCollection].remove(obj);
          obj.action = action;
          collTable[tableChangedbyUserCollection].insert(obj);
          return [];

        }catch(err){
            console.log(err);
            return [err];
        }
      },
      getApplicationName : function(){
        var name =  getApplicationName();
        return name;
      },
      setApplicationName : function(applicationName){
        setApplicationName(applicationName);
      },
    });


// END of METEOR METHODS

// ******************************************************************************

    addMasterTablesFromJava = function(jsonListData){
      if(!jsonListData){
        throw('addMasterTableFromJava: null jsonListData');
      }

      var tl = tableListFromJavaListObject(jsonListData);
      if(!tl){
        throw('addMasterTableFromJava: can not build list of MasterTables from jsonJavaList arg');
      }
      var mtArr = tl.listOfObjects;
      var ret=[];
      for(var i = 0;i<mtArr.length;i++){
        var masterTableDef = mtArr[i];
        try{
          writeMasterTable(masterTableDef);
        }catch(errLoop){
          ret[i]='insert to addMasterTableFromJava failed table '+ masterTableDef[mongoId_fid]+' : err = '+errLoop;
          console.log(ret[i]);
        }
      }
      return ret;
    };

    removeMasterTable = function(tableName){
      var remObj = {};
      remObj[mongoId_fid]=tableName;
      var count = MasterTableDefCollection.find(remObj).count();
      if(count<1){
        throw('removeMasterTable: table with name: '+tableName+' does not exist');
      }
      MasterTableDefCollection.remove(remObj);
    };

    removeAllMasterTables = function(){
        try{
            var count = MasterTableDefCollection.find().count();
            if(count<1){
              throw('removeMasterTable: table with name: '+tableName+' does not exist');
            }
            var remObj = {};
            MasterTableDefCollection.remove(remObj);
        }catch(err){
            console.log(err);
            return [err];
        }
    };

    writeMasterTable = function(masterTableDef){
            var tn = masterTableDef[mongoId_fid] ;
            if(!tn){
              throw('addMasterTable: no tableName property in masterTableDef');
            }
            var count = MasterTableDefCollection.find({'_id':tn}).count();
            if(count>0){
              // delete old
              console.log('MUST REMOVE old MasterTable BEFORE CREATING A NEW ONE '+mt);
              throw('MUST REMOVE old MasterTable BEFORE CREATING A NEW ONE '+mt);
            }

            var tccArr = masterTableDef.tableColumnClassArr;
            if(!tccArr){
              throw('addMasterTable: no tableColumnClassArr property in masterTableDef');
            }
            // if(tccArr.length <=0){
            //   throw('addMasterTable: tableColumnClassArr property in masterTableDef has no elements');
            // }
            var displayTableName = masterTableDef.displayTableName;
            var collectionName = masterTableDef.collectionName;
            var javascriptValidationFunc = masterTableDef.javascriptValidationFunc;
            var mt = new masterTableClass(tn,displayTableName,collectionName,tccArr,javascriptValidationFunc);
            MasterTableDefCollection.insert(mt);
            console.log('insert success for collection '+tn);

            // see if a collections has been initialized for this table
            var collection = collTable[collectionName];
            if(!collection){
              // make one
              publishTableDataCollection(collectionName);
            }
            return 0;

  };

    // there should be a mongo collections associated with this data,
    //  if not build one
    writeTableData = function(jsonJavaList){
        // get the tableList that from this jsonJavaList
        var tl = tableListFromJavaListObject(jsonJavaList);
        if(!tl){
          throw('writeTableData: can not build tableList from jsonJavaList arg');
        }
        // check for 2 conditions.  First that there is a master table
        //  Second, that there is collection for this data
        var mn = tl.tableName;
        if(!mn){
          throw('writeTableData: tableList does not have a valid masterTableName ');
        }
        var collection = collTable[mn];
        var mtSearchObj = {};
        mtSearchObj[mongoId_fid] = mn;
        var isThere = MasterTableDefCollection.find(mtSearchObj).fetch();
        if(!collection || !isThere || isThere.length<=0){
          throw('writeTableData: there is not a masterTableClass for the table named: '+mn);
        }
        // now, get the collection again, and write the data
        collection = collTable[mn];
        var jsonArray = tl.listOfObjects;
        for(var i = 0;i<jsonArray.length;i++){
          var rec = jsonArray[i];
          // does this have an id field
          var id = rec[mongoId_fid];
          if(id){
            // see if it's already in db
            mtSearchObj[mongoId_fid] = id;
            var result = collection.find(mtSearchObj).fetch();
            if(result.length>0){
              // delete it first
              collection.remove(mtSearchObj);
            }
          }
          // now write the record
          collection.insert(rec);
          console.log('inserted record: '+rec+' into collection: '+mn);
        }

    };

    dropJavaCollection = function(collectionName){
          if(!collectionName){
            throw('dropJavaCollection: collectionName is null');
          }
          var collection = collTable[collectionName];
          if(!collection){
            throw('dropJavaCollection: no collection for collectionName: '+collectionName);
          }
          // drop the collection from the Mini mongo db
          collection.remove();
          collection.drop();

    };


    // reacte to new user
    Accounts.onCreateUser(function(options, user) {
      console.log('new user: '+user);
      return user;
      
    });


}