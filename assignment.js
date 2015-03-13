RedwoodRevealedPreferences.factory("RPEndowmentAssignment", ["RedwoodSubject", function (rs) {
    /* 
        This module is incredibly experiment specific
        and is not meant to be general purpose.
    */
    var KEY_PREFIX = "rp.endowmentAssignment.";
    var api = {};

    api.endowmentKey = function(endowment) {
        return KEY_PREFIX + endowment.x + "_" + endowment.y;
    }

    api.EndowmentAssigner = function(subjects, options) {
        var defaults = {
            endowmentA: {x: 100, y: 0},
            endowmentB: {x: 0, y: 50},
            minimizeEquilibriumPrice: true
        }
        for (var key in defaults) {
            if (!(key in options)) {
                options[key] = defaults[key];
            }
        }

        var getAssignedEndowment, chooseSorting;
        if (options.minimizeEquilibriumPrice) {
            getAssignedEndowment = function(subjectIndex, subjectCount) {
                if (subjectIndex < subjectCount/2) {
                    return options.endowmentA
                } else {
                    return options.endowmentB
                }
            }
            chooseSorting = function(sortings, excessDemands) {
                // traverse the sortings from last to first and pick the last one
                // with a negative excess demand before a positive excess demand is seen
                // If there are none with negative excess demand, pick the first one
                var last = sortings[sortings.length-1];
                for (var i = sortings.length-2; i >= 0; i--) {
                    if (excessDemands[i] >= 0) {
                        break;
                    } else {
                        last = sortings[i];
                    }
                }
                return last;
            }
        } else {
            getAssignedEndowment = function(subjectIndex, subjectCount) {
                if (subjectIndex < subjectCount/2) {
                    return options.endowmentB
                } else {
                    return options.endowmentA
                }
            }
            chooseSorting = function(sortings, excessDemands) {
                // traverse the sortings from first to last and pick the last one
                // with a positive excess demand before a negative excess demand is seen
                // If there are none with positive excess demand, pick the first one
                var last = sortings[0];
                for (var i = 1; i < sortings.length; i++) {
                    if (excessDemands[i] <= 0) {
                        break;
                    } else {
                        last = sortings[i];
                    }
                }
                return last;
            }
        }

        // transform input into more convenient format
        // from subject by price to price by subject
        // subjects[S][E][P] is the selection of subject S for price P with endowment E
        // selections[P][S].E is the selection of subject S for price P with endowment E.
        var selections = [];
        var priceCount = subjects[0]["a"].length;
        for (var i = 0; i < priceCount; ++i) {
            selections.push([]);
            for (var j = 0; j < subjects.length; ++j) {
                selections[i].push({
                    "id": j,
                    "a": subjects[j]["a"][i],
                    "b": subjects[j]["b"][i],
                });
            }
        }

        // The C vector in the spec
        // diffs[P][S] is the X/Y selection diff of subject S for price P
        var diffs = selections.map(function(subjects) {
            return subjects.map(function(subject) {
                return -subject.a + subject.b;
            })
        });

        // The S vector in the spec
        // an array of subject sortings for each price, sorted from greatest to least C value.
        // sortings[P] is the sorting of subjects for price P
        var sortings = selections.map(function(subjects, priceIndex) {
            return subjects.sort(function(a, b) {
                return diffs[priceIndex][b.id] - diffs[priceIndex][a.id];

            }).map(function(subject, index) {
                subject.assignedEndowment = getAssignedEndowment(index, subjects.length);
                return subject;
            });
        });

        // An array of excess demands for each subject sorting
        // excessDemands[P] is the excessDemand to price P
        var excessDemands = sortings.map(function(subjects) {
            return subjects.reduce(function(sum, subject) {
                if (subject.assignedEndowment == options.endowmentA) {
                    return sum + subject.a - subject.assignedEndowment.x;
                } else {
                    return sum + subject.b - subject.assignedEndowment.x;
                }
            }, 0)
        });

        // The optimized sorting
        // If minimizing equlibrium price: sorting with smallest price and a negative excessDemand
        // If maximizing equilibrium price: sorting with the largest price and a positive excessDemand
        var chosenSorting = chooseSorting(sortings, excessDemands);

        // A map for quick endowment lookup: SubjectID -> Endowment
        var assignedEndowmentMap = {};
        chosenSorting.forEach(function(subject) {
            assignedEndowmentMap[(parseInt(subject.id)+1).toString()] = subject.assignedEndowment;
        });

        return {
            "selections": selections,
            "diffs": diffs,
            "excessDemands": excessDemands,
            "sortings": sortings,
            "chosenSorting": chosenSorting,
            "getAssignedEndowment": function(subject) {
                return assignedEndowmentMap[subject];
            }
        };
    }

    api.getAllocationData = function(endowmentA, endowmentB) {
        var subjectAllocations = rs.subjects.map(function(subject) {
            var keyA = api.endowmentKey(endowmentA);
            var keyB = api.endowmentKey(endowmentB);

            var allocationsA = subject.get(keyA).sort(function(a, b) {
                return a.price - b.price;
            }).map(function(allocation) {
                return allocation.x
            });

            var allocationsB = subject.get(keyB).sort(function(a, b) {
                return a.price - b.price;
            }).map(function(allocation) {
                return allocation.x
            });

            return {
                "a": allocationsA,
                "b": allocationsB
            }
        });

        return subjectAllocations;
    }

    api.getAssignedEndowment = function(subject, options) {
        var allocationData = api.getAllocationData(options.endowmentA, options.endowmentB);
        return api.EndowmentAssigner(allocationData, options).getAssignedEndowment(subject);
    }

    api.save = function() {
        // register listeners to automatically save allocations for this round
        rs.on("rp.perform_allocation", function (allocation) {
            var key = api.endowmentKey({x: rs.config.Ex, y: rs.config.Ey});
            console.log("saving: " + allocation.x + " at " + key);

            var allocations = rs.self.get(key) || [];
            allocations.push({
                price: rs.config.Px / rs.config.Py,
                x: allocation.x
            })
            rs.set(key, allocations);
        });
    }
    
    return api;
}]);