Redwood.controller("SubjectCtrl", ["$scope", "RedwoodSubject", function($scope, rs) {
  
    $scope.results = []
    $scope.totalEarnings = 5.0;

    rs.on_load(function() {

        var results = rs.subject[rs.user_id].data["results"];

        for (var i = 0; i < results.length; i++) {
            
            var result = results[i];

            $scope.results.push({
                period: i+1,
                xValue: result.x,
                yValue: result.y,
                chosen: result.chosen,
                points: result.chosen === "x" ? result.x : result.y,
                earnings: 0.0,
                selected: false
            });
        }

        rs.trigger("earnings", $scope.totalEarnings);
    });
    
    rs.on("selected_period", function(period) {
        var result = $scope.results[period-1];
        result.selected = !result.selected;
        result.earnings = result.selected ? result.points/3 : 0;

        // recompute total earnings
        $scope.totalEarnings = $scope.results.reduce(function(prev, next) {
            return prev + next.earnings;
        }, 5.0);

        //$scope.totalEarnings += result.earnings;
        rs.trigger("earnings", $scope.totalEarnings);
    });
}]);