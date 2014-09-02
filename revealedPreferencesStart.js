Redwood.controller("SubjectController", ["$scope", "RedwoodSubject", "SynchronizedStopWatch", function($scope, rs, stopWatch) {
    rs.on_load(function() {

        function extractConfigEntry(entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }

        var simplePriceAdjustment = "price + excessDemand * 0.1";

        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = {
            Ex                : extractConfigEntry(rs.config.Ex, userIndex),
            Ey                : extractConfigEntry(rs.config.Ey, userIndex),
            Px                : extractConfigEntry(rs.config.Px, userIndex),
            Py                : extractConfigEntry(rs.config.Py, userIndex),
            XLimit            : extractConfigEntry(rs.config.XLimit, userIndex),
            YLimit            : extractConfigEntry(rs.config.YLimit, userIndex),
            ProbX             : extractConfigEntry(rs.config.ProbX, userIndex),
            plotResult        : extractConfigEntry(rs.config.plotResult, userIndex),
            rounds            : rs.config.rounds || 1,
            priceThreshold    : rs.config.x_over_y_threshold,
            delay             : parseFloat(rs.config.delay) || 5,
            timeLimit         : parseFloat(rs.config.timeLimit) || 75,
            pause             : rs.config.pause,
            pauseAtEnd        : rs.config.pauseAtEnd == "TRUE" || false,
            adjustPrice       : rs.config.adjustPrice || simplePriceAdjustment
        };
        $scope.adjustPrice = new Function("price", "excessDemand", "return " + $scope.config.adjustPrice);

        $scope.endowment = {
            x: $scope.config.Ex,
            y: $scope.config.Ey
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

        // set initial price
        var prices = rs.self.get("prices");
        $scope.prices = {}
        $scope.prices.x = $scope.currentRound > 1 ? prices.x : $scope.config.Px;
        $scope.prices.y = $scope.currentRound > 1 ? prices.y : $scope.config.Py;

        // find axis intersections
        $scope.budget = ($scope.endowment.x * $scope.prices.x) + ($scope.endowment.y * $scope.prices.y);

        $scope.intercepts = {};
        $scope.intercepts.x = $scope.budget / $scope.prices.x;
        $scope.intercepts.y = $scope.budget / $scope.prices.y;

        // set plot limits
        $scope.limits = {}
        $scope.limits.x = $scope.config.XLimit ? $scope.config.XLimit : $scope.intercepts.x;
        $scope.limits.y = $scope.config.YLimit ? $scope.config.YLimit : $scope.intercepts.y;

        // set budget functions
        $scope.budgetFunction = function(x) {
            return ($scope.budget - x * $scope.prices.x) / $scope.prices.y;
        }
        $scope.inverseBudgetFunction = function(y) {
            return ($scope.budget - y * $scope.prices.y) / $scope.prices.x;
        }

        rs.trigger("round_started", {endowment: $scope.endowment, price: $scope.prices.y / $scope.prices.x});
        $scope.inputEnabled = true;

        // set timeout to automatically confirm after 75 seconds
        // needs a way to stop timer between rounds
        $scope.timerAdjustment = 0;
        if (!$scope.stopWatch) {
            $scope.timeRemaining = 0;
            // The round which this timer was started
            $scope.timerRound = $scope.currentRound;
            $scope.stopWatch = stopWatch.instance()
                .frequency(1)
                .duration($scope.config.timeLimit)
                .onTick(function(tick, t) {
                    $scope.timeRemaining = $scope.timeTotal - t;
                })
                .onComplete(function() {
                    $scope.confirm();
                    $scope.stopWatch = null;
                }).start();
        } else {
            $scope.stopWatch.duration($scope.stopWatch.getDurationInTicks() + $scope.config.timeLimit - $scope.timeRemaining)
        }

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
            var excessDemand = 0;
            rs.subjects.filter(function(subject) {
                return subject.groupForPeriod && subject.groupForPeriod === rs.self.groupForPeriod;
            }).forEach(function(subject) {
                var selection = subject.get("selection");
                excessDemand += selection[0] - $scope.endowment.x;
            });

            // adjust price
            var currentPrice = $scope.prices.x/$scope.prices.y;
            var newPrice = $scope.adjustPrice(currentPrice, excessDemand);

            console.log(newPrice);
            console.log(excessDemand)
            rs.set("prices", {
                x: newPrice,
                y: 1
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
}]);

