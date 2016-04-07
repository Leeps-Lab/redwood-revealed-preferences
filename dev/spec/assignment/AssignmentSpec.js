var verifyDataset = function(dataset, subjectCount, periodInterval, endowments, expectedResults) {
    describe("Endowment Assignment Algorithm", function() {

        var ea;
        var formattedData, prices;
        var minimizingAssigner, maximizingAssigner;
        var endowment1 = endowments[0];
        var	endowment2 = endowments[1];

        beforeEach(function() {
            // load mock Redwood Module
            angular.module("Redwood", [])
                .factory("RedwoodSubject", function() {});

            module("RedwoodRevealedPreferences");

            inject(function(_RPEndowmentAssignment_) {
                ea = _RPEndowmentAssignment_;
            })

            // set up mock data
            prices = null;
            formattedData = [];
            for (var i = 1; i <= subjectCount; i++) {
                var dataForSubject = dataset.filter(function(datum) {
									  return datum.Period >= periodInterval[0] && datum.Period <= periodInterval[1];
								}).filter(function(datum) {
                    return datum.Sender === i;
                }).sort(function(a, b) {
                    return a.Px / a.Py - b.Px / b.Py;
                });

                if (!prices) {
                    prices = dataForSubject.filter(function(datum) {
                        return datum.Ex === 100 && datum.Ey === 0;
                    }).map(function(a) {
                        return a.Px / a.Py;
                    });
                }

                var aSelections = dataForSubject.filter(function(datum) {
                    return datum.Ex === 100 && datum.Ey === 0;
                }).map(function(datum) {
                    return datum.x;
                });

                var bSelections = dataForSubject.filter(function(datum) {
                    return datum.Ex === 0 && datum.Ey === 50;
                }).map(function(datum) {
                    return datum.x;
                });

                formattedData.push({
                    "a": aSelections,
                    "b": bSelections
                });
            }

            minimizingAssigner = ea.EndowmentAssigner(formattedData, {
                endowmentA: endowment1,
                endowmentB: endowment2,
                minimizeEquilibriumPrice: true
            });
            maximizingAssigner = ea.EndowmentAssigner(formattedData, {
                endowmentA: endowment1,
                endowmentB: endowment2,
                minimizeEquilibriumPrice: false
            });
	    	});
        
        it("should correctly format and sort input data", function() {
            var target = expectedResults['sortedSelections']; 

						if ("sortedSelections" in expectedResults) {
                expect(prices.length).toBe(25)
                expect(minimizingAssigner.selections.length).toBe(25)
                minimizingAssigner.selections[24].forEach(function(selection, index) {
                    expect(selection.a).toBeCloseTo(target[index], -1)
                })
						}
        })

        it("should assign the correct endowments to subjects when minimizing equilibrium price", function() {
            var sortings = minimizingAssigner.sortings;
            sortings.forEach(function(sorting) {
                sorting.forEach(function(subject, index) {
                    var targetEndowment = index < sorting.length/2 ? endowment1 : endowment2;
                    expect(subject.assignedEndowment).toEqual(targetEndowment);
                })
            });
        })

        it("should assign the correct endowments to subjects when maximizing equilibrium price", function() {
            var sortings = maximizingAssigner.sortings;
            sortings.forEach(function(sorting) {
                sorting.forEach(function(subject, index) {
                    var targetEndowment = index < sorting.length/2 ? endowment2 : endowment1;
                    expect(subject.assignedEndowment).toEqual(targetEndowment);
                })
            });
        })

        it("should calculate correct excess demands when minimizing equilibrium price", function() {
            var excessDemands = minimizingAssigner.excessDemands;
            var targetDemands = expectedResults["minimizingExcessDemands"];

            excessDemands.forEach(function(excessDemand, i) {
                expect(excessDemand).toBeCloseTo(targetDemands[i], 0);
            });
        })

        it("should calculate correct excess demands when maximizing equilibrium price", function() {
            var excessDemands = maximizingAssigner.excessDemands;
            var targetDemands = expectedResults["maximizingExcessDemands"];

            excessDemands.forEach(function(excessDemand, i) {
                expect(excessDemand).toBeCloseTo(targetDemands[i], 0);
            });
        })

        it("should sort correctly when minimizing equilibrium price", function() {

            var sorting = minimizingAssigner.chosenSorting.map(function(subject) {
                return parseInt(subject.index) + 1
            });

            expect(sorting).toEqual(expectedResults["minimizingSorting"]);
        })

        it("should sort correctly when maximizing equilibrium price", function() {

            var sorting = maximizingAssigner.chosenSorting.map(function(subject) {
                return parseInt(subject.index) + 1
            });

            expect(sorting).toEqual(expectedResults["maximizingSorting"]);
        })

        it("should assign first half of subjects in sorting to endowmentA when minimizing equilibrium price", function() {
					  var length = minimizingAssigner.chosenSorting.length;
            for (var i = 0; i < length/2; i++) {
                var index = minimizingAssigner.chosenSorting[i].index+1;
                expect(minimizingAssigner.getAssignedEndowment(index)).toEqual(endowment1);
            }
        })

        it("should assign second half of subjects in sorting to endowmentB when minimizing equilibrium price", function() {
					  var length = minimizingAssigner.chosenSorting.length;
            for (var i = length/2; i < length; i++) {
                var index = minimizingAssigner.chosenSorting[i].index+1;
                expect(minimizingAssigner.getAssignedEndowment(index)).toEqual(endowment2);
            }
        })

        it("should assign first half of subjects in sorting to endowmentB when maximizing equilibrium price", function() {
					  var length = maximizingAssigner.chosenSorting.length;
            for (var i = 0; i < length/2; i++) {
                var index = maximizingAssigner.chosenSorting[i].index+1;
                expect(maximizingAssigner.getAssignedEndowment(index)).toEqual(endowment2);
            }
        })

        it("should assign second half of subjects in sorting to endowmentA when maximizing equilibrium price", function() {
					  var length = maximizingAssigner.chosenSorting.length;
            for (var i = length/2; i < length; i++) {
                var index = maximizingAssigner.chosenSorting[i].index+1;
                expect(maximizingAssigner.getAssignedEndowment(index)).toEqual(endowment1);
            }
        });
    });
}

verifyDataset(assignmentTestData, 24, [3, 53], [
			{"x": 100, "y": 0},
			{"x": 0, "y": 50}
		], {
    "sortedSelections": [
        0,0,0,0,0,0,7.403751234,18.262586377,
        28.134254689,
        40.967423495,
        39.980256663, // please excuse this bad formatting
        45.903257651,
        49.851924976,
        54.787759131,
        75.518262586,
        80.2566633761,80.2566633761,81.836130306,
        83.415597236,
        83.415597236,
        83.415597236,
        83.2181638697,83.2181638697,82.4284304047
    ],
    "minimizingExcessDemands": [
        286, 15, -116, -125, -75, -275, 
        -196, -221, -284, -257, -228, -283,
        -357, -484, -433, -459, -553, -489,
        -488, -643, -589, -697, -656, -784, -940
    ],
    "maximizingExcessDemands": [
        1565, 728, 455, 114, 132, -12,
        -4, 17, 32, -38, -21, -7,
        -180, -220, -262, -222, -369, -261,
        -236, -309, -253, -282, -209, -249, -260
    ],
    "minimizingSorting": [
        8, 9, 12, 23, 11, 14, 20, 15, 21, 3, 16, 7,
        19, 4, 10, 22, 6, 24, 2, 13, 18, 17, 1, 5
        //9, 8, 12, 23, 11, 14, 20, 15, 21, 3, 16, 7,
        //19, 4, 10, 22, 6, 24, 2, 13, 18, 17, 1, 5
    ],
    "maximizingSorting": [
        8, 9, 23, 18, 20, 6, 24, 12, 7, 15, 2, 19,
        16, 22, 21, 4, 1, 13, 17, 10, 11, 3, 14, 5
        //23, 9, 8, 18, 20, 6, 24, 12, 7, 15, 2, 19,
        //16, 22, 21, 4, 1, 13, 17, 10, 11, 3, 14, 5
    ]
});

verifyDataset(assignmentTestData2, 12, [11, 60], [
		  	{"x": 100, "y": 0},
			  {"x": 0, "y": 50}
		], {
    "minimizingExcessDemands": [
	      249, -56.02597, -55.48485, -107.78013, -89.81818, -190.76236,
	      -178.60227, -144.96104, -211.00957, -147.09310, -184.09806, -191.04062,
	      -217.36364, -255.16364, -197.10727, -211.64545, -281.36364, -256.95091,
	      -285.47636, -244.86364, -291.63636, -329.92909, -345.24364, -343.40909,
	      -436.45455
    ],
    "maximizingExcessDemands": [
	      781.636364, 248.909091, 225.505051, 92.596195, 99.272727,
	      2.708134, -1.653409, 12.103896, -59.555024, -59.349398,
	      -25.609806, -64.375242, -91.727273, -69.745455, -100.056364,
	      -68.850909, -108.292727, -107.765455, -99.438182, -122.000000,
        -83.090909, -129.700000, -139.152727, -131.987273, -177.727273
    ],
    "minimizingSorting": [
	      1, 12, 8, 10, 11, 7, 9, 6, 3, 2, 5, 4
    ],
    "maximizingSorting": [
			  1, 8, 5, 10, 9, 3, 12, 7, 6, 11, 2, 4
    ]
});
