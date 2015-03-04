angular.module("RedwoodRevealedPreferences").factory("RPEndowmentAssignment", ["RedwoodSubject", function (rs) {
    /* 
        This module is incredibly experiment specific
        and is not meant to be general purpose.
    */
    var KEY_A = "rp.x_allocation_100_0";
    var KEY_B = "rp.x_allocation_0_50";
    var api = {};

    api.EndowmentAssigner = function(subjects, prices, options) {
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

        var getAssignedEndowment;
        if (options.minimizeEquilibriumPrice) {
            getAssignedEndowment = function(subjectIndex, subjectCount) {
                if (subjectIndex < subjectCount/2) {
                    return options.endowmentA
                } else {
                    return options.endowmentB
                }
            }
        } else {
            getAssignedEndowment = function(subjectIndex, subjectCount) {
                if (subjectIndex < subjectCount/2) {
                    return options.endowmentB
                } else {
                    return options.endowmentA
                }
            }
        }

        // transform input into more convenient format
        // from subject by price to price by subject
        // subjects[S][E][P] is the selection of subject S for price P with endowment E
        // selections[P][S].E is the selection of subject S for price P with endowment E.
        var selections = [];
        for (var i = 0; i < prices.length; ++i) {
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

        return {
            "selections": selections,
            "diffs": diffs,
            "excessDemands": excessDemands,
            "sortings": sortings
        };
    }

    api.save = function() {
        // register listeners to automatically save allocations
        rs.on("rp.perform_allocation", function (allocation) {
            var key = "rp.x_allocation_" + rs.config.Ex + "_" + rs.config.Ey;
            console.log("saving: " + allocation.x + " at " + key);

            var allocations = rs.self.get(key) || [];
            allocations.push({
                price: rs.config.Px / rs.config.Py, // this needs to be changed
                x: allocation.x
            })
            rs.set(key, allocations);
        });
    }
    
    return api;
}]);