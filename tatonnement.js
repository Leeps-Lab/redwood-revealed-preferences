RedwoodRevealedPreferences.factory("RPTatonnement", function () {
    var api = {};

    /* Private Functions */
    var sign = function (value) {
        return value < 0 ? -1 : 1;
    }

    /* Exported Functions */

    api.getSubjectData = function (subjects) {
        return subjects.map(function(subject) {
            return {
                "selection": subject.get("rp.selection"),
                "endowment": subject.get("rp.endowment")
            };
        });
    }

    api.excessDemand = function(subjectData) {
        return subjectData.reduce(function(sum, data) {
            return sum + (data.selection[0] - data.endowment.x);
        }, 0); 
    }

    api.RoundContext = function(price, subjectData) {
        var excessDemand = api.excessDemand(subjectData);
        return {
            "price":                 price,
            "subjectData":           subjectData,
            "excessDemand":          excessDemand,
            "excessDemandPerCapita": excessDemand / subjectData.length,
        };
    }

    api.TatonnementAlgorithm = function(config) {
        var excessDemandHistory = [];
        var _weightIndex = 0;

        var _weightVector = config.weightVector;
        var _expectedExcess = config.expectedExcess;
        
        var _priceLowerBound = config.priceLowerBound;
        var _priceUpperBound = config.priceUpperBound;
        var _maxAngularDiff = config.maxAngularDiff;

        var _priceGrid = config.priceGrid;
        var _snapPriceToGrid = config.snapPriceToGrid;

        var priceSnappedToGrid = function(price) {
            return _priceGrid.sort(function(gridPrice1, gridPrice2) {
                return Math.abs(gridPrice1 - price) - Math.abs(gridPrice2 - price);
            })[0];
        }

        var weightVectorFinished = function() {
            return _weightIndex >= _weightVector.length
        }

        var addExcessDemand = function(excessDemand) {
            // increment weight index if the sign of the excess demand changes
            var previousDemand = excessDemandHistory.length == 0 ? 
                1 : excessDemandHistory[excessDemandHistory.length - 1];

            if (excessDemand * previousDemand < 0) {
                _weightIndex += 1;
            }
            excessDemandHistory.push(excessDemand);
        }

        var adjustedPrice = function(roundContext) {
            var adjustedPrice;
            if (_weightIndex < _weightVector.length) {

                var weight = _weightVector[_weightIndex] / _expectedExcess;
                var excessDemandSign = sign(roundContext.excessDemand);
                
                // make sure angular difference is no more than 15 degrees
                var angularDiff = weight * roundContext.excessDemandPerCapita;
                var maxAngularDiff = _maxAngularDiff * excessDemandSign;
                var constrainedAngularDiff = Math.min(Math.abs(angularDiff), Math.abs(maxAngularDiff)) * excessDemandSign;
                
                var newPriceAngle = Math.atan(roundContext.price) + constrainedAngularDiff;

                // make sure that 0.01 <= price <= 100
                var priceLowerBoundAngle = Math.atan(_priceLowerBound);
                var priceUpperBoundAngle = Math.atan(_priceUpperBound);
                if (constrainedAngularDiff < 0) {
                    adjustedPrice = Math.tan(Math.max(newPriceAngle, priceLowerBoundAngle));
                } else {
                    adjustedPrice = Math.tan(Math.min(newPriceAngle, priceUpperBoundAngle));
                }
            } else {
                adjustedPrice = roundContext.price + 0.01 * excessDemandSign;
            }

            if (_snapPriceToGrid) {
                var snappedPrice = priceSnappedToGrid(adjustedPrice);
                if (snappedPrice == roundContext.price) {
                    _snapPriceToGrid = false;
                } else {
                    adjustedPrice = snappedPrice;
                }
            }

            return adjustedPrice;
        }

        var adjustedAllocation = function (selection, endowment, roundContext, marketMaker) {
            var allocation = {};
            
            var netBuyers = roundContext.subjectData.filter(function(subject) {
                return subject.selection[0] > subject.endowment.x;
            }).length;

            var netSellers = roundContext.subjectData.filter(function(subject) {
                return subject.selection[0] < subject.endowment.x;
            }).length;
            
            if (marketMaker) {
                allocation.x = selection[0];
                allocation.y = selection[1];
            } else {
                if (selection[0] > endowment.x) { // net buyer
                    var halfExcessPerBuyer = roundContext.excessDemand / (2 * netBuyers);
                    allocation.x = selection[0] - halfExcessPerBuyer;
                    allocation.y = selection[1] + roundContext.price * halfExcessPerBuyer;
                } else if (selection[0] < endowment.x) { // net seller
                    var halfExcessPerSeller = roundContext.excessDemand / (2 * netSellers);
                    allocation.x = selection[0] + halfExcessPerSeller;
                    allocation.y = selection[1] - roundContext.price * halfExcessPerSeller;
                } else { // chooses endowment
                    allocation.x = selection[0];
                    allocation.y = selection[1];
                }
            }
            return allocation;
        }

        return {
            "weightVectorFinished": weightVectorFinished,
            "addExcessDemand": addExcessDemand,
            "adjustedPrice": adjustedPrice,
            "adjustedAllocation": adjustedAllocation
        };
    }

    return api;
});
