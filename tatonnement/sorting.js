RedwoodRevealedPreferences.factory("RPSorting", ["RedwoodSubject", function (rs) {

	var sign = function (value) {
        if (value < 0) 
            return -1;
        else if (value > 0) 
            return 1;
        else 
            return 0;
    }

	var api = {};

	api.EndowmentAssigner = function(subjects, options) {

        var defaults = {
            minimizeEquilibriumPrice: true
        }
        for (var key in defaults) {
            if (!(key in options)) {
                options[key] = defaults[key];
            }
        }

        var getSellerGroup, getBuyerGroup;
        getSellerGroup = function(subjectIndex, subjectCount) {
            if (subjectIndex < (subjectCount/2 + 2)) {
                return 1;
            } else {
                return 2;
            }
        }
        if (options.minimizeEquilibriumPrice) {
            getBuyerGroup = function(subjectIndex, subjectCount) {
                if (subjectIndex < (subjectCount/2 + 2)) {
                    return 2;
                } else {
                    return 1;
                }
            }
        } else {
            getBuyerGroup = function(subjectIndex, subjectCount) {
                if (subjectIndex < (subjectCount/2 + 2)) {
                    return 1;
                } else {
                    return 2;
                }
            }
        }

		var subjectCount = subjects.length;
        var allocationCount = subjects[0]["a"].length; // sub[i]["a"].x = x[i]
                                                       // sub[i]["a"].y = y[i]

        /******************************
        * Delete four subjects
        *******************************/ 

// console.log("subjects:\n")
// for (var i = 0; i < subjects.length; i++){
//     console.log("subjects[" + i + "]: " + subjects[i] + "\n");
//     console.log("subjects[" + i + "].id: " + subjects[i].id + "\n");
//     console.log("subjects[" + i + "][\"a\"][0]: " + subjects[i]["a"][0] + "\n");
//     console.log("subjects[" + i + "][\"a\"][0].x: " + subjects[i]["a"][0].x + "\n");
//     console.log("subjects[" + i + "][\"a\"][0].y: " + subjects[i]["a"][0].y + "\n");
//     console.log("subjects[" + i + "][\"a\"][0].price: " + subjects[i]["a"][0].price + "\n");
//     console.log("subjects[" + i + "][\"a\"][0].seller: " + subjects[i]["a"][0].seller + "\n");
// }

        // Split users into buyers and sellers
        // Set in config
        var sellers = [];
        var buyers = [];
        for (var i = 0; i < subjectCount; ++i) {
            if (subjects[i]["a"][0].seller == true) {
                sellers.push({
                    "id": subjects[i].id,
                    "a": subjects[i]["a"]
                });
            } else {
                buyers.push({
                    "id": subjects[i].id,
                    "a": subjects[i]["a"]
                });
            }
        }
//
console.log("sellers[]:\n");
for (var i = 0; i < sellers.length; i++){
    for (var j = 0; j < allocationCount; j++) {
        console.log("sellers[" + i + "].id: " + sellers[i].id + "\n");
        console.log("sellers[" + i + "][\"a\"][" + j + "].x: " + sellers[i]["a"][j].x + "\n");
        console.log("sellers[" + i + "][\"a\"][" + j + "].y: " + sellers[i]["a"][j].y + "\n");
        console.log("sellers[" + i + "][\"a\"][" + j + "].price: " + sellers[i]["a"][j].price + "\n");
        console.log("sellers[" + i + "][\"a\"][" + j + "].seller: " + sellers[i]["a"][j].seller + "\n");
    }
}
console.log("buyers[]:\n");
for (var i = 0; i < buyers.length; i++){
    for (var j = 0; j < allocationCount; j++) {
        console.log("buyers[" + i + "].id: " + buyers[i].id + "\n");
        console.log("buyers[" + i + "][\"a\"][" + j + "].x: " + buyers[i]["a"][j].x + "\n");
        console.log("buyers[" + i + "][\"a\"][" + j + "].y: " + buyers[i]["a"][j].y + "\n");
        console.log("buyers[" + i + "][\"a\"][" + j + "].price: " + buyers[i]["a"][j].price + "\n");
        console.log("buyers[" + i + "][\"a\"][" + j + "].seller: " + buyers[i]["a"][j].seller + "\n");
    }
}
//

        // Calculate noise       
        var dxSellers = [];
        var dySellers = [];
        var distSellers = [];
        for (var i = 0; i < sellers.length; ++i) {
            dxSellers.push([]); // dxSellers[][i] = x[i + 1] - x[i]
            dySellers.push([]); // dySellers[][i] = y[i + 1] - y[i]
            distSellers.push([]); // distSellers[][i] = [(x[i] - x[i-1])^2 + (y[i] - y[i-1])^2]^(1/2)

            for (var j = 0; j < allocationCount - 1; ++j) {
                dxSellers[i].push(sellers[i]["a"][j + 1].x - sellers[i]["a"][j].x);
                dySellers[i].push(sellers[i]["a"][j + 1].y - sellers[i]["a"][j].y);
                distSellers[i].push(Math.sqrt(
                                (Math.pow((sellers[i]["a"][j + 1].x - sellers[i]["a"][j].x), 2) + 
                                 Math.pow((sellers[i]["a"][j + 1].y - sellers[i]["a"][j].y), 2))));
            }    
        }

        // Calculate noise       
        var dxBuyers = [];
        var dyBuyers = [];
        var distBuyers = [];
        for (var i = 0; i < buyers.length; ++i) {
            dxBuyers.push([]); // dxBuyers[][i] = x[i + 1] - x[i]
            dyBuyers.push([]); // dyBuyers[][i] = y[i + 1] - y[i]
            distBuyers.push([]); // distBuyers[][i] = [(x[i] - x[i-1])^2 + (y[i] - y[i-1])^2]^(1/2)

            for (var j = 0; j < allocationCount - 1; ++j) {
                dxBuyers[i].push(buyers[i]["a"][j + 1].x - buyers[i]["a"][j].x);
                dyBuyers[i].push(buyers[i]["a"][j + 1].y - buyers[i]["a"][j].y);
                distBuyers[i].push(Math.sqrt(
                                (Math.pow((buyers[i]["a"][j + 1].x - buyers[i]["a"][j].x), 2) + 
                                 Math.pow((buyers[i]["a"][j + 1].y - buyers[i]["a"][j].y), 2))));
            }    
        }

//
console.log("dxSellers[]:\n")
for (var i = 0; i < dxSellers.length; i++){
    for (var j = 0; j < dxSellers[0].length; j++) {
        console.log("dxSellers[" + i + "][" + j + "]: " + dxSellers[i][j] + "\n");
    }
}
console.log("dxBuyers[]:\n")
for (var i = 0; i < dxBuyers.length; i++){
    for (var j = 0; j < dxBuyers[0].length; j++) {
        console.log("dxBuyers[" + i + "][" + j + "]: " + dxBuyers[i][j] + "\n");
   }
}
console.log("dySellers[]:\n")
for (var i = 0; i < dySellers.length; i++){
    for (var j = 0; j < dySellers[0].length; j++) {
        console.log("dySellers[" + i + "][" + j + "]: " + dySellers[i][j] + "\n");
    }
}
console.log("dyBuyers[]:\n")
for (var i = 0; i < dyBuyers.length; i++){
    for (var j = 0; j < dyBuyers[0].length; j++) {
        console.log("dyBuyers[" + i + "][" + j + "]: " + dyBuyers[i][j] + "\n");
    }
}
console.log("distSellers[]:\n")
for (var i = 0; i < distSellers.length; i++){
    for (var j = 0; j < distSellers[0].length; j++) {
        console.log("distSellers[" + i + "][" + j + "]: " + distSellers[i][j] + "\n");
    }
}
console.log("distBuyers[]:\n")
for (var i = 0; i < distBuyers.length; i++){
    for (var j = 0; j < distBuyers[0].length; j++) {
        console.log("distBuyers[" + i + "][" + j + "]: " + distBuyers[i][j] + "\n");
     }
}
//

        noiseSellers = sellers.map(function(seller, index) { 
            var noise = 0;
            for (var j = 1; j < allocationCount - 1; ++j) {
                if ((sign(dxSellers[index][j]) != sign(dxSellers[index][j - 1])) || 
                    (sign(dySellers[index][j]) != sign(dySellers[index][j - 1]))) {
                    noise += distSellers[index][j];
                }
            }
            return {
                "id": seller.id,
                "a": seller.a,
                "noise": noise
            };
        });

        noiseBuyers = buyers.map(function(buyer, index) { 
            var noise = 0;
            for (var j = 1; j < allocationCount - 1; ++j) {
                if ((sign(dxBuyers[index][j]) != sign(dxBuyers[index][j - 1])) || 
                    (sign(dyBuyers[index][j]) != sign(dyBuyers[index][j - 1]))) {
                    noise += distBuyers[index][j];
                }
            }
            return {
                "id": buyer.id,
                "a": buyer.a,
                "noise": noise
            };
        });
        	
//
console.log("noiseSellers[]:\n")
for (var i = 0; i < noiseSellers.length; i++){
    console.log("noiseSellers[" + i + "].id: " + noiseSellers[i].id + "\n");
    console.log("noiseSellers[" + i + "].noise: " + noiseSellers[i].noise + "\n");
}
console.log("noiseBuyers[]:\n")
for (var i = 0; i < noiseBuyers.length; i++){
    console.log("noiseBuyers[" + i + "].id: " + noiseBuyers[i].id + "\n");
    console.log("noiseBuyers[" + i + "].noise: " + noiseBuyers[i].noise + "\n");
}
//

        // Sort in descending order of noise
        noiseSellers.sort(function(a, b) {
            return b.noise - a.noise;
        });
        noiseBuyers.sort(function(a, b) {
            return b.noise - a.noise;
        });
//
console.log("noiseSellers[]:\n")
for (var i = 0; i < noiseSellers.length; i++){
    console.log("noiseSellers[" + i + "].id: " + noiseSellers[i].id + "\n");
    console.log("noiseSellers[" + i + "].noise: " + noiseSellers[i].noise + "\n");
}
console.log("noiseBuyers[]:\n")
for (var i = 0; i < noiseBuyers.length; i++){
    console.log("noiseBuyers[" + i + "].id: " + noiseBuyers[i].id + "\n");
    console.log("noiseBuyers[" + i + "].noise: " + noiseBuyers[i].noise + "\n");
}
//

//         // Remove the two subjects with greatest noise in both sets
//         noiseSellers.splice(0, 2);
//         noiseBuyers.splice(0, 2);
// //
// console.log("noiseSellers[]:\n")
// for (var i = 0; i < noiseSellers.length; i++){
//     console.log("noiseSellers[" + i + "].id: " + noiseSellers[i].id + "\n");
//     console.log("noiseSellers[" + i + "].noise: " + noiseSellers[i].noise + "\n");
//     for (var j = 0; j < noiseSellers[i]["a"].length; j++) {
//         console.log("noiseSellers[" + i + "][\"a\"][" + j + "].price: " + noiseSellers[i]["a"][j].price + "\n");
//     }
// }
// console.log("noiseBuyers[]:\n")
// for (var i = 0; i < noiseBuyers.length; i++){
//     console.log("noiseBuyers[" + i + "].id: " + noiseBuyers[i].id + "\n");
//     console.log("noiseBuyers[" + i + "].noise: " + noiseBuyers[i].noise + "\n");
//     for (var j = 0; j < noiseBuyers[i]["a"].length; j++) {
//         console.log("noiseBuyers[" + i + "][\"a\"]" + j + "].price: " + noiseBuyers[i]["a"][j].price + "\n");
//     }
// }
// //

        if (noiseSellers[0]["a"].length != 25 || noiseBuyers[0]["a"].length != 25) {
            return {
                "getAssignedGroup": function(subject) {
                    return false;
                }
            };
        }
        finalSellers = noiseSellers.sort(function(a, b) {  
            var sA, sB = 0;
            for (var i = 7; i < 10; i++) {
                sA += a["a"].x;
                sB += b["a"].x;
            } 
            return sA - sB;
        }).map(function(subject, index) {
            if (index == 0){
                subject.assignedGroup = 1;
                subject.inTTM = false;
            } else if (index == 1) {
                subject.assignedGroup = 2;
                subject.inTTM = false;
            } else {
                subject.assignedGroup = getSellerGroup(index, noiseSellers.length - 2);
                subject.inTTM = true;
            }
            return subject;
        });

        finalBuyers = noiseBuyers.sort(function(a, b) {
            var dA, dB = 0;
            for (var i = 7; i < 10; i++) {
                dA += a.x;
                dB += b.x;
            }
            return dA - dB;
        }).map(function(subject, index) {
            if (index == 0){
                subject.assignedGroup = 1;
                subject.inTTM = false;
            } else if (index == 1) {
                subject.assignedGroup = 2;
                subject.inTTM = false;
            } else {
                subject.assignedGroup = getBuyerGroup(index, noiseBuyers.length - 2);
                subject.inTTM = true;
            }
            return subject;
        });
//
console.log("finalSellers[]:\n")
for (var i = 0; i < finalSellers.length; i++){
    console.log("finalSellers[" + i + "].id: " + finalSellers[i].id + "\n");
    console.log("finalSellers[" + i + "].noise: " + finalSellers[i].noise + "\n");
    console.log("finalSellers[" + i + "].assignedGroup: " + finalSellers[i].assignedGroup + "\n");
}
console.log("finalBuyers[]:\n")
for (var i = 0; i < finalBuyers.length; i++){
    console.log("finalBuyers[" + i + "].id: " + finalBuyers[i].id + "\n");
    console.log("finalBuyers[" + i + "].noise: " + finalBuyers[i].noise + "\n");
    console.log("finalBuyers[" + i + "].assignedGroup: " + finalBuyers[i].assignedGroup + "\n");
}
//

        var assignedGroupMap = {};
        var inTTMMap = {};
        finalSellers.forEach(function(subject) {
            assignedGroupMap[subject.id] = subject.assignedGroup;
            inTTMMap[subject.id] = subject.inTTM;
        });
        finalBuyers.forEach(function(subject) {
            assignedGroupMap[subject.id] = subject.assignedGroup;
            inTTMMap[subject.id] = subject.inTTM;
        });
//
console.log("assignedGroupMap[]:\n");
for (var i = 1; i <= subjects.length; i++){
    console.log("assignedGroupMap[" + i + "]: " + assignedGroupMap[i] + "\n");
    console.log("inTTMMap[" + i + "]: " + inTTMMap[i] + "\n");
}
//
        return {
            "getAssignedGroup": function(subject) {
                return {
                    "group": assignedGroupMap[subject],
                    "inTTM": inTTMMap[subject]
                };
            }
        };
    }

	api.getAssignedGroup = function(subject, options) {
        var allocationData = api.sortAllocationData();
        return api.EndowmentAssigner(allocationData, options).getAssignedGroup(subject);
    }

    api.sortAllocationData = function() {
        // Returns list of allocations for every user
        // Allocations for each user are listed
        //   in ascending order of price
        var sortedAllocations = rs.subjects.map(function(subject) {

            var allocations = subject.get("rp.allocations").sort(function(a, b) {
                return a.price - b.price; // Sort in ascending order of price
            }).map(function(allocation) {
                return {
                    "x": allocation.x,
                    "y": allocation.y,
                    "price": allocation.price,
                    "seller": allocation.seller
                };
            });

            return {
                "id": subject.user_id,
                "a": allocations
            };
        });

        return sortedAllocations;
    }

    api.save = function () {
        // register listeners to automatically save allocations for this round
        rs.on("rp.perform_allocation", function (allocation) {
        	var key = "rp.allocations";
            console.log("saving: " + allocation.x + " at " + key);
            var allocations = rs.self.get(key) || [];
            allocations.push({
                "price": rs.config.Price,
                "x": allocation.x,
                "y": allocation.y,
                "seller": rs.self.get("rp.seller")
            });
            rs.set(key, allocations);
        });
    }

	return api;

}]);