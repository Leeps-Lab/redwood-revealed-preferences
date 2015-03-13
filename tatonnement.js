Redwood.factory("RPTatonnement", function () {
    var tatonnement = {};

    // provided
    var _weightVector;
    var _expectedExcessDemand;
    var _priceLowerBound;
    var _priceUpperBound;
    var _maxAngularDiff;
    var _price;
    var _subjects;
    var _endowment;
    var _selection;

    // computed and reused a lot
    var _excessDemand = 0;
    var _excessDemandPerCapita = 0;

    // per period state
    var _weightIndex;
    var _excessDemandHistory = [];

    function sign (value) {
        return value < 0 ? -1 : 1;
    }

    tatonnement.initializePeriod = function (weightVector, expectedExcessDemand, priceLowerBound, priceUpperBound, maxAngularDiff) {
        _weightVector = weightVector;
        _expectedExcessDemand = expectedExcessDemand;
        _priceLowerBound = priceLowerBound;
        _priceUpperBound = priceUpperBound;
        _maxAngularDiff = maxAngularDiff;
        _weightIndex = 0;
        _excessDemandHistory = [];
    }

    tatonnement.initializeRound = function (price, subjects, endowment, selection) {
        // set internal variables
        _price = price;
        _subjects = subjects;
        _endowment = endowment;
        _selection = selection;

        // compute excessDemand
        _excessDemand = _subjects.reduce(function(sum, subject) {
            return sum + (subject.get("rp.selection")[0] - subject.get("rp.endowment").x);
        }, 0);
        _excessDemandPerCapita = _excessDemand / _subjects.length;

        // increment weight index if necessary
        if (_excessDemandHistory.length > 1) {
            var previousDemand = _excessDemandHistory[_excessDemandHistory.length - 1];
            if (_excessDemand * previousDemand < 0) {
                _weightIndex += 1;
            }
        }
        _excessDemandHistory.push(_excessDemand);
    }

    tatonnement.adjustedPrice = function () {
        if (_weightIndex < _weightVector.length) {

            var weight = _weightVector[_weightIndex] / _expectedExcessDemand;
            var excessDemandSign = sign(_excessDemand);
            
            // make sure angular difference is no more than 15 degrees
            var angularDiff = weight * _excessDemand / _subjects.length;
            var maxAngularDiff = _maxAngularDiff * excessDemandSign;
            var constrainedAngularDiff = Math.min(Math.abs(angularDiff), Math.abs(maxAngularDiff)) * excessDemandSign;
            
            var newPriceAngle = Math.atan(_price) + constrainedAngularDiff;

            // make sure that 0.01 <= price <= 100
            var priceLowerBoundAngle = Math.atan(_priceLowerBound);
            var priceUpperBoundAngle = Math.atan(_priceUpperBound);
            if (constrainedAngularDiff < 0) {
                return Math.tan(Math.max(newPriceAngle, priceLowerBoundAngle));
            } else {
                return Math.tan(Math.min(newPriceAngle, priceUpperBoundAngle));
            }
        } else {
            return _price + 0.01 * sign(_excessDemand);
        }
    }

    tatonnement.allocation = function (marketMaker) {
        var allocation = {}
        
        var netBuyers = _subjects.filter(function(subject) {
            return subject.get("rp.selection")[0] > subject.get("rp.endowment").x;
        }).length;
        var netSellers = _subjects.filter(function(subject) {
            return subject.get("rp.selection")[0] < subject.get("rp.endowment").x;
        }).length;
        
        if (marketMaker) {
            allocation.x = _selection[0];
            allocation.y = _selection[1];
        } else {
            if (_selection[0] > _endowment.x) { // net buyer
                var halfExcessPerBuyer = _excessDemand / (2 * netBuyers);
                allocation.x = _selection[0] - halfExcessPerBuyer;
                allocation.y = _selection[1] + _price * halfExcessPerBuyer;
            } else if (_selection[0] < _endowment.x) { // net seller
                var halfExcessPerSeller = _excessDemand / (2 * netSellers);
                allocation.x = _selection[0] + halfExcessPerSeller;
                allocation.y = _selection[1] - _price * halfExcessPerSeller;
            } else { // chooses endowment
                allocation.x = _selection[0];
                allocation.y = _selection[1];
            }
        }
        return allocation;
    }

    // Accessors

    tatonnement.excessDemand = function () {
        return _excessDemand;
    };

    tatonnement.excessDemandPerCapita = function () {
        return _excessDemandPerCapita;
    }

    return tatonnement;
});
