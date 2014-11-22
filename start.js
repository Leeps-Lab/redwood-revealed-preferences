Redwood.controller("SubjectController", ["$scope", "RedwoodSubject", "SynchronizedStopWatch", function ($scope, rs, stopWatch) {

    // pure
    function sign (value) {
        return value < 0 ? -1 : 1;
    }

    // pure
    function adjustPriceWithWeight (price, excessDemand, subjectCount, weight) {
        //return Math.tan(Math.atan(price) + weight / subjectCount * excessDemand);
        var excessDemandSign = sign(excessDemand);

        // make sure angular difference is no more than 15 degrees
        var angularDiff = weight * excessDemand / subjectCount;
        var maxAngularDiff = 0.26175 * excessDemandSign;
        var constrainedAngularDiff = Math.min(angularDiff, maxAngularDiff) * excessDemandSign;
        
        var newPrice = Math.atan(price) + constrainedAngularDiff;

        // make sure that 0.01 <= price <= 100
        if (constrainedAngularDiff > 0) {
            return Math.tan(Math.max(newPrice, 0.01));
        } else {
            return Math.tan(Math.min(newPrice, 1.5609));
        }
    }

    // pure
    function adjustPriceWithoutWeight (price, excessDemand) {
        // needs to round to nearest hundreth
        return price * 0.01 * sign(excessDemand);
    }

    // pure
    function calculateExcessDemand (subjects, endowment) {
        return subjects.reduce(function(sum, subject) {
            return sum + (subject.get("selection")[0] - endowment);
        }, 0);
    }

    // pure
    function snapPriceToGrid (price, gridSpacing) {
        var upperSnapPoint = gridSpacing * Math.ceil(price / gridSpacing);
        var lowerSnapPoint = gridSpacing * Math.floor(price / gridSpacing);
        console.log("upperSnapPoint: " + upperSnapPoint);
        console.log("lowerSnapPoint: " + lowerSnapPoint);
        if (upperSnapPoint - price < price - lowerSnapPoint) {
            return upperSnapPoint;
        } else {
            return lowerSnapPoint;
        }
    }

    // pure
    function calculateAllocation (selectionX, selectionY, endowmentX, price, excessDemand, subjects) {
        var allocationX, allocationY;
        var netBuyers = subjects.filter(function(subject) {
            return subject.get("selection")[0] > endowmentX;
        }).length;
        var netSellers = subjects.filter(function(subject) {
            return subject.get("selection")[0] < endowmentX;
        }).length;
        
        if ($scope.config.marketMaker) {
            allocationX = selectionX;
            allocationY = selectionY;
        } else {
            if (selectionX > endowmentX) { // net buyer
                var halfExcessPerBuyer = excessDemand / (2 * netBuyers);
                allocationX = selectionX - halfExcessPerBuyer;
                allocationY = selectionY + price * halfExcessPerBuyer;
            } else if (selectionX < endowmentX) { // net seller
                var halfExcessPerSeller = excessDemand / (2 * netSellers);
                allocationX = selectionX + halfExcessPerSeller;
                allocationY = selectionY - price * halfExcessPerSeller;
            } else { // chooses endowment
                allocationX = selectionX;
                allocationY = selectionY;
            }
        }
        return { x: allocationX, y: allocationY };
    }

    rs.on_load(function () {

        function extractConfigEntry (entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }

        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = {
            Ex                : extractConfigEntry(rs.config.Ex, userIndex) || 0,
            Ey                : extractConfigEntry(rs.config.Ey, userIndex) || 0,
            Px                : extractConfigEntry(rs.config.Px, userIndex) || 100,
            Py                : extractConfigEntry(rs.config.Py, userIndex) || 157,
            epsilon           : rs.config.epsilon || 0.02,
            expectedExcess    : rs.config.expectedExcess || 20,
            marketMaker       : rs.config.marketMaker || false,
            snapPriceToGrid   : rs.config.snapPriceToGrid || false,
            priceGridSpacing  : rs.config.priceGridSpacing || 0.2,
            weightVector      : rs.config.weightVector || [0.001745, 0.000873, 0.000436, 0.000218, 0.000109],
            XLimit            : extractConfigEntry(rs.config.XLimit, userIndex),
            YLimit            : extractConfigEntry(rs.config.YLimit, userIndex),
            animateLimits     : extractConfigEntry(rs.config.animateLimits, userIndex) || true,
            ProbX             : extractConfigEntry(rs.config.ProbX, userIndex),
            plotResult        : extractConfigEntry(rs.config.plotResult, userIndex),
            rounds            : rs.config.rounds || 1,
            delay             : parseFloat(rs.config.delay) || 5,
            timeLimit         : parseFloat(rs.config.timeLimit) || 75,
            pause             : rs.config.pause || false,
            pauseAtEnd        : rs.config.pauseAtEnd == "TRUE" || false,
        };

        $scope.endowment = {
            x: $scope.config.Ex,
            y: $scope.config.Ey
        }

        $scope.weightIndex = 0;
        $scope.excessDemands = [];
        $scope.currentRound = 0;
        $scope.inputEnabled = false;

        rs.trigger("next_round");
    });

    rs.on("next_round", function () {
        // Begin next round
        $scope.currentRound++;
        $scope.cursor = undefined;
        $scope.selection = [$scope.endowment.x, $scope.endowment.y];
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
        if ($scope.config.animateLimits) {
            var larger = $scope.intercepts.x > $scope.intercepts.y
                ? $scope.intercepts.x
                : $scope.intercepts.y;
            $({x: $scope.limits.x, y: $scope.limits.y}).animate({x: larger, y: larger}, {
                duration: 1000,
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
        }

        // set budget functions
        $scope.budgetFunction = function (x) {
            return ($scope.budget - x * $scope.prices.x) / $scope.prices.y;
        }
        $scope.inverseBudgetFunction = function (y) {
            return ($scope.budget - y * $scope.prices.y) / $scope.prices.x;
        }

        rs.trigger("round_started", {
            endowment: $scope.endowment,
            price: $scope.prices.y / $scope.prices.x
        });
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
    });

    rs.on("selection", function (selection) {
        $scope.selection = selection;
    })

    rs.on("confirm", function (position) {
        $scope.inputEnabled = false; // for recovery

        rs.synchronizationBarrier('round_' + $scope.currentRound).then(function () {
            // Calculate current price
            var currentPrice = $scope.prices.x/$scope.prices.y;

            // Get subjects in the same group
            var subjectsInGroup = rs.subjects.filter(function (subject) {
                return subject.groupForPeriod
                    && subject.groupForPeriod === rs.self.groupForPeriod;
            });

            // Calculate excess demand
            var excessDemand = calculateExcessDemand(subjectsInGroup, $scope.endowment.x);
            var excessDemandPerCapita = excessDemand / subjectsInGroup.length;

            // If demand is under threshold, stop tatonnement
            if (Math.abs(excessDemandPerCapita) < $scope.config.epsilon) {
                var allocation = calculateAllocation(
                    $scope.selection[0],
                    $scope.selection[1],
                    $scope.endowment.x,
                    currentPrice,
                    excessDemand,
                    subjectsInGroup
                );
                rs.trigger("perform_allocation", allocation);
                return;
            }

            // Increment weight index if excessDemand sign changes
            if ($scope.excessDemands.length > 1) {
                var previousDemand = $scope.excessDemands[$scope.excessDemands.length - 1];
                if (excessDemand * previousDemand < 0) {
                    $scope.weightIndex += 1;
                }
            }
            $scope.excessDemands.push(excessDemand);

            // Adjust price
            var newPrice;
            if ($scope.weightIndex < $scope.config.weightVector.length) {
                // adjust with weight vector value
                newPrice = adjustPriceWithWeight(
                    currentPrice,
                    excessDemand,
                    subjectsInGroup.length,
                    $scope.config.weightVector[$scope.weightIndex]
                );
            } else {
                // adjust without weight vector
                newPrice = adjustPriceWithoutWeight(currentPrice, excessDemand);
            }

            // Snap to grid if necessary
            if ($scope.config.snapPriceToGrid) {
                var prevNewPrice = newPrice; // yeah I know, terrible naming
                newPrice = snapPriceToGrid(newPrice, $scope.config.priceGridSpacing);
                if (newPrice == prevNewPrice) {
                    $scope.config.snapPriceToGrid = false;
                }
            }

            rs.set("prices", {x: newPrice, y: 1});

            // Proceed to next round, or perform allocation and finish period.
            if ($scope.currentRound >= $scope.config.rounds) {
                var allocation = calculateAllocation(
                    $scope.selection[0],
                    $scope.selection[1],
                    $scope.endowment.x,
                    currentPrice,
                    excessDemand,
                    subjectsInGroup
                );
                rs.trigger("perform_allocation", allocation);
            } else {
                rs.trigger("next_round");
            }
        });
    });

    // Recieve result (whether X or Y was chosen) from admin. This result
    // is really only used for practice rounds.
    rs.on("result", function (result) {
        result.period = rs.period;
        rs.set("results", result);

        if($scope.config.plotResult) {
            $scope.finalResult = result;
            rs.next_period($scope.config.delay);
        } else {
            rs.next_period();
        }
    });

    $scope.$on("rpPlot.click", function (event, selection) {
        rs.trigger("selection", selection);
    });

    $scope.confirm = function () {
        $scope.inputEnabled = false;
        rs.trigger("confirm", { x: $scope.selection[0], y: $scope.selection[1] });
    };
}]);
