describe("Tatonnement Algorithm", function() {

    var ta;
    var roundData = [];

    beforeEach(function() {
        // load mock Redwood Module
        angular.module("Redwood", [])
            .factory("RedwoodSubject", function() {});

        module("RedwoodRevealedPreferences");

        inject(function(_RPTatonnement_) {
            ta = _RPTatonnement_;
        })

        // set up mock data
        roundData = [];
        tatonnementTestData.forEach(function(datum) {
            var index = datum.round - 1;
            if (!roundData[index]) {
                roundData[index] = [];
            }
            roundData[index].push(datum);
        });
        
    });
    
    it("should correctly format and sort input data", function() {
        expect(roundData.length).toBe(3);
        roundData.forEach(function(data) {
            expect(data.length).toBe(12);
        })
    });

    it("should correctly calculate excess demand", function() {
        var excessDemand = ta.excessDemand(roundData[0])
        expect(excessDemand).toBeCloseTo(-73.938, 2)

        var excessDemand = ta.excessDemand(roundData[1])
        expect(excessDemand).toBeCloseTo(5.0909, 2)
    });


    it("should correctly determine new prices without snapping", function() {

        var algorithm = ta.TatonnementAlgorithm({
            "weightVector": [
                0.1745, 0.08725, 0.043625, 0.021813, 0.010906
            ],
            "expectedExcess": 13.5,
            "priceLowerBound": 0.1,
            "priceUpperBound": 100.0,
            "maxAngularDiff": 0.26175,
            "priceGrid": [
                0.2, 0.28, 0.36, 0.43, 0.5, 0.57,
                0.64, 0.7, 0.76, 0.83, 0.89, 0.94,
                1, 1.06, 1.13, 1.21, 1.31, 1.43,
                1.57, 1.75, 2, 2.33, 2.81, 3.57, 5
            ],
            "snapPriceToGrid": false
        });

        // round 1
        var subjectData = roundData[0];
        var roundContext = ta.RoundContext(subjectData[0].price, subjectData);

        var newPrice = algorithm.adjustedPrice(roundContext);
        algorithm.addExcessDemand(roundContext.excessDemand);

        expect(newPrice).toBeCloseTo(0.53018, 3);

        // round 2
        subjectData = roundData[1];
        roundContext = ta.RoundContext(subjectData[0].price, subjectData);

        newPrice = algorithm.adjustedPrice(roundContext);
        algorithm.addExcessDemand(roundContext.excessDemand);

        expect(newPrice).toBeCloseTo(0.50343, 3);
    });

it("should correctly determine new prices with snapping", function() {

        var algorithm = ta.TatonnementAlgorithm({
            "weightVector": [
                0.1745, 0.08725, 0.043625, 0.021813, 0.010906
            ],
            "expectedExcess": 13.5,
            "priceLowerBound": 0.1,
            "priceUpperBound": 100.0,
            "maxAngularDiff": 0.26175,
            "priceGrid": [
                0.2, 0.28, 0.36, 0.43, 0.5, 0.57,
                0.64, 0.7, 0.76, 0.83, 0.89, 0.94,
                1, 1.06, 1.13, 1.21, 1.31, 1.43,
                1.57, 1.75, 2, 2.33, 2.81, 3.57, 5
            ],
            "snapPriceToGrid": true
        });

        var subjectData = roundData[0];
        var roundContext = ta.RoundContext(subjectData[0].price, subjectData);

        var newPrice = algorithm.adjustedPrice(roundContext);
        algorithm.addExcessDemand(roundContext.excessDemand);

        expect(newPrice).toBeCloseTo(0.5, 3);

        subjectData = roundData[1];
        roundContext = ta.RoundContext(subjectData[0].price, subjectData);

        newPrice = algorithm.adjustedPrice(roundContext);
        algorithm.addExcessDemand(roundContext.excessDemand);

        expect(newPrice).toBeCloseTo(0.50343, 3);
    });

})
