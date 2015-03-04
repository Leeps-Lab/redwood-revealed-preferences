describe("Endowment Assignment Algorithm", function() {

    var ea;
    var formattedData, prices;
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
            var dataForSubject = testData.filter(function(datum) {
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
    });

    it("should calculate correct excess demands when minimizing equilibrium price", function() {
        var selections = ea.getSelections(formattedData, prices);
        var diffs = ea.getDiffs(selections);
        var sortings = ea.getSortings(selections, diffs);
        var excessDemands = ea.getExcessDemands(sortings);
        var targetDemands = [
            286, 15, -116, -125, -75, -275, -196, -221, -284, -257, -228, -283,
            -357, -484, -433, -459, -553, -489, -488, -643, -589, -697, -656, -784, -940
        ];

        excessDemands.forEach(function(excessDemand, i) {
            expect(excessDemand).toBeCloseTo(targetDemands[i], -1);
        });
    })

    it("should calculate correct excess demands when maximizing equilibrium price", function() {
        var selections = ea.getSelections(formattedData, prices);
        var diffs = ea.getDiffs(selections);
        var sortings = ea.getSortings(selections, diffs);
        var excessDemands = ea.getExcessDemands(sortings);
        var targetDemands = [
            1565, 728, 455, 114, 132, -12, -4, 17, 32, -38 -21, -7,
            -180, -220, -262, -222, -369, -261, -236, -309, -253, -282, -209, -249, -260
        ];

        excessDemands.forEach(function(excessDemand, i) {
            expect(excessDemand).toBeCloseTo(targetDemands[i], -1);
        });
    })

    it("herp", function() {
        var y = [1, 2, 3, 4, 5, 6, 7, 8];
        expect(y.slice(0, y.length/2).length).toEqual(y.slice(y.length/2, y.length).length);
    })

    it("should sort correctly", function() {

        var sorting = ea.getAssignedEndowment(true, formattedData, prices);

        expect(sorting).toEqual([
            8, 9, 12, 23, 11, 14, 20, 15, 21, 3, 16, 7, 19, 4, 10, 22, 6, 24, 2, 13, 18, 17, 1, 5
        ]);
    })

})
