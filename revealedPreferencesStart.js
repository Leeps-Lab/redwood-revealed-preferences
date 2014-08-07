Redwood.controller("SubjectController", ["$scope", "RedwoodSubject", "SynchronizedStopWatch", function($scope, rs, stopWatch) {
    rs.on_load(function() {

        function extractConfigEntry(entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }

        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = {
            Ex                : extractConfigEntry(rs.config.Ex, userIndex),
            Ey                : extractConfigEntry(rs.config.Ey, userIndex),
            Px                : extractConfigEntry(rs.config.Px, userIndex),
            Py                : extractConfigEntry(rs.config.Py, userIndex),
            Z                 : extractConfigEntry(rs.config.Z, userIndex),
            XLimit            : extractConfigEntry(rs.config.XLimit, userIndex),
            YLimit            : extractConfigEntry(rs.config.YLimit, userIndex),
            XGrid             : extractConfigEntry(rs.config.XGrid, userIndex),
            YGrid             : extractConfigEntry(rs.config.YGrid, userIndex),
            ProbX             : extractConfigEntry(rs.config.ProbX, userIndex),
            plotResult        : extractConfigEntry(rs.config.plotResult, userIndex),
            rounds            : rs.config.rounds || 1,
            x_over_y_threshold: rs.config.x_over_y_threshold,
            referencePeriod   : rs.config.referencePeriod,
            delay             : parseFloat(rs.config.delay) || 5,
            timeLimit         : parseFloat(rs.config.timeLimit) || 75,
            pause             : rs.config.pause,
        };

        $scope.endowment = {}
        if($scope.config.referencePeriod) {
            var referenceResult = rs.self.data.results.filter(function(result) {
                return result.period === $scope.config.referencePeriod;
            })[0];
            $scope.endowment.x = referenceResult.x;
            $scope.endowment.y = referenceResult.y;
        } else {
            $scope.endowment.x = $scope.config.Ex;
            $scope.endowment.y = $scope.config.Ey;
        }

        $scope.currentRound = 0;
        $scope.inputEnabled = false

        rs.trigger("next_round");
    });

    rs.on("next_round", function() {
        if ($scope.currentRound >= $scope.config.rounds) {
            rs.trigger("next_period");
            return;
        }

        // Begin next round
        $scope.currentRound++;
        $scope.cursor = undefined;
        rs.trigger("selection", [$scope.endowment.x, $scope.endowment.y])

        var prices = rs.self.get("prices");
        $scope.prices = {}
        $scope.prices.x = $scope.currentRound > 1 ? prices.x : $scope.config.Px;
        $scope.prices.y = $scope.currentRound > 1 ? prices.y : $scope.config.Py;

        $scope.budget = ($scope.endowment.x * $scope.prices.x) + ($scope.endowment.y * $scope.prices.y);

        $scope.intercepts = {};
        $scope.intercepts.x = $scope.budget / $scope.prices.x;
        $scope.intercepts.y = $scope.budget / $scope.prices.y;

        $scope.limits = {}
        $scope.limits.x = $scope.config.XLimit ? $scope.config.XLimit : $scope.intercepts.x;
        $scope.limits.y = $scope.config.YLimit ? $scope.config.YLimit : $scope.intercepts.y;

        $scope.budgetFunction = function(x) {
            return ($scope.budget - x * $scope.prices.x) / $scope.prices.y;
        }
        $scope.inverseBudgetFunction = function(y) {
            return ($scope.budget - y * $scope.prices.y) / $scope.prices.x;
        }

        rs.trigger("round_started");
        $scope.inputEnabled = true;

        // set timeout to automatically confirm after 75 seconds
        $scope.timeRemaining = 0;
        $scope.stopWatch = stopWatch.instance()
            .frequency(1)
            .duration($scope.config.timeLimit)
            .onTick(function(tick, t) {
                $scope.timeRemaining = $scope.timeTotal - t;
            })
            .onComplete(function() {
                $scope.confirm();
            }).start();

        $scope.timeTotal = $scope.stopWatch.getDurationInTicks();
    });

    rs.on("next_period", function() {
        var finalResult = $scope.results[$scope.results.length - 1];
        finalResult.period = rs.period;
        rs.set("results", finalResult);
        if($scope.config.plotResult) {
            $scope.finalResult = finalResult;
            rs.next_period($scope.config.delay);
        } else {
            rs.next_period();
        }
    });

    rs.on("selection", function(selection) {
        $scope.selection = selection;
    })

    rs.on("confirm", function(position) {
        $scope.inputEnabled = false; // for recovery
    });

    // recieve round result from the admin
    rs.on("result", function(value) {
        $scope.results = $scope.results || [];
        $scope.results.push(value);

        rs.synchronizationBarrier('round_' + $scope.currentRound).then(function() {
            var excessDemandX = 0;
            var excessDemandY = 0;
            rs.subjects.filter(function(subject) {
                return subject.groupForPeriod && subject.groupForPeriod === rs.self.groupForPeriod;
            }).forEach(function(subject) {
                var selection = subject.get("selection");
                excessDemandX += selection[0] - $scope.endowment.x;
                excessDemandY += selection[1] - $scope.endowment.y;
            });

            // only x needs to be done
            var newPriceX = priceAdjustmentFunction($scope.prices.x, excessDemandX, $scope.config.Z);
            var newPriceY = priceAdjustmentFunction($scope.prices.y, excessDemandY, $scope.config.Z);
            rs.set("prices", {
                x: newPriceX,
                y: newPriceY,
                deltaX: newPriceX - $scope.prices.x,
                deltaY: newPriceY - $scope.prices.y
            });
            rs.trigger("next_round");
        });
    });

    $scope.$on("rpPlot.click", function(event, selection) {
        rs.trigger("selection", selection);
    });

    $scope.confirm = function() {
        $scope.inputEnabled = false;
        rs.trigger("confirm", { x: $scope.selection[0], y: $scope.selection[1] });
    };

    function priceAdjustmentFunction(price, excessDemand, adjustmentRate) {
        return price + excessDemand * adjustmentRate;
    };
}]);

