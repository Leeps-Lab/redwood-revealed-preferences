RedwoodRevealedPreferences.controller("RPFinishController", ["$scope", "RedwoodSubject", function($scope, rs) {

    $scope.results = []
    $scope.selected_period = false;

    $scope.payoutFunction = function(entry) {
        if (entry.selected && entry.chosen != "") {
            if (entry.chosen === "x") {
                return entry.X / 3;
            } else {
                return entry.Y / 3;
            }
        } else {
            return 0;
        }
    }

    rs.on_load(function() {
        var results = rs.subject[rs.user_id].data["rp.results"];

        if (!results) {
            return;
        }

        for (var i = 0; i < results.length; i++) {

            var result = results[i];
            var period = result.period;

            $scope.results.push({
                period: period,
                X: result.x,
                Y: result.y,
                chosen: "",
                chosenLabel: "",
                selected: false
            });
            rs.send("__set_points__", {period: period, points: 0});
        }

        rs.send("__set_show_up_fee__", {show_up_fee: 7.0});
        rs.send("__set_conversion_rate__", {conversion_rate: 1/3});

        // hack to set X and Y label names
        // use labels from the final period
        $scope.labelX = rs.configs[rs.configs.length - 1].labelX || "X";
        $scope.labelY = rs.configs[rs.configs.length - 1].labelY || "Y";
    });

    rs.on("payout_select_period", function(period) {
        var result = $scope.results.filter(function(result) {
            return result.period === period;
        })[0];

        if (result) {
            result.selected = !result.selected;

            $scope.selected_period = period;

            rs.send("__mark_paid__", {
                period: period,
                paid: $scope.payoutFunction(result)
            })
        }
    });

    rs.on("rp.selected_x_or_y", function(xOrY) {
        var result = $scope.results.filter(function(result) {
            return result.period === $scope.selected_period;
        })[0];

        if (result) {
            result.chosen = xOrY;
            result.chosenLabel = xOrY === "x" ? $scope.labelX : $scope.labelY;
            rs.send("__set_points__", {
                period: $scope.selected_period,
                points: xOrY === "x" ? result.X : result.Y
            });
        }
    });
}]);
