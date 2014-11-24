Redwood.factory("Tatonnement", function () {
    var tatonnement = {};

    // provided
    var _weightVector;
    var _price;
    var _subjects;
    var _endowment;
    var _selection;

    // computed and reused a lot
    var _excessDemand = 0;
    var _excessDemandPerCapita = 0;

    // per period state
    var _weightIndex;
    var _excessDemandHistory = [];

    function sign (value) {
        return value < 0 ? -1 : 1;
    }

    tatonnement.initializePeriod = function (weightVector) {
        _weightVector = weightVector;
        _weightIndex = 0;
        _excessDemandHistory = [];
    }

    tatonnement.initializeRound = function (price, subjects, endowment, selection) {
        // set internal variables
        _price = price;
        _subjects = subjects;
        _endowment = endowment;
        _selection = selection;

        // compute excessDemand
        _excessDemand = _subjects.reduce(function(sum, subject) {
            return sum + (subject.get("selection")[0] - _endowment.x);
        }, 0);
        _excessDemandPerCapita = _excessDemand / _subjects.length;

        // increment weight index if necessary
        if (_excessDemandHistory.length > 1) {
            var previousDemand = _excessDemandHistory[_excessDemandHistory.length - 1];
            if (_excessDemand * previousDemand < 0) {
                _weightIndex += 1;
            }
        }
        _excessDemandHistory.push(_excessDemand);
    }

    tatonnement.adjustedPrice = function () {
        if (_weightIndex < _weightVector.length) {

            var weight = _weightVector[_weightIndex];
            var excessDemandSign = sign(_excessDemand);
            
            // make sure angular difference is no more than 15 degrees
            var angularDiff = weight * _excessDemand / _subjects.length;
            var maxAngularDiff = 0.26175 * excessDemandSign;
            var constrainedAngularDiff = Math.min(angularDiff, maxAngularDiff) * excessDemandSign;
            
            var newPrice = Math.atan(_price) + constrainedAngularDiff;

            // make sure that 0.01 <= price <= 100
            if (constrainedAngularDiff > 0) {
                return Math.tan(Math.max(newPrice, 0.01));
            } else {
                return Math.tan(Math.min(newPrice, 1.5608));
            }
        } else {
            return _price * 0.01 * sign(_excessDemand);
        }
    }

    tatonnement.allocation = function (marketMaker) {
        var allocation = {}
        
        var netBuyers = _subjects.filter(function(subject) {
            return subject.get("selection")[0] > _endowment.x;
        }).length;
        var netSellers = _subjects.filter(function(subject) {
            return subject.get("selection")[0] < _endowment.x;
        }).length;
        
        if (marketMaker) {
            allocation.x = _selection[0];
            allocation.y = _selection[1];
        } else {
            if (_selection[0] > _endowment.x) { // net buyer
                var halfExcessPerBuyer = _excessDemand / (2 * netBuyers);
                allocation.x = _selection[0] - halfExcessPerBuyer;
                allocation.y = _selection[1] + _price * halfExcessPerBuyer;
            } else if (_selection[0] < _endowment.x) { // net seller
                var halfExcessPerSeller = _excessDemand / (2 * netSellers);
                allocation.x = _selection[0] + halfExcessPerSeller;
                allocation.y = _selection[1] - _price * halfExcessPerSeller;
            } else { // chooses endowment
                allocation.x = _selection[0];
                allocation.y = _selection[1];
            }
        }
        return allocation;
    }

    // Accessors

    tatonnement.excessDemand = function () {
        return _excessDemand;
    };

    tatonnement.excessDemandPerCapita = function () {
        return _excessDemandPerCapita;
    }

    return tatonnement;
});

Redwood.controller("SubjectController", ["$scope",
                                         "RedwoodSubject",
                                         "SynchronizedStopWatch",
                                         "Tatonnement",
                                         function ($scope, rs, stopWatch, ta) {

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

    function animateLimits () {
        var larger = $scope.intercepts.x > $scope.intercepts.y
            ? $scope.intercepts.x
            : $scope.intercepts.y;

        var lastLimits = rs.self.get("last_limits");
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

        rs.set("last_limits", {x: larger, y: larger});
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
            epsilon           : rs.config.epsilon || 1,
            expectedExcess    : rs.config.expectedExcess || 20,
            marketMaker       : rs.config.marketMaker || true,
            snapPriceToGrid   : rs.config.snapPriceToGrid || false,
            priceGridSpacing  : rs.config.priceGridSpacing || 0.2,
            weightVector      : rs.config.weightVector || [0.001745, 0.000873, 0.000436, 0.000218, 0.000109],
            XLimit            : extractConfigEntry(rs.config.XLimit, userIndex),
            YLimit            : extractConfigEntry(rs.config.YLimit, userIndex),
            limitAnimDuration : rs.config.limitAnimDuration || 0,
            ProbX             : extractConfigEntry(rs.config.ProbX, userIndex),
            plotResult        : extractConfigEntry(rs.config.plotResult, userIndex),
            rounds            : rs.config.rounds || 1,
            delay             : parseFloat(rs.config.delay) || 5,
            timeLimit         : parseFloat(rs.config.timeLimit) || 0,
            pause             : rs.config.pause || false,
            pauseAtEnd        : rs.config.pauseAtEnd == "TRUE" || false,
        };

        $scope.endowment = {
            x: $scope.config.Ex,
            y: $scope.config.Ey
        }

        $scope.currentRound = 0;
        $scope.inputEnabled = false;

        ta.initializePeriod($scope.config.weightVector);

        rs.trigger("configuration", $scope.config);
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
        animateLimits();

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

            // Initialize Tatonnement service
            ta.initializeRound(currentPrice, subjectsInGroup, $scope.endowment, $scope.selection);

            // If demand is under threshold or max round has been reached, stop tatonnement
            if (Math.abs(ta.excessDemandPerCapita()) < $scope.config.epsilon
                ||              $scope.currentRound >= $scope.config.rounds) {

                rs.trigger("perform_allocation", ta.allocation($scope.config.marketMaker));
                return;
            }

            // Get adjusted price
            var newPrice = ta.adjustedPrice();

            // Snap to grid if necessary
            if ($scope.config.snapPriceToGrid) {
                var prevNewPrice = newPrice; // yeah I know, terrible naming
                newPrice = snapPriceToGrid(newPrice, $scope.config.priceGridSpacing);
                if (newPrice == prevNewPrice) {
                    $scope.config.snapPriceToGrid = false;
                }
            }

            // Proceed to next round
            rs.set("prices", {x: newPrice, y: 1});
            rs.trigger("next_round");
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
