Getting Started:

````
# in a terminal session
mkdir mydir  # create a directory to put everything in (i called it "mydir")
cd mydir  
git clone https://github.com/bgithub1/SubscriptTables.git
git clone https://github.com/bgithub1/javaListsInMeteor.git

cd SubscriptTables  #navigate to meteor project folder
meteor  # start up meteor

#hit cntrl-t to start another terminal session
# in another terminal session
cd ../  # cd back up to mydir
cd javaListsInMeteor/java-lists-in-meteor
sh runAll.sh  # run a bunch of examples

# look at the rest of both repos to see code examples
````

  GENERAL DESCRIPTION:
  SubscriptTables is a full Meteor project that shows the use of a library of 
  javascript files called subscriptTablesLib.  SubscriptTables, and it's java companion github repo javaListsInMeteor (https://github.com/bgithub1/javaListsInMeteor), together allow you to send and Receive java.util.lists.  As well, you can subscribe to changes on those lists that take place on the Meteor server.  

  You should put subscriptTablesLib in the lib folder of your Meteor project.

  You will then get html tables using Meteor templates that:
  - sort on click
  - filter on click
  - hide/show columns on click
  - perform totalling (simple and weighted-average) automatically as you sort filter and hide/show.


      USING THE PROJECT WITH JAVA:
  If you use the companion Java project/jar java-lists-in-meteor, you can upload/download and subscribe to java.util.List<T> items, as well as upload/download new TableModels and ColumnModels that
  define which member variables of class T get shown, and how those columns get totalled.

  java-lists-in-meteor makes it easy to control what data the user sees and how they see it from java.  It also is a nice MVC-like GUI for your java.util.List<T> instances.  

  Important:  Currently, java-lists-in-meteor supports rather "flat" generic objects.  However, it is very common for developers to create "adaptor" classes in java to display data in GUI packages like Swing.  

  Future versions will allow you to specify more complicate json accessors so that you can your java classes can be more hierarchical.

      HOW ARE RECORDS STORED?
  All TableModels are stored in the Meteor mongo collection db.masterTableDefs, which both the client and the server can access.
  Data to populate these tables is stored in Meteor mongo collections whose name coincides with the full java class name of the json-serialized java objects that you send to Meteor via Meteor method calls.

  See the Meteor.methods section of serverDefs.js for all of the Meteor methods that you can call from either javacript or java (using java-lists-in-meteor.jar);

      ANY DDP CLIENT CALLING THESE METEOR METHODS MUST BE LOGGED IN TO METEOR:
  IMPORTANT !!!! THE JAVASCRIPT CODE IN subscriptTablesLib (and the java ddp client in java-lists-in-meteor) assumes that users have logged in to Meteor and that Meteor.userId is not null.  See the Meteor.methods section of serverDefs.js to see how the userId gets used in each Meteor method call.

      TO UPDATE OR ADD RECORDS, YOU MUST LOG IN AS THE ADMIN USER (WHATEVER YOU HAVE MADE IT):
  Generally, Meteor methods that add, remove or update masterTableDefs (MeteorTableModels in java)  or any data collection must
  be called while the admin user is logged in as a client.
  
      TO READ OR SUBSCRIBE TO DATA, YOU LOG IN AS ANY USER:
  The data that gets returned will be records that have field named 'userId' whose value is equal to the email address of the currently logged in user that is making the Meteor method
  call, or, all records that either don't have a 'userId' field, or wholse 'userId' field = "".

  Example users that are in example project
  user1@demo.com  pass=user1pass
  user2@demo.com  pass=user2pass



`````javascript

// sometimes an example tells a million words:

/* 
  The following shows example client-side javascript code that shows 
    example usage.  
    !!! YOU MUST BE LOGGED IN AS THE admin. (For the test system, it's admin1@demo.com, password admin1)

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
 
    // columns c1, c2 and c3 will be 'groupBy' columns.  Therefore, they don't have totalling
    //   arrays as the 4th argument to the constructor tableColumnClass
    var c1 = new tableColumnClass('myFirstName','My First Name','myFirstName');
    var c2 = new tableColumnClass('myLastName','My Last Name','myLastName');
    var c3 = new tableColumnClass('shortName','shortName','shortName');

 
    // columns c4 and c5 are totalling columns.  
    // Each call to their constructor (tableColumnClass) has a 4th argument.
    // For c4, the 4th argument is a 2 element array of columns.
    //   These columns make up the weighted average price.
    //   The second second element will be summed up and used as the demnominator so
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
    var adminUserName = getLoggedOnUserEmail(); // email address of admin
    var tableId = tableListFromJavaWithMasterTableDef['className'];

    //  call meteor to remove the old instance.
    Meteor.call('removeMasterTable',adminUserName,tableId);

    // call meteor to add the new table.  !!! THE 3RD PARAM IS AN ARRAY B/C
    //   YOU CAN SEND MULTIPLE TABLE DEFINITIONS IN ONE CALL !!!!
    // we are going to add only 1 masterTableDef
    Meteor.call('addMasterTableFromJava',adminUserName,tableListFromJavaWithMasterTableDef);

  };

  step3_exampleTableListCreation = function(){
    // create a list of data
    tradeList = [{"shortName":"IBM","myPrice":200,"myQty":10,"myFirstName":"Billy","myLastName":"Byte"},
          {"shortName":"AAPL","myPrice":500,"myQty":5,"myFirstName":"Pete","myLastName":"Kutrum"},
          {"shortName":"MSFT","myPrice":40,"myQty":45,"myFirstName":"Mike","myLastName":"Byte"}];
    var javeLikeClassNameAsTableId = 'misc.Trades';
    var tblList = new tableListFromJava(javeLikeClassNameAsTableId,tradeList);

    return tblList;
  };

  step4_exampleWriteOfTableListDataToMeteor = function(tblList){
    // assume that you are logged as admin
    var adminUserName = getLoggedOnUserEmail(); // email address of admin
    Meteor.call('addJavaListData',adminUserName,tblList);

  };



}

/*   GENERAL DESCRIPTION:
  subscriptTablesLib is a folder that you can add to the lib folder of your Meteor project, to get html tables using Meteor templates that:
  - sort on click
  - filter on click
  - hide/show columns on click
  - perform totalling (simple and weighted-average) automatically as you sort filter and hide/show.


      USING THE PROJECT WITH JAVA:
  If you use the companion Java project/jar java-lists-in-meteor, you can upload/download and subscribe to java.util.List<T> items, as well as upload/download new TableModels and ColumnModels that
  define which member variables of class T get shown, and how those columns get totalled.

  java-lists-in-meteor makes it easy to control what data the user sees and how they see it from java.  It also is a nice MVC-like GUI for your java.util.List<T> instances.  

  Important:  Currently, java-lists-in-meteor supports rather "flat" generic objects.  However, it is very common for developers to create "adaptor" classes in java to display data in GUI packages like Swing.  

  Future versions will allow you to specify more complicate json accessors so that you can your java classes can be more hierarchical.

      HOW ARE RECORDS STORED?
  All TableModels are stored in the Meteor mongo collection db.masterTableDefs, which both the client and the server can access.
  Data to populate these tables is stored in Meteor mongo collections whose name coincides with the full java class name of the json-serialized java objects that you send to Meteor via Meteor method calls.

  See the Meteor.methods section of serverDefs.js for all of the Meteor methods that you can call from either javacript or java (using java-lists-in-meteor.jar);

      ANY DDP CLIENT CALLING THESE METEOR METHODS MUST BE LOGGED IN TO METEOR:
  IMPORTANT !!!! THE JAVASCRIPT CODE IN subscriptTablesLib (and the java ddp client in java-lists-in-meteor) assumes that users have logged in to Meteor and that Meteor.userId is not null.  See the Meteor.methods section of serverDefs.js to see how the userId gets used in each Meteor method call.

      TO UPDATE OR ADD RECORDS, YOU MUST LOG IN AS THE ADMIN USER (WHATEVER YOU HAVE MADE IT):
  Generally, Meteor methods that add, remove or update masterTableDefs (MeteorTableModels in java)  or any data collection must
  be called while the admin user is logged in as a client.
  
      TO READ OR SUBSCRIBE TO DATA, YOU LOG IN AS ANY USER:
  The data that gets returned will be records that have field named 'userId' whose value is equal to the email address of the currently logged in user that is making the Meteor method
  call, or, all records that either don't have a 'userId' field, or wholse 'userId' field = "".

  Example users that are in example project
  user1@demo.com  pass=user1pass
  user2@demo.com  pass=user2pass

*/
`````
