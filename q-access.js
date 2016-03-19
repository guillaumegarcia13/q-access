// Authentication
//    http://cs.wellesley.edu/~mashups/pages/meteor6.html
//    https://developers.google.com/identity/sign-in/web/devconsole-project
   
Learners = new Mongo.Collection('learners');
History  = new Mongo.Collection('history');
   
if (Meteor.isClient) {
  var app = angular.module('q-access',['angular-meteor','accounts.ui','ngCookies']);

  app.controller('QAccessCtrl', ['$scope', '$window', '$meteor', '$reactive', '$cookies', function ($scope, $window, $meteor, $reactive, $cookies) {
    var URL_LEARNING_HUB = 'https://performancemanager.successfactors.eu/login?company=learninghub&loginMethod=PWD';
    var COOKIE_USERID    = 'userIdCookie';
    
    // Data
    $scope.cookies       = {userId: ''};
    $scope.authenticated = true;
 
    // Methods
    $scope.helpers({                                    // -> deprecated in 1.4.0
      learners: () => { return Learners.find({}); }
    }); 
    $scope.helpers({                                    // -> deprecated in 1.4.0
      history:  () => { return History.find({deletion: false}); }    // only logically valid records
    }); 
    
    //------------------- Access management ----------------------//
    $scope.addLearner = function(p_learner, p_fnc_callback) {
      Meteor.call('addLearner', p_learner, function(error, response) {
        if (error) {
          alert(error.reason);
          bool = false;
          return;
        }
        
        if (p_fnc_callback)
          p_fnc_callback();
      });
    };

    // To play with MongoDB use: forEach, count, fetch, ...      
    $scope.removeLearner = function() {
      Meteor.call('removeLearner', null, function(error, response) {
        if (error) {
          alert(error.reason);
          return;
        }
      });
    };

    $scope.launchResource = function() {
      var name = ($scope.cookies.userId) ? $scope.cookies.userId : prompt("Votre nom ?");
      
      if (!name)
        return;
        
      if (!$scope.cookies.userId) {
        $cookies.put(COOKIE_USERID, name);
        $scope.cookies.userId = name;
      }
      
      $scope.addLearner($scope.cookies.userId, function() {
        $window.open(URL_LEARNING_HUB, '_blank');
      });
    };
    
    $scope.timeAgo = function(p_date) {
      return(moment(p_date).fromNow());
    };
    
    //------------------- History ----------------------//
    $scope.showHistory = function() {
      console.table($scope.history);
    };
    $scope.clearHistory = function() {
       Meteor.call('clearHistory');
    };
    
    $scope.init = function() {
      var userCookie = $cookies.get(COOKIE_USERID);
      
      $scope.cookies.userId = (userCookie) ? userCookie : '';
    };
    
    $scope.init();
    
  }]);
  
  // Manual bootstrapping
  angular.element(document).ready(function() {
    angular.bootstrap(document, ['q-access']);
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.methods({
      clearHistory: function() {
        // History.remove({});   physical deletion
        History.update({}, {$set:{deletion: true}}, {multi: true});
      },
      
      addLearner: function(p_learner) {
        var learnersCursor = Learners.find({});
      
        if (learnersCursor.count() === 0) {  // /!\ Not bullet-proof as it depends on Collection update on each client, not on server side!!
          Learners.insert({
            id        : p_learner,
            launchedAt: new Date()}
          );
          return(true);
        }
      
        throw new Meteor.Error(403, "Un utilisateur est déjà connecté");
      },

      // Remove the current learner
      //   To play with MongoDB use: forEach(), count(), fetch(), ...      
      removeLearner: function() {
        var learnersCursor = Learners.find({});
        
        learnersCursor.forEach(function(entry) {
          History.insert({
            id        : entry.id,
            launchedAt: entry.launchedAt,
            endDate   : new Date(),
            deletion  : false
          })
          Learners.remove({_id: entry._id});
        });
      }   
    });
  })
}