RedwoodRevealedPreferences.controller("RPStartController", 
    ["$scope",
     "RedwoodSubject",
     "SynchronizedStopWatch",
     "RPTatonnement",
     "RPEndowmentAssignment",
     "ConfigManager",
    function ($scope, rs, stopWatch, ta, ea, configManager) {

    function snapPriceToGrid (price, priceGrid) {
        return priceGrid.sort(function(gridPrice1, gridPrice2) {
            return Math.abs(gridPrice1 - price) - Math.abs(gridPrice2 - price);
        })[0];
    }

    function animateLimits () {
        var larger = $scope.intercepts.x > $scope.intercepts.y
            ? $scope.intercepts.x
            : $scope.intercepts.y;

        var lastLimits = rs.self.get("rp.last_limits");

        var baseLimits = {};
        baseLimits.x = $scope.currentRound > 1 ? lastLimits.x : $scope.limits.x;
        baseLimits.y = $scope.currentRound > 1 ? lastLimits.y : $scope.limits.y;

        $(baseLimits).animate({x: larger, y: larger}, {
            duration: $scope.config.limitAnimDuration,
            easing: "easeInOutCubic",
            step: function (now, fx) {
                if (!$scope.$$phase) {
                    $scope.$apply(function () {
                        $scope.limits[fx.prop] = now;
                    })
                } else {
                    $scope.limits[fx.prop] = now;
                }
            }
        });

        rs.set("rp.last_limits", {x: larger, y: larger});
    }

    rs.on_load(function () {

        function extractConfigEntry (entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }

        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = configManager.loadPerSubject(rs, {
            Ex                   : 0,       // Endowment, Price and Probability Options
            Ey                   : 0,
            Px                   : 100,
            Py                   : 157,
            ProbX                : 0.5,
            useDefaultSelection  : false,
            epsilon              : 1,       // Tatonnement Options
            roundsUnderEpsilon   : 1,
            expectedExcess       : 13.5,
            priceLowerBound      : 0.1,
            priceUpperBound      : 100.0,
            maxAngularDiff       : 0.26175,
            marketMaker          : true,
            snapPriceToGrid      : false,
            priceGrid            : [0.2, 0.27, 0.34, 0.41, 0.48, 0.55, 0.62, 0.69,
                                    0.76, 0.82, 0.88, 0.94, 1, 1.063829787, 1.136363636,
                                    1.219512195, 1.315789474, 1.449275362, 1.612903226, 1.818181818,
                                    2.083333333, 2.43902439, 2.941176471, 3.703703704, 5],
            weightVector         : [0.001745, 0.000873, 0.000436, 0.000218, 0.000109],
            computeEndowment     : false,   // Endowment Assignment Options
            smallEquilibriumPrice: false,
            saveAllocation       : false,
            XLimit               : 100,     // Visual Options
            YLimit               : 100,
            limitAnimDuration    : 0,
            plotResult           : true,
            showEndowment        : true,
            showTable            : false,
            constraintsX         : false,   // Interaction Options
            rounds               : 1,       // Timing Options
            delay                : 5,
            timeLimit            : 0,
            pause                : false,
        });

        $scope.endowment = {
            x: $scope.config.Ex,
            y: $scope.config.Ey
        }
        if ($scope.config.computeEndowment) {
            console.log(rs.self.user_id)
            $scope.endowment = ea.getAssignedEndowment(rs.self.user_id, {
                endowmentA: {x: 100, y: 0},
                endowmentB: {x: 0, y: 50},
                minimizeEquilibriumPrice: $scope.config.smallEquilibriumPrice
            });
        }

        if ($scope.config.showEndowment) {
            $scope.shownEndowment = $scope.endowment;
        }

        $scope.currentRound = 0;
        $scope.inputEnabled = false;

        ta.initializePeriod(
            $scope.config.weightVector,
            $scope.config.expectedExcess,
            $scope.config.priceLowerBound, 
            $scope.config.priceUpperBound,
            $scope.config.maxAngularDiff);

        rs.trigger("rp.configuration", $scope.config);
        rs.trigger("rp.endowment", $scope.endowment);
        rs.trigger("rp.next_round");

        if ($scope.config.saveAllocation) {
            ea.save();
        }
    });

    rs.on("rp.next_round", function () {
        // Begin next round
        $scope.currentRound++;
        $scope.cursor = undefined;
        $scope.selection = null;
        if ($scope.config.useDefaultSelection) {
            $scope.selection = [$scope.endowment.x, $scope.endowment.y];
        }
        rs.trigger("rp.selection", $scope.selection)

        // set initial price
        var prices = rs.self.get("rp.prices");
        $scope.prices = {}
        $scope.prices.x = $scope.currentRound > 1 ? prices.x : $scope.config.Px;
        $scope.prices.y = $scope.currentRound > 1 ? prices.y : $scope.config.Py;
        console.log("prices: " + $scope.prices.x + ", " + $scope.prices.y);
        console.log("price: " + ($scope.prices.x/$scope.prices.y));

        // find axis intersections
        $scope.budget = ($scope.endowment.x * $scope.prices.x) + ($scope.endowment.y * $scope.prices.y);

        $scope.intercepts = {};
        $scope.intercepts.x = $scope.budget / $scope.prices.x;
        $scope.intercepts.y = $scope.budget / $scope.prices.y;

        // set plot limits
        $scope.limits = {}
        $scope.limits.x = $scope.config.XLimit ? $scope.config.XLimit : $scope.intercepts.x;
        $scope.limits.y = $scope.config.YLimit ? $scope.config.YLimit : $scope.intercepts.y;
        animateLimits();

        // set budget functions
        $scope.budgetFunction = function (x) {
            return ($scope.budget - x * $scope.prices.x) / $scope.prices.y;
        }
        $scope.inverseBudgetFunction = function (y) {
            return ($scope.budget - y * $scope.prices.y) / $scope.prices.x;
        }

        rs.trigger("rp.round_started", {
            endowment: $scope.endowment,
            price: $scope.prices.x / $scope.prices.y
        });
        $scope.inputEnabled = true;

        // setup timer
        if ($scope.config.timeLimit > 0) {
            if (!$scope.stopWatch) {
                $scope.timeRemaining = 0;
                // The round which this timer was started
                $scope.timerRound = $scope.currentRound;
                $scope.stopWatch = stopWatch.instance()
                    .frequency(1)
                    .duration($scope.config.timeLimit)
                    .onTick(function (tick, t) {
                        $scope.timeRemaining = $scope.timeTotal - t;
                    })
                    .onComplete(function () {
                        $scope.confirm();
                        $scope.stopWatch = null;
                    }).start();
            } else {
                $scope.stopWatch.duration($scope.stopWatch.getDurationInTicks() + $scope.config.timeLimit - $scope.timeRemaining)
            }

            $scope.timeTotal = $scope.stopWatch.getDurationInTicks();
        }

        // flash the Confirm Selection button to alert the subject that a new round started
        // ooh the dirty dirty JQuery (.n.)
        var confirmButton = $("#confirmButton");
        confirmButton.effect("highlight", {color: "#c6feb6"}, 500, function() {
            confirmButton.effect("highlight", {color: "#c6feb6"}, 500);
        });
    });

    rs.on("rp.selection", function (selection) {
        $scope.selection = selection;
    })

    rs.on("rp.confirm", function (position) {
        $scope.inputEnabled = false; // for recovery

        rs.synchronizationBarrier('rp.round_' + $scope.currentRound).then(function () {
            // Calculate current price
            var currentPrice = $scope.prices.x/$scope.prices.y;

            // Get subjects in the same group
            var subjectsInGroup = rs.subjects.filter(function (subject) {
                return subject.groupForPeriod
                    && subject.groupForPeriod === rs.self.groupForPeriod;
            });

            // Initialize Tatonnement service
            ta.initializeRound(currentPrice, subjectsInGroup, $scope.endowment, $scope.selection);

            // check if demand is under threshold (epsilon)
            var roundsUnder = rs.self.get("rp.rounds_under_epsilon");
            if (Math.abs(ta.excessDemandPerCapita()) < $scope.config.epsilon) {
                roundsUnder += 1;
            } else {
                roundsUnder = 0;
            }
            rs.set("rp.rounds_under_epsilon", roundsUnder);

            // If we demand has been under threshold for @roundsUnderEpsilon rounds,
            // or if the maximum number of rounds have been played,
            // stop tatonnement
            if (roundsUnder        >= $scope.config.roundsUnderEpsilon
            || $scope.currentRound >= $scope.config.rounds) {
                var actualAllocation = ta.allocation($scope.config.marketMaker);
                //$scope.selection = [actualAllocation.x, actualAllocation.y];
                var baseSelection = {
                    x: $scope.selection[0],
                    y: $scope.selection[1]
                }
                $(baseSelection).animate({x: actualAllocation.x, y: actualAllocation.y}, {
                    duration: $scope.config.limitAnimDuration,
                    easing: "easeInOutCubic",
                    step: function (now, fx) {
                        if (!$scope.$$phase) {
                            $scope.$apply(function () {
                                if (fx.prop == "x") {
                                    $scope.selection[0] = now;
                                } else {
                                    $scope.selection[1] = now;
                                }
                            })
                        } else {
                            if (fx.prop == "x") {
                                $scope.selection[0] = now;
                            } else {
                                $scope.selection[1] = now;
                            }
                        }
                    }
                });
                // reset rounds under epsilon
                rs.set("rp.rounds_under_epsilon", 0);
                rs.trigger("rp.perform_allocation", actualAllocation);
                return;
            }

            // Get adjusted price
            var newPrice = ta.adjustedPrice();

            // Snap to grid if necessary
            if ($scope.config.snapPriceToGrid) {
                newPrice = snapPriceToGrid(newPrice, $scope.config.priceGrid);
                if (newPrice == currentPrice) {
                    $scope.config.snapPriceToGrid = false;
                }
            }

            // Proceed to next round
            rs.set("rp.prices", {x: newPrice, y: 1});
            rs.trigger("rp.next_round");
        });
    });

    // Recieve result (whether X or Y was chosen) from admin.
    // This result is really only used for practice rounds.
    rs.on("rp.result", function (result) {
        result.period = rs.period;
        rs.set("rp.results", result);

        if($scope.config.plotResult) {
            $scope.finalResult = result;
            rs.next_period($scope.config.delay);
        } else {
            rs.next_period();
        }
    });

    $scope.$on("rpPlot.click", function (event, selection) {
        rs.trigger("rp.selection", selection);
    });

    $scope.confirm = function () {
        $scope.inputEnabled = false;
        rs.trigger("rp.confirm", { x: $scope.selection[0], y: $scope.selection[1] });
    };
}]);
