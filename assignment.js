Redwood.factory("RPEndowmentAssignment", ["RedwoodSubject", function (rs) {
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
                price: rs.config.Px / rs.config.Py, // this needs to be changed
                x: allocation.x
            })
            rs.set(key, allocations);
        });
    }

    api.getSubjects = function() {

    }

    api.getPrices = function() {

    }

    /*
        getAssignedEndowment computes and returns the assigned endowment
        for the given subject.

        @param subjectID: String

        @param subjects: [{
            "a": [Number],
            "b": [Number]
        }]
            An array containing and object for each subject. Each object has two arrays:
            one for the subject's n x-selections with endowment A, the other for the
            subject's n x-selections with endowment B.

        @param prices: [Number]
            An array containing the price for each of the n preliminary rounds

        n is the number of preliminary rounds
        m is the number of subjects
        each round is associated with a unique price.

        @returns The endowment for the given subject
    */
    api.getAssignedEndowment = function(minimizeEquilibriumPrice, subjects, prices) {
        // setup comparison functions
        var comparePrice, shouldAssignEndowmentA;
        if (minimizeEquilibriumPrice) {
            comparePrice = function (a, b) { return a.price - b.price };
            shouldAssignEndowmentA = function (index, threshold) { return index < threshold };
        } else {
            comparePrice = function (a, b) { return b.price - a.price };
            shouldAssignEndowmentA = function (index, threshold) { return index >= threshold };
        }

        // transform input into more convenient format
        // array of length n of array of length m of selection objects:
        // { "a": [Number, Number], "b": [Number, Number] }
        // selections[i][j].k is the selection of subject [j] in round[i] with endowment k.
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
        console.log(prices);

        // The C vector in the spec
        // [[Number]] An array with one array for each subject. The inner arrays contain
        // The diff vector for that subject
        var diffs = selections.map(function(subjects) {
            return subjects.map(function(subject) {
                return -subject.a + subject.b;
            })
        });

        console.log(diffs);

        // The S vector in the spec
        // an array of n possible sortings: one for each of the n preliminary rounds
        // sorted from greatest to least C value.
        var sortings = selections.map(function(subjects, round) {
            return subjects.sort(function(a, b) {
                return diffs[round][b.id] - diffs[round][a.id];
            });
        });

        // The Excess Demand vector
        var excessDemands = sortings.map(function(subjects) {
            var firstHalf = subjects.slice(0, subjects.length/2);
            var secondHalf = subjects.slice(subjects.length/2, subjects.length);
            console.log(firstHalf.length)
            console.log(secondHalf.length)
            console.log(subjects.length);
            return 50 * subjects.length - firstHalf.reduce(function(sum, subject) {
                return sum + subject.a;
            }, 0) - secondHalf.reduce(function(sum, subject) {
                return sum + subject.b;
            }, 0);
        });

        console.log(sortings);

        console.log(sortings[2].map(function(subject, i) {
            return i < sortings[2].length/2 ? subject.a: subject.b;
        }));

        console.log(excessDemands);

        return diffs;
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