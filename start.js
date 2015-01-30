Redwood.factory("EndowmentAssignment", ["RedwoodSubject", function (rs) {
    /* 
        This module is incredibly experiment specific
        and is not meant to be general purpose.
    */
    var KEY_A = "rp.x_allocation_100_0";
    var KEY_B = "rp.x_allocation_0_50";
    var ENDOWMENT_A = {x: 100, y: 0};
    var ENDOWMENT_B = {x: 0, y: 50};
    var api = {};

    api.save = function() {
        // register listeners to automatically save allocations
        rs.on("rp.perform_allocation", function (allocation) {
            var key = "rp.x_allocation_" + rs.config.Ex + "_" + rs.config.Ey;
            console.log("saving: " + allocation.x + " at " + key);

            var allocations = rs.self.get(key) || [];
            allocations.push({
                price: rs.config.Py / rs.config.Px, // this needs to be changed
                x: allocation.x
            })
            rs.set(key, allocations);
        });
    }

    api.getEndowment = function (smallEquilibriumPrice) {
        // setup comparison functions
        var comparePrice, shouldAssignEndowmentA;
        if (smallEquilibriumPrice) {
            comparePrice = function (a, b) { return a.price - b.price };
            shouldAssignEndowmentA = function (index, threshold) { return index < threshold };
        } else {
            comparePrice = function (a, b) { return b.price - a.price };
            shouldAssignEndowmentA = function (index, threshold) { return index >= threshold };
        }

        // get allocations sorted by price, for each subject
        var subjectAllocations = rs.subjects.map(function (subject) {
            // get allocations
            var aAllocations = subject.get(KEY_A) || [];
            var bAllocations = subject.get(KEY_B) || [];

            // sort saved allocations by price
            var aSorted = aAllocations.sort(comparePrice);
            var bSorted = bAllocations.sort(comparePrice);
            return {
                "subjectID": subject.user_id,
                "aAllocations": aSorted,
                "bAllocations": bSorted
            }
        });

        // get list of subjects sorted by diff = -A + B and excess demand, for each price
        // should already be sorted by price from previous step
        var price_count = subjectAllocations[0].aAllocations.length;
        var assignments = [];
        for (var k = 0; k < price_count; k++) {
            var subjects = subjectAllocations.map(function (subject, index) {
                var allocation, endowment;
                if (shouldAssignEndowmentA(index, subjectAllocations.length/2)) {
                    // subjects with higher diff are assigned endowment A
                    allocation = subject.aAllocations[k].x;
                    endowment = ENDOWMENT_A;
                } else {
                    // subjects with lower diff are assigned endowment B
                    allocation = subject.bAllocations[k].x;
                    endowment = ENDOWMENT_B;
                }
                return {
                    "subjectID": subject.subjectID,
                    "diff": subject.bAllocations[k].x - subject.aAllocations[k].x,
                    "endowment": endowment,
                    "allocation": allocation
                }
            }).sort(function (a, b) {
                return b.diff - a.diff;
            });

            var excessDemand = subjects.reduce(function (result, subject) {
                return result - subject.allocation;
            }, 50 * subjects.length);

            assignments.push({
                "subjects": subjects,
                "excessDemand": excessDemand
            });
        }

        // pick the lowest priced assignment that has a negative excessDemaand
        var assignment = assignments.filter(function (assignment) {
            return assignment.excessDemand < 0;
        })[0] || assignments[0];

        var assignmentSubjects = assignment.subjects || [];

        // get endowment for current subject
        // has to be a linear search ._.
        console.log("compute assignment");
        var endowment = assignmentSubjects.filter(function (subject) {
            return subject.subjectID == rs.self.user_id;
        })[0].endowment;

        return endowment;
    }
    
    return api;
}]);

Redwood.factory("Tatonnement", function () {
    var tatonnement = {};

    // provided
    var _weightVector;
    var _priceLowerBound;
    var _priceUpperBound;
    var _maxAngularDiff;
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

    tatonnement.initializePeriod = function (weightVector, priceLowerBound, priceUpperBound, maxAngularDiff) {
        _weightVector = weightVector;
        _priceLowerBound = priceLowerBound;
        _priceUpperBound = priceUpperBound;
        _maxAngularDiff = maxAngularDiff;
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
            return sum + (subject.get("rp.selection")[0] - subject.get("rp.endowment").x);
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
            var maxAngularDiff = _maxAngularDiff * excessDemandSign;
            var constrainedAngularDiff = Math.min(Math.abs(angularDiff), Math.abs(maxAngularDiff)) * excessDemandSign;
            
            var newPriceAngle = Math.atan(_price) + constrainedAngularDiff;

            // make sure that 0.01 <= price <= 100
            var priceLowerBoundAngle = Math.atan(_priceLowerBound);
            var priceUpperBoundAngle = Math.atan(_priceUpperBound);
            if (constrainedAngularDiff < 0) {
                return Math.tan(Math.max(newPriceAngle, priceLowerBoundAngle));
            } else {
                return Math.tan(Math.min(newPriceAngle, priceUpperBoundAngle));
            }
        } else {
            return _price + 0.01 * sign(_excessDemand);
        }
    }

    tatonnement.allocation = function (marketMaker) {
        var allocation = {}
        
        var netBuyers = _subjects.filter(function(subject) {
            return subject.get("rp.selection")[0] > subject.get("rp.endowment").x;
        }).length;
        var netSellers = _subjects.filter(function(subject) {
            return subject.get("rp.selection")[0] < subject.get("rp.endowment").x;
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

Redwood.controller("RPStartController", ["$scope",
                                         "RedwoodSubject",
                                         "SynchronizedStopWatch",
                                         "Tatonnement",
                                         "EndowmentAssignment",
                                         function ($scope, rs, stopWatch, ta, ea) {

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

        rs.set("last_limits", {x: larger, y: larger});
    }

    rs.on_load(function () {

        function extractConfigEntry (entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }

        var userIndex = (parseInt(rs.user_id) - 1) % 2;
        $scope.config = {
            // Endowment, Price and Probability Options
            Ex                : extractConfigEntry(rs.config.Ex, userIndex) || 0,
            Ey                : extractConfigEntry(rs.config.Ey, userIndex) || 0,
            Px                : extractConfigEntry(rs.config.Px, userIndex) || 100,
            Py                : extractConfigEntry(rs.config.Py, userIndex) || 157,
            ProbX             : extractConfigEntry(rs.config.ProbX, userIndex),
            // Tatonnement Options
            epsilon           : rs.config.epsilon || 1,
            roundsUnderEpsilon: rs.config.roundsUnderEpsilon || 1,
            expectedExcess    : rs.config.expectedExcess || 20,
            priceLowerBound   : rs.config.priceLowerBound || 0.1,
            priceUpperBound   : rs.config.priceUpperBound || 100.0,
            maxAngularDiff    : rs.config.maxAngularDiff || 0.26175,
            marketMaker       : rs.config.marketMaker || true,
            snapPriceToGrid   : rs.config.snapPriceToGrid || false,
            priceGridSpacing  : rs.config.priceGridSpacing || 0.2,
            weightVector      : rs.config.weightVector || [0.001745, 0.000873, 0.000436, 0.000218, 0.000109],
            // Endowment Assignment Options
            computeEndowment  : rs.config.computeEndowment || false,
            smallEquilibriumPrice : rs.config.smallEquilibriumPrice || false,
            saveAllocation    : rs.config.saveAllocation || false,
            // Visual Options
            XLimit            : extractConfigEntry(rs.config.XLimit, userIndex),
            YLimit            : extractConfigEntry(rs.config.YLimit, userIndex),
            limitAnimDuration : rs.config.limitAnimDuration || 0,
            plotResult        : extractConfigEntry(rs.config.plotResult, userIndex),
            // Interface Options
            constraintsX      : rs.config.constraintsX || false,
            // Timing Options
            rounds            : rs.config.rounds || 1,
            delay             : parseFloat(rs.config.delay) || 5,
            timeLimit         : parseFloat(rs.config.timeLimit) || 0,
            pause             : rs.config.pause || false,
        };

        $scope.endowment = {
            x: $scope.config.Ex,
            y: $scope.config.Ey
        }
        if ($scope.config.computeEndowment) {
            $scope.endowment = ea.getEndowment($scope.config.smallEquilibriumPrice);
        }

        $scope.currentRound = 0;
        $scope.inputEnabled = false;

        ta.initializePeriod(
            $scope.config.weightVector, 
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
        $scope.selection = [$scope.endowment.x, $scope.endowment.y];
        rs.trigger("rp.selection", [$scope.endowment.x, $scope.endowment.y])

        // set initial price
        var prices = rs.self.get("rp.prices");
        $scope.prices = {}
        $scope.prices.x = $scope.currentRound > 1 ? prices.x : $scope.config.Px;
        $scope.prices.y = $scope.currentRound > 1 ? prices.y : $scope.config.Py;
        console.log("prices: " + $scope.prices.y + ", " + $scope.prices.x);
        console.log("price: " + ($scope.prices.y/$scope.prices.x));

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
            rs.set("rp.rounds_under_epsilon", roundsUnder)

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
                rs.trigger("rp.perform_allocation", actualAllocation);
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
