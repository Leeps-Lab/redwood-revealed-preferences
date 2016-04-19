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
                "endowment": subject.get("rp.endowment"),
                "group": subject.get("rp.group"),
                "inTTM": subject.get("rp.inTTM")
            };
        });
    }


// Change this so it doesn't include "deleted" subjects
    // Sum of excessDemand for entire array
    // excessDemand = selection.x - endowment.x
    api.excessDemand = function(subjectData) {
        return subjectData.reduce(function(sum, data) {
            if (data.inTTM) {
                return sum + (data.selection[0] - data.endowment.x);
            } else {
                return sum;
            }
        }, 0); 
    }

// excessDemandPerCapita = excessDemand / (subjectData.length - 2)
    api.RoundContext = function(price, subjectData) {
        var excessDemand = api.excessDemand(subjectData);
        return {
            "price":                 price,
            "subjectData":           subjectData,
            "excessDemand":          excessDemand,
            "excessDemandPerCapita": excessDemand / subjectData.length - 2,
        };
    }

    api.TatonnementAlgorithm = function(config) {
        var excessDemandHistory1 = [];
        var excessDemandHistory2 = [];
        var _weightIndex = 0;
        var firstRounded = false; // this gets set to true after the first round
                                  // in which price are off the grid AND
                                  // the end of the _weightVector has been reached

        var _weightVector = config.weightVector; ////R:var weightVector = `k`, k-vector
        var _expectedExcess = config.expectedExcess; //R:var expectedExcess = `ez`
        
        var _priceLowerBound = config.priceLowerBound; // if not set in config, deaults to 0.1
        var _priceUpperBound = config.priceUpperBound; // if not set in config, defaults to 100.0
        var _maxAngularDiff = config.maxAngularDiff;   //if not set in config, defaults to  0.26175

        var _priceGrid = config.priceGrid; //R:priceGrid = pr
        var _snapPriceToGrid = config.snapPriceToGrid; //R:snapPriceToGrid = snap  #While this variable =1, snap price to the grid

        var priceSnappedToGrid = function(price) {
            return _priceGrid.sort(function(gridPrice1, gridPrice2) {
                return Math.abs(gridPrice1 - price) - Math.abs(gridPrice2 - price);
            })[0];
        }

        var weightVectorFinished = function() {
            return _weightIndex >= _weightVector.length
        }

        var addExcessDemand1 = function(excessDemand) {
            // increment weight index if the sign of the excess demand changes
            if (excessDemandHistory1.length > 0) {
                var previousDemand = excessDemandHistory1[excessDemandHistory1.length - 1];

                if (excessDemand * previousDemand < 0) {
                    _weightIndex = Math.min(_weightIndex + 1, _weightVector.length - 1); //_weightIndex never moves beyond end of _weightVector
                }
            }
            excessDemandHistory1.push(excessDemand);
        }

        var addExcessDemand2 = function(excessDemand) {
            // increment weight index if the sign of the excess demand changes
            if (excessDemandHistory2.length > 0) {
                var previousDemand = excessDemandHistory2[excessDemandHistory2.length - 1];

                if (excessDemand * previousDemand < 0) {
                    _weightIndex = Math.min(_weightIndex + 1, _weightVector.length - 1); //_weightIndex never moves beyond end of _weightVector
                }
            }
            excessDemandHistory2.push(excessDemand);
        }

// PROBABLY NEED TO CHANGE THIS
        var adjustedPrice = function(roundContext) {
            var adjustedPrice;
            var excessDemandSign = sign(roundContext.excessDemand);

            var weight = _weightVector[_weightIndex] / _expectedExcess;  //R:var expectedExcess = `ez`
                
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

            // If the end of the _weightVector has been reached AND prices are off the grid
            // round new price to closest of {last price - .01, last price, last price + .01}
            if (_snapPriceToGrid == false && _weightIndex == (_weightVector.length - 1)) {
                var priceDiff = roundContext.price - adjustedPrice;
                if (firstRounded) { // If this condition has been met before
                    if (priceDiff > 0.01) {
                        adjustedPrice = roundTwoPlaces(roundContext.price) - 0.01;
                    }
                    else if (priceDiff < -0.01) {
                        adjustedPrice = roundTwoPlaces(roundContext.price) + 0.01;
                    }
                    else {
                        adjustedPrice = roundTwoPlaces(adjustedPrice);
                    }
                } else { // First time this condition has been met,
                         // price does not depend on last price
                        firstRounded = true;
                        adjustedPrice = roundTwoPlaces(adjustedPrice);
                }
            }

            if (_snapPriceToGrid) {
                var snappedPrice = priceSnappedToGrid(adjustedPrice);
                if (snappedPrice == roundContext.price) {
                    if (_weightIndex == (_weightVector.length - 1)) {
                        firstRounded = true;
                        adjustedPrice = roundTwoPlaces(adjustedPrice);
                    }
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
                if (!subject.inTTM){
                    return false;   
                } else {
                    return subject.selection[0] > subject.endowment.x;
                }
            }).length;

            var netSellers = roundContext.subjectData.filter(function(subject) {
                if (!subject.inTTM) {
                    return false;
                } else {
                    return subject.selection[0] < subject.endowment.x;
                }
            }).length;
            
            if (roundContext.subjectData.inTTM){
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
            } else {
                allocation.x = selection[0];
                allocation.y = selection[1];
            }
            return allocation;
        }

        var roundTwoPlaces = function (num) {
            return +(Math.round(num + "e+2") + "e-2");
        }

        return {
            "weightVectorFinished": weightVectorFinished,
            "addExcessDemand1": addExcessDemand1,
            "addExcessDemand2": addExcessDemand2,
            "adjustedPrice": adjustedPrice,
            "adjustedAllocation": adjustedAllocation
        };
    }

    return api;
});
