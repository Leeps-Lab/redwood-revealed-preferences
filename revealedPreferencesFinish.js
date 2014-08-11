Redwood.controller("SubjectCtrl", ["$scope", "RedwoodSubject", function($scope, rs) {
  
    $scope.results = []
    $scope.totalEarnings = 5.0;

    rs.on_load(function() {

        var results = rs.subject[rs.user_id].data["results"];

        for (var i = 0; i < results.length; i++) {
            
            var result = results[i];
            var period = i + 1;
            var points = result.chosen === "x" ? result.x : result.y;

            $scope.results.push({
                period: period,
                xValue: result.x,
                yValue: result.y,
                chosen: result.chosen,
                points: points,
                earnings: 0.0,
                selected: false
            });
            rs.send("__set_points__", {period: period, points: points})
        }

        rs.send("__set_show_up_fee__", {show_up_fee: 5.0});
        rs.send("__set_conversion_rate__", {conversion_rate: 1/3});
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

        rs.send("__mark_paid__", {period: period, paid: result.points})
        rs.trigger("earnings", $scope.totalEarnings);
    });
}]);