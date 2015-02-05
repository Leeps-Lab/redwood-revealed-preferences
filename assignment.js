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