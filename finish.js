Redwood.controller("RPFinishController", ["$scope", "RedwoodSubject", function($scope, rs) {
  
    $scope.results = []
    $scope.totalEarnings = 5.0;
    $scope.selected_period = false;

    var recomputeEarnings = function() {
        // recompute total earnings
        $scope.totalEarnings = $scope.results.reduce(function(prev, next) {
            next.earnings = next.selected ? next.points/3 : 0;
            return prev + next.earnings;
        }, 5.0);

        rs.trigger("earnings", $scope.totalEarnings);
    };

    rs.on_load(function() {

        var results = rs.subject[rs.user_id].data["results"];

        for (var i = 0; i < results.length; i++) {
            
            var result = results[i];
            var period = i + 1;

            $scope.results.push({
                period: period,
                xValue: result.x,
                yValue: result.y,
                chosen: "",
                points: 0,
                earnings: 0.0,
                selected: false
            });
            rs.send("__set_points__", {period: period, points: 0});
        }

        rs.send("__set_show_up_fee__", {show_up_fee: 5.0});
        rs.send("__set_conversion_rate__", {conversion_rate: 1/3});
        rs.trigger("earnings", $scope.totalEarnings);
    });

    rs.on("payout_select_period", function(period) {
        var result = $scope.results[period-1];
        result.selected = !result.selected;

        $scope.selected_period = period;

        rs.send("__mark_paid__", {period: period, paid: result.points})
        rs.trigger("earnings", $scope.totalEarnings);

        recomputeEarnings();
    });

    rs.on("selected_x_or_y", function(xOrY) {
        var result = $scope.results[$scope.selected_period-1];
        result.chosen = xOrY;
        result.points = xOrY === "x" ? result.xValue : result.yValue;
        rs.send("__set_points__", {period: $scope.selected_period, points: result.points});

        recomputeEarnings();
    });
}]);