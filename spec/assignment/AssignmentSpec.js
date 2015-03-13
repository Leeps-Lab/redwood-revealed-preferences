describe("Endowment Assignment Algorithm", function() {

    var ea;
    var formattedData, prices;
    var minimizingAssigner, maximizingAssigner;
    var endowment1 = {x: 100, y: 0};
    var endowment2 = {x: 0, y: 50};

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
        for (var i = 1; i <= 24; i++) {
            var dataForSubject = assignmentTestData.filter(function(datum) {
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
        var target = [0,0,0,0,0,0,7.403751234,18.262586377,
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
        ];

        expect(prices.length).toBe(25)
        expect(minimizingAssigner.selections.length).toBe(25)
        minimizingAssigner.selections[24].forEach(function(selection, index) {
            expect(selection.a).toBeCloseTo(target[index], -1)
        })
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
        var targetDemands = [
            286, 15, -116, -125, -75, -275, -196, -221, -284, -257, -228, -283,
            -357, -484, -433, -459, -553, -489, -488, -643, -589, -697, -656, -784, -940
        ];

        excessDemands.forEach(function(excessDemand, i) {
            expect(excessDemand).toBeCloseTo(targetDemands[i], 0);
        });
    })

    it("should calculate correct excess demands when maximizing equilibrium price", function() {
        var excessDemands = maximizingAssigner.excessDemands;
        var targetDemands = [
            1565, 728, 455, 114, 132, -12, -4, 17, 32, -38, -21, -7,
            -180, -220, -262, -222, -369, -261, -236, -309, -253, -282, -209, -249, -260
        ];

        excessDemands.forEach(function(excessDemand, i) {
            expect(excessDemand).toBeCloseTo(targetDemands[i], 0);
        });
    })

    it("should sort correctly when minimizing equilibrium price", function() {

        var sorting = minimizingAssigner.chosenSorting.map(function(subject) {
            return parseInt(subject.id) + 1
        });

        expect(sorting).toEqual([
            // 8, 9, 12, 23, 11, 14, 20, 15, 21, 3, 16, 7, 19, 4, 10, 22, 6, 24, 2, 13, 18, 17, 1, 5
            9, 8, 12, 23, 11, 14, 20, 15, 21, 3, 16, 7, 19, 4, 10, 22, 6, 24, 2, 13, 18, 17, 1, 5
        ]);
    })

    it("should sort correctly when maximizing equilibrium price", function() {

        var sorting = maximizingAssigner.chosenSorting.map(function(subject) {
            return parseInt(subject.id) + 1
        });

        expect(sorting).toEqual([
            //8, 9, 23, 18, 20, 6, 24, 12, 7, 15, 2, 19,
            //16, 22, 21, 4, 1, 13, 17, 10, 11, 3, 14, 5
            23, 9, 8, 18, 20, 6, 24, 12, 7, 15, 2, 19,
            16, 22, 21, 4, 1, 13, 17, 10, 11, 3, 14, 5
        ]);
    })

    it("should assign first half of subjects in sorting to endowmentA when minimizing equilibrium price", function() {
        for (var i = 0; i < 12; i++) {
            var id = minimizingAssigner.chosenSorting[i].id+1;
            expect(minimizingAssigner.getAssignedEndowment(id)).toEqual(endowment1);
        }
    })

    it("should assign second half of subjects in sorting to endowmentB when minimizing equilibrium price", function() {
        for (var i = 12; i < 24; i++) {
            var id = minimizingAssigner.chosenSorting[i].id+1;
            expect(minimizingAssigner.getAssignedEndowment(id)).toEqual(endowment2);
        }
    })

    it("should assign first half of subjects in sorting to endowmentB when maximizing equilibrium price", function() {
        for (var i = 0; i < 12; i++) {
            var id = maximizingAssigner.chosenSorting[i].id+1;
            expect(maximizingAssigner.getAssignedEndowment(id)).toEqual(endowment2);
        }
    })

    it("should assign second half of subjects in sorting to endowmentA when maximizing equilibrium price", function() {
        for (var i = 12; i < 24; i++) {
            var id = maximizingAssigner.chosenSorting[i].id+1;
            expect(maximizingAssigner.getAssignedEndowment(id)).toEqual(endowment1);
        }
    })

})
